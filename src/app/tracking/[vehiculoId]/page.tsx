'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

const INTERVAL_MS = 5000
const INC_INTERVAL_MS = 3000 // sondeo de incidencia asignada al vehículo (casi instantáneo)
const TRACK_TOKEN = process.env.NEXT_PUBLIC_TRACKING_TOKEN

type Incidencia = {
  id: string
  numero: string
  tipoIncidencia: string
  direccion: string
  descripcion: string | null
  latitud: number | null
  longitud: number | null
  horaLlamada: string | null
  horaSalida: string | null
  horaLlegada: string | null
  horaTerminado: string | null
  horaDisponible: string | null
}

const ISOCRONAS: Array<{ campo: keyof Incidencia; label: string }> = [
  { campo: 'horaSalida', label: 'SALIDA' },
  { campo: 'horaLlegada', label: 'LLEGADA' },
  { campo: 'horaTerminado', label: 'FINALIZADO' },
  { campo: 'horaDisponible', label: 'DISPONIBLE' },
]

export default function TrackingPage() {
  const params = useParams()
  const vehiculoId = params.vehiculoId as string
  const [estado, setEstado] = useState<'inactivo' | 'activo' | 'error'>('inactivo')
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number; vel: number | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [enviados, setEnviados] = useState(0)
  const watchRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPosRef = useRef<GeolocationPosition | null>(null)

  const [incidencia, setIncidencia] = useState<Incidencia | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)
  const [alerta, setAlerta] = useState(false)
  const incIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIncIdRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // El audio en iOS necesita desbloquearse con un gesto del usuario (el botón
  // INICIAR RASTREO). A partir de ahí los avisos suenan sin interacción.
  const desbloquearAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AC = (window.AudioContext || (window as any).webkitAudioContext)
        if (AC) audioCtxRef.current = new AC()
      }
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
    } catch { /* audio no disponible */ }
  }

  // Aviso al llegar una incidencia nueva: 3 pitidos ascendentes + vibración.
  const reproducirAlerta = () => {
    desbloquearAudio()
    const ctx = audioCtxRef.current
    if (ctx) {
      const pitido = (t0: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(t0); osc.stop(t0 + dur)
      }
      const now = ctx.currentTime
      pitido(now, 880, 0.18); pitido(now + 0.28, 1046, 0.18); pitido(now + 0.56, 1318, 0.3)
    }
    try { (navigator as any).vibrate?.([300, 150, 300, 150, 500]) } catch { /* iOS ignora vibrate */ }
    setAlerta(true)
    setTimeout(() => setAlerta(false), 6000)
  }

  const cargarIncidencia = async () => {
    try {
      const res = await fetch(`/api/tracking/incidencia?vehiculoId=${encodeURIComponent(vehiculoId)}&token=${encodeURIComponent(TRACK_TOKEN || '')}`)
      if (!res.ok) return
      const data = await res.json()
      const nueva: Incidencia | null = data.incidencia || null
      // Detectar incidencia NUEVA (id distinto al anterior) para lanzar el aviso.
      if (nueva?.id && nueva.id !== prevIncIdRef.current) {
        prevIncIdRef.current = nueva.id
        reproducirAlerta()
      } else if (!nueva) {
        prevIncIdRef.current = null
      }
      setIncidencia(nueva)
    } catch { /* red: se reintenta en el siguiente sondeo */ }
  }

  const marcarIsocrona = async (campo: string) => {
    if (!incidencia) return
    setMarcando(campo)
    try {
      const res = await fetch('/api/tracking/incidencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehiculoId, token: TRACK_TOKEN, incidenciaId: incidencia.id, campo }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.valor) setIncidencia(prev => (prev ? { ...prev, [campo]: data.valor } : prev))
      }
    } catch { /* se refleja en el siguiente sondeo */ }
    finally { setMarcando(null) }
  }

  // URL de navegación (Apple Maps): coordenadas si las hay, si no la dirección.
  const urlNavegacion = (inc: Incidencia) => {
    const destino = inc.latitud != null && inc.longitud != null
      ? `${inc.latitud},${inc.longitud}`
      : encodeURIComponent(inc.direccion || '')
    return `https://maps.apple.com/?daddr=${destino}&dirflg=d`
  }

  // Sondeo de incidencia asignada al vehículo (independiente del GPS).
  useEffect(() => {
    cargarIncidencia()
    incIntervalRef.current = setInterval(cargarIncidencia, INC_INTERVAL_MS)
    return () => { if (incIntervalRef.current) clearInterval(incIntervalRef.current) }
  }, [vehiculoId])

  const enviarUbicacion = async (pos: GeolocationPosition) => {
    const { latitude, longitude, speed, accuracy } = pos.coords
    try {
      const res = await fetch('/api/vehiculos/ubicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculoId,
          latitud: latitude,
          longitud: longitude,
          velocidad: speed !== null ? Math.round(speed * 3.6 * 10) / 10 : null,
          precision: accuracy,
          token: process.env.NEXT_PUBLIC_TRACKING_TOKEN,
        }),
      })
      if (res.ok) {
        setEnviados(n => n + 1)
        setLastPos({ lat: latitude, lng: longitude, vel: speed ? Math.round(speed * 3.6) : null })
      }
    } catch (e) {
      console.error('Error enviando ubicacion:', e)
    }
  }

  const iniciar = () => {
    desbloquearAudio() // gesto del usuario: habilita los avisos sonoros en iOS
    if (!navigator.geolocation) {
      setErrorMsg('Este dispositivo no soporta GPS')
      setEstado('error')
      return
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => { lastPosRef.current = pos },
      (err) => { setErrorMsg(`Error GPS: ${err.message}`); setEstado('error') },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
    intervalRef.current = setInterval(() => {
      if (lastPosRef.current) enviarUbicacion(lastPosRef.current)
    }, INTERVAL_MS)
    setEstado('activo')
  }

  const detener = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setEstado('inactivo')
  }

  useEffect(() => { return () => detener() }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: 'white',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'system-ui', padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚍</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Rastreo GPS</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Vehículo: <strong style={{ color: '#60a5fa' }}>{vehiculoId}</strong>
      </p>

      <style>{`
        @keyframes alertaPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(239,68,68,0.35); border-color: #ef4444; }
          50% { box-shadow: 0 0 40px rgba(239,68,68,0.95); border-color: #fca5a5; }
        }
      `}</style>

      {incidencia && (
        <div style={{
          width: '100%', maxWidth: '360px', marginBottom: '1.5rem',
          background: '#7f1d1d', border: '2px solid #ef4444', borderRadius: '16px',
          padding: '1rem', boxShadow: '0 0 24px rgba(239,68,68,0.35)',
          animation: alerta ? 'alertaPulse 0.6s ease-in-out infinite' : undefined,
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fecaca', letterSpacing: '0.05em' }}>
            ● INCIDENCIA ACTIVA · {incidencia.numero}
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, textTransform: 'uppercase', margin: '0.25rem 0' }}>
            {incidencia.tipoIncidencia}
          </div>
          <div style={{ fontSize: '1rem', color: '#fee2e2', marginBottom: '0.75rem', lineHeight: 1.3 }}>
            📍 {incidencia.direccion}
          </div>

          <a
            href={urlNavegacion(incidencia)}
            style={{
              display: 'block', textAlign: 'center', textDecoration: 'none',
              background: '#2563eb', color: 'white', fontWeight: 800, fontSize: '1.25rem',
              padding: '1rem', borderRadius: '12px', marginBottom: '0.75rem',
            }}
          >
            🧭 NAVEGAR
          </a>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ISOCRONAS.map(({ campo, label }) => {
              const valor = incidencia[campo] as string | null
              const marcada = !!valor
              return (
                <button
                  key={campo}
                  onClick={() => !marcada && marcarIsocrona(campo)}
                  disabled={marcada || marcando === campo}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.9rem 1.1rem', borderRadius: '12px', border: 'none',
                    cursor: marcada ? 'default' : 'pointer',
                    background: marcada ? '#166534' : '#334155',
                    color: 'white', fontSize: '1.15rem', fontWeight: 800,
                    opacity: marcando === campo ? 0.6 : 1,
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {marcada ? `✓ ${valor}` : (marcando === campo ? '…' : '›')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div style={{
        padding: '0.5rem 1.5rem', borderRadius: '9999px', marginBottom: '2rem',
        background: estado === 'activo' ? '#16a34a' : estado === 'error' ? '#dc2626' : '#374151',
        fontSize: '0.9rem', fontWeight: 600,
      }}>
        {estado === 'activo' ? '● Transmitiendo' : estado === 'error' ? '✕ Error' : '○ Inactivo'}
      </div>
      <button
        onClick={estado === 'activo' ? detener : iniciar}
        style={{
          padding: '1rem 3rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
          fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem',
          background: estado === 'activo' ? '#dc2626' : '#2563eb',
          color: 'white', width: '100%', maxWidth: '320px',
        }}
      >
        {estado === 'activo' ? 'DETENER' : 'INICIAR RASTREO'}
      </button>
      {lastPos && (
        <div style={{
          background: '#1e293b', borderRadius: '12px', padding: '1rem 1.5rem',
          width: '100%', maxWidth: '320px', fontSize: '0.85rem', lineHeight: '2',
        }}>
          <div>📍 {lastPos.lat.toFixed(6)}, {lastPos.lng.toFixed(6)}</div>
          {lastPos.vel !== null && <div>🏎️ {lastPos.vel} km/h</div>}
          <div style={{ color: '#64748b' }}>Envíos: {enviados}</div>
        </div>
      )}
      {errorMsg && <div style={{ color: '#f87171', marginTop: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
    </div>
  )
}
