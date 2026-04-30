'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

const INTERVAL_MS = 5000

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
          token: process.env.NEXT_PUBLIC_TRACKING_TOKEN || 'pcb-gps-2026',
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
      <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Vehículo: <strong style={{ color: '#60a5fa' }}>{vehiculoId}</strong>
      </p>
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
