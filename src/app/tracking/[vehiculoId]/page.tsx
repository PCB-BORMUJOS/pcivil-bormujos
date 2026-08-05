'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { BEEP_AVISO } from '@/lib/tracking-beep'

const INTERVAL_MS = 5000
const INC_INTERVAL_MS = 3000 // sondeo de incidencia (casi instantáneo)
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

const ISOCRONAS: Array<{ campo: keyof Incidencia; label: string; t: string }> = [
  { campo: 'horaSalida', label: 'SALIDA', t: 'T1' },
  { campo: 'horaLlegada', label: 'LLEGADA', t: 'T2' },
  { campo: 'horaTerminado', label: 'FINALIZADO', t: 'T3' },
  { campo: 'horaDisponible', label: 'DISPONIBLE', t: 'T4' },
]

const TIPO_META: Record<string, { label: string; icon: string; color: string }> = {
  incendio: { label: 'Incendio', icon: '🔥', color: '#ea580c' },
  sanitaria: { label: 'Sanitaria · SVB', icon: '🚑', color: '#dc2626' },
  accidente: { label: 'Accidente', icon: '⚠️', color: '#d97706' },
  inundacion: { label: 'Inundación', icon: '🌊', color: '#2563eb' },
  rescate: { label: 'Rescate', icon: '🧗', color: '#7c3aed' },
  apoyo: { label: 'Apoyo', icon: '🤝', color: '#0891b2' },
  prevencion: { label: 'Preventivo', icon: '🛡️', color: '#059669' },
  otros: { label: 'Otros', icon: '📌', color: '#475569' },
}

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
  const [audioListo, setAudioListo] = useState(false)
  const [sonando, setSonando] = useState(false)
  const incIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIncIdRef = useRef<string | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  // ─── GPS (sin cambios funcionales) ───
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
          token: TRACK_TOKEN,
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

  // ─── Audio: ALARMA EN BUCLE hasta que alguien toca el iPad ───
  // iOS exige un gesto previo para poder reproducir audio: se "arma" al pulsar
  // INICIAR (o el botón de activar sonido) al empezar el turno. A partir de ahí,
  // cuando llega una incidencia nueva la alarma suena en bucle hasta que se toca
  // la pantalla (o se inicia navegación / se marca una isócrona).
  const armarAudio = () => {
    const el = audioElRef.current
    if (!el) return
    try {
      el.muted = true
      const p = el.play()
      if (p && typeof p.then === 'function') {
        p.then(() => { el.pause(); el.currentTime = 0; el.muted = false; setAudioListo(true) })
         .catch(() => { el.muted = false })
      } else {
        el.pause(); el.currentTime = 0; el.muted = false; setAudioListo(true)
      }
    } catch { /* audio no disponible */ }
  }

  const iniciarAlarma = () => {
    setAlerta(true)
    try { (navigator as any).vibrate?.([500, 250, 500, 250, 500]) } catch { /* iOS ignora vibrate */ }
    const el = audioElRef.current
    if (el) {
      try { el.currentTime = 0; el.loop = true; el.muted = false; el.play().then(() => setSonando(true)).catch(() => {}) } catch { /* */ }
    }
  }

  const detenerAlarma = () => {
    setAlerta(false)
    setSonando(false)
    const el = audioElRef.current
    if (el) { try { el.pause(); el.currentTime = 0 } catch { /* */ } }
  }

  // ─── Incidencia ───
  const cargarIncidencia = async () => {
    try {
      const res = await fetch(`/api/tracking/incidencia?vehiculoId=${encodeURIComponent(vehiculoId)}&token=${encodeURIComponent(TRACK_TOKEN || '')}`)
      if (!res.ok) return
      const data = await res.json()
      const nueva: Incidencia | null = data.incidencia || null
      if (nueva?.id && nueva.id !== prevIncIdRef.current) {
        prevIncIdRef.current = nueva.id
        iniciarAlarma()
      } else if (!nueva) {
        prevIncIdRef.current = null
        detenerAlarma()
      }
      setIncidencia(nueva)
    } catch { /* se reintenta en el siguiente sondeo */ }
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

  const urlNavegacion = (inc: Incidencia) => {
    // Enlace universal de Google Maps: abre la app de Google Maps si está
    // instalada en el iPad; si no, la versión web.
    const destino = inc.latitud != null && inc.longitud != null
      ? `${inc.latitud},${inc.longitud}`
      : encodeURIComponent(inc.direccion || '')
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`
  }

  const iniciar = () => {
    armarAudio()
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

  useEffect(() => {
    cargarIncidencia()
    incIntervalRef.current = setInterval(cargarIncidencia, INC_INTERVAL_MS)
    return () => { if (incIntervalRef.current) clearInterval(incIntervalRef.current) }
  }, [vehiculoId])

  // Cualquier toque en la pantalla detiene la alarma sonora (la dotación ya se ha
  // percatado). También arma el audio en el primer toque, por si no se pulsó INICIAR.
  useEffect(() => {
    const alTocar = () => {
      if (!audioListo) armarAudio()
      detenerAlarma()
    }
    window.addEventListener('pointerdown', alTocar)
    return () => window.removeEventListener('pointerdown', alTocar)
  }, [audioListo])

  const meta = incidencia
    ? (TIPO_META[incidencia.tipoIncidencia] || { label: incidencia.tipoIncidencia, icon: '📌', color: '#475569' })
    : null

  return (
    <div style={{
      minHeight: '100dvh', background: 'radial-gradient(120% 120% at 50% 0%, #14213a 0%, #0a0f1e 60%)',
      color: '#e5e7eb', fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', padding: '14px', gap: '14px',
    }}>
      <audio ref={audioElRef} src={BEEP_AVISO} loop preload="auto" playsInline />

      <style>{`
        @keyframes alertaPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.0); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.25); }
        }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button { font-family: inherit; }
      `}</style>

      {/* Cabecera */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '10px', background: 'rgba(37,99,235,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🚐</div>
          <div>
            <div style={{ fontSize: 11, color: '#7c8aa5', letterSpacing: '0.08em', fontWeight: 600 }}>UNIDAD</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#93c5fd', lineHeight: 1 }}>{vehiculoId}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%',
            background: estado === 'activo' ? '#22c55e' : estado === 'error' ? '#ef4444' : '#64748b',
            animation: estado === 'activo' ? 'dotPulse 1.4s ease-in-out infinite' : undefined,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9fb0cc' }}>
            {estado === 'activo' ? 'GPS activo' : estado === 'error' ? 'GPS error' : 'GPS parado'}
          </span>
        </div>
      </div>

      {/* Panel de incidencia */}
      {incidencia && meta ? (
        <div style={{
          background: 'linear-gradient(180deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))',
          border: `1px solid ${alerta ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: '18px', overflow: 'hidden',
          animation: alerta ? 'alertaPulse 0.9s ease-in-out infinite' : undefined,
        }}>
          {/* Franja de tipo */}
          <div style={{
            background: meta.color, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 30, lineHeight: 1 }}>{meta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.85, color: '#fff' }}>
                INCIDENCIA · {incidencia.numero}
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.1, textTransform: 'uppercase' }}>
                {meta.label}
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 16px' }}>
            {/* Destino */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#7c8aa5', marginBottom: 4 }}>DESTINO</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e5e7eb', lineHeight: 1.35, marginBottom: 14 }}>
              {incidencia.direccion}
            </div>

            {/* Navegar */}
            <a
              href={urlNavegacion(incidencia)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                textDecoration: 'none', background: 'linear-gradient(180deg,#3b82f6,#2563eb)',
                color: '#fff', fontWeight: 800, fontSize: 18, padding: '15px',
                borderRadius: '14px', marginBottom: 16, boxShadow: '0 6px 16px rgba(37,99,235,0.4)',
              }}
            >
              <span style={{ fontSize: 20 }}>🧭</span> INICIAR NAVEGACIÓN
            </a>

            {/* Tiempos */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#7c8aa5', marginBottom: 8 }}>TIEMPOS DE INTERVENCIÓN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ISOCRONAS.map(({ campo, label, t }) => {
                const valor = incidencia[campo] as string | null
                const marcada = !!valor
                const cargando = marcando === campo
                return (
                  <button
                    key={campo}
                    onClick={() => !marcada && marcarIsocrona(campo)}
                    disabled={marcada || cargando}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 14px', borderRadius: '13px', width: '100%',
                      cursor: marcada ? 'default' : 'pointer',
                      border: marcada ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.10)',
                      background: marcada ? 'rgba(22,101,52,0.35)' : 'rgba(255,255,255,0.05)',
                      color: '#fff', opacity: cargando ? 0.6 : 1, textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                      background: marcada ? '#16a34a' : 'rgba(255,255,255,0.08)',
                      color: marcada ? '#fff' : '#9fb0cc',
                    }}>{marcada ? '✓' : t}</span>
                    <span style={{ flex: 1, fontSize: 16, fontWeight: 800, letterSpacing: '0.02em' }}>{label}</span>
                    <span style={{
                      fontSize: marcada ? 17 : 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: marcada ? '#86efac' : '#7c8aa5',
                    }}>
                      {marcada ? valor : (cargando ? '…' : 'MARCAR')}
                    </span>
                  </button>
                )
              })}
            </div>

            {sonando && (
              <button
                onClick={detenerAlarma}
                style={{
                  marginTop: 12, width: '100%', padding: '14px', borderRadius: '12px',
                  border: 'none', background: '#b45309', color: '#fff', fontSize: 15,
                  fontWeight: 800, cursor: 'pointer',
                }}
              >
                🔕 SILENCIAR ALARMA
              </button>
            )}
            {!audioListo && !sonando && (
              <button
                onClick={armarAudio}
                style={{
                  marginTop: 12, width: '100%', padding: '10px', borderRadius: '11px',
                  border: '1px dashed rgba(250,204,21,0.5)', background: 'rgba(250,204,21,0.08)',
                  color: '#fde047', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                🔔 Toca para activar el sonido de avisos
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Estado en espera */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '18px', padding: '32px 20px', textAlign: 'center', gap: 10,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>🛰️</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#cbd5e1' }}>En espera</div>
          <div style={{ fontSize: 13, color: '#7c8aa5', maxWidth: 220, lineHeight: 1.4 }}>
            Sin incidencias asignadas. Recibirás un aviso en cuanto CECOPAL active una.
          </div>
        </div>
      )}

      {/* Pie: control GPS */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ fontSize: 12, color: '#7c8aa5', lineHeight: 1.5 }}>
          {lastPos
            ? <>📍 {lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}<br /><span style={{ color: '#475569' }}>Envíos: {enviados}{lastPos.vel !== null ? ` · ${lastPos.vel} km/h` : ''}</span></>
            : <>Pulsa iniciar al comenzar el turno<br /><span style={{ color: '#475569' }}>(activa GPS y sonido)</span></>}
          {errorMsg && <div style={{ color: '#f87171', marginTop: 4 }}>{errorMsg}</div>}
        </div>
        <button
          onClick={estado === 'activo' ? detener : iniciar}
          style={{
            padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 800, flexShrink: 0,
            background: estado === 'activo' ? '#dc2626' : '#2563eb', color: '#fff',
          }}
        >
          {estado === 'activo' ? 'DETENER' : 'INICIAR'}
        </button>
      </div>
    </div>
  )
}
