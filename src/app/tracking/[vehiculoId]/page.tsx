'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

const INTERVAL_MS = 5000
const INC_INTERVAL_MS = 3000
const TRACK_TOKEN = process.env.NEXT_PUBLIC_TRACKING_TOKEN
const ALARMA_SRC = '/alarma-incidencia.wav'

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
  { campo: 'horaSalida', label: 'Salida', t: 'T1' },
  { campo: 'horaLlegada', label: 'Llegada', t: 'T2' },
  { campo: 'horaTerminado', label: 'Finalizado', t: 'T3' },
  { campo: 'horaDisponible', label: 'Disponible', t: 'T4' },
]

// Color de acento por tipología (tonos sobrios, sin iconos).
const TIPO_COLOR: Record<string, { label: string; color: string }> = {
  incendio: { label: 'Incendio', color: '#E8663A' },
  sanitaria: { label: 'Sanitaria · SVB', color: '#E5484D' },
  accidente: { label: 'Accidente de tráfico', color: '#E0A93B' },
  inundacion: { label: 'Inundación', color: '#3E7BFA' },
  rescate: { label: 'Rescate', color: '#8B6DEB' },
  apoyo: { label: 'Apoyo', color: '#2AA7B8' },
  prevencion: { label: 'Preventivo', color: '#2FA96A' },
  otros: { label: 'Otros', color: '#7C8AA5' },
}

// ─── Iconos SVG monocromos (sin emojis) ───
const IconNav = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 11L21 3L13 21L11 13L3 11Z" fill={c} /></svg>
)
const IconPin = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 19 15.6 19 10C19 6.13 15.87 3 12 3C8.13 3 5 6.13 5 10C5 15.6 12 22 12 22Z" stroke={c} strokeWidth="1.8" /><circle cx="12" cy="10" r="2.4" stroke={c} strokeWidth="1.8" /></svg>
)
const IconCheck = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.5L10 17.5L19 7" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const IconSignal = ({ s = 26, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.55a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0" stroke={c} strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="19" r="1.6" fill={c} /></svg>
)

export default function TrackingPage() {
  const params = useParams()
  const vehiculoId = params.vehiculoId as string
  const [estado, setEstado] = useState<'inactivo' | 'activo' | 'sin_senal' | 'error'>('inactivo')
  const [rastreando, setRastreando] = useState(false)
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number; vel: number | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [enviados, setEnviados] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const watchRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPosRef = useRef<GeolocationPosition | null>(null)
  // Robustez del tracking:
  const activoRef = useRef(false)                 // ¿tracking en marcha? (evita closures obsoletos)
  const lastFixAtRef = useRef(0)                   // ms del último fix GPS válido
  const lastEnqueueRef = useRef(0)                 // ms del último punto encolado (throttle 1/INTERVAL)
  const outboxRef = useRef<Array<{ lat: number; lng: number; vel: number | null; acc: number | null; tsGps: string }>>([]) // cola offline
  const flushingRef = useRef(false)                // evita envíos solapados
  const errCountRef = useRef(0)
  const wakeLockRef = useRef<any>(null)            // Screen Wake Lock (pantalla despierta)

  const [incidencia, setIncidencia] = useState<Incidencia | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)
  const [alerta, setAlerta] = useState(false)
  const [audioListo, setAudioListo] = useState(false)
  const [sonando, setSonando] = useState(false)
  const incIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIncIdRef = useRef<string | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  // ─── GPS ───
  type Punto = { lat: number; lng: number; vel: number | null; acc: number | null; tsGps: string }
  const puntoDe = (pos: GeolocationPosition): Punto => {
    const { latitude, longitude, speed, accuracy } = pos.coords
    return {
      lat: latitude, lng: longitude,
      vel: speed !== null && speed !== undefined ? Math.round(speed * 3.6 * 10) / 10 : null,
      acc: accuracy ?? null,
      tsGps: new Date(pos.timestamp || Date.now()).toISOString(),
    }
  }

  const postPunto = async (p: Punto) => {
    const res = await fetch('/api/vehiculos/ubicacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehiculoId, latitud: p.lat, longitud: p.lng,
        velocidad: p.vel, precision: p.acc, timestampGps: p.tsGps, token: TRACK_TOKEN,
      }),
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
  }

  // Vacía la cola en orden. Si falla la red, los puntos se CONSERVAN y se
  // reintentan en el siguiente ciclo (no se pierde el recorrido en zonas sin cobertura).
  const flushOutbox = async () => {
    if (flushingRef.current || outboxRef.current.length === 0) return
    flushingRef.current = true
    const lote = outboxRef.current
    outboxRef.current = []
    const fallidos: Punto[] = []
    for (const p of lote) {
      try { await postPunto(p) } catch { fallidos.push(p) }
    }
    if (fallidos.length) {
      // conservar como máx. los últimos ~500 puntos (~40 min a 1/5s) para no crecer sin fin
      outboxRef.current = [...fallidos, ...outboxRef.current].slice(-500)
    } else {
      setEnviados(n => n + lote.length)
      const u = lote[lote.length - 1]
      setLastPos({ lat: u.lat, lng: u.lng, vel: u.vel !== null ? Math.round(u.vel) : null })
    }
    setPendientes(outboxRef.current.length)
    flushingRef.current = false
  }

  // ─── Wake Lock: evita que la pantalla se atenúe/bloquee (y con ella se
  // suspendan los temporizadores y el GPS). Se re-solicita al volver a primer plano.
  const pedirWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch { /* algunos navegadores lo deniegan; no es crítico */ }
  }
  const liberarWakeLock = () => {
    try { wakeLockRef.current?.release?.() } catch { /* */ }
    wakeLockRef.current = null
  }

  // ─── Audio: alarma en bucle hasta que se toca el iPad ───
  // iOS exige un gesto para desbloquear el audio: se "arma" con INICIAR o con el
  // primer toque en la pantalla (se reproduce un instante y se pausa).
  const armarAudio = () => {
    const el = audioElRef.current
    if (!el || audioListo) { if (el) el.pause(), (el.currentTime = 0); return }
    try {
      el.loop = true
      const p = el.play()
      if (p && typeof p.then === 'function') {
        p.then(() => { el.pause(); el.currentTime = 0; setAudioListo(true) }).catch(() => {})
      } else { el.pause(); el.currentTime = 0; setAudioListo(true) }
    } catch { /* audio no disponible */ }
  }

  const iniciarAlarma = () => {
    setAlerta(true)
    try { (navigator as any).vibrate?.([600, 300, 600, 300, 600]) } catch { /* iOS ignora vibrate */ }
    const el = audioElRef.current
    if (el) {
      try { el.currentTime = 0; el.loop = true; el.play().then(() => setSonando(true)).catch(() => {}) } catch { /* */ }
    }
  }

  const detenerAlarma = () => {
    setAlerta(false); setSonando(false)
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
    detenerAlarma()
    setMarcando(campo)
    try {
      const res = await fetch('/api/tracking/incidencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    const destino = inc.latitud != null && inc.longitud != null
      ? `${inc.latitud},${inc.longitud}`
      : encodeURIComponent(inc.direccion || '')
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`
  }

  // Arranca (o reinicia) el watch de geolocalización. Se llama también tras un
  // error o al volver a primer plano, para recuperar el flujo sin intervención.
  const startWatch = () => {
    if (!navigator.geolocation) return
    if (watchRef.current !== null) { try { navigator.geolocation.clearWatch(watchRef.current) } catch { /* */ } }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = pos
        lastFixAtRef.current = Date.now()
        errCountRef.current = 0
        setEstado('activo'); setErrorMsg('')
        // Encolar como mucho 1 punto por intervalo (throttle), con la hora REAL del GPS.
        const now = Date.now()
        if (now - lastEnqueueRef.current >= INTERVAL_MS) {
          lastEnqueueRef.current = now
          outboxRef.current.push(puntoDe(pos))
          if (outboxRef.current.length > 500) outboxRef.current = outboxRef.current.slice(-500)
          setPendientes(outboxRef.current.length)
        }
      },
      (err) => {
        setErrorMsg(`GPS: ${err.message}`)
        if (err.code === err.PERMISSION_DENIED) { setEstado('error'); return } // permiso revocado: no reintentar
        // Señal perdida / timeout: NO congelar. Reiniciar el watch para recuperar.
        errCountRef.current++
        if (errCountRef.current >= 2) setEstado('sin_senal')
        setTimeout(() => { if (activoRef.current) startWatch() }, 2000)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
  }

  const iniciar = async () => {
    armarAudio()
    if (!navigator.geolocation) { setErrorMsg('Este dispositivo no soporta GPS'); setEstado('error'); return }
    activoRef.current = true
    setRastreando(true)
    errCountRef.current = 0
    lastFixAtRef.current = Date.now()
    await pedirWakeLock()
    startWatch()
    // Ciclo cada INTERVAL: envía la cola (con reintento) y vigila la señal.
    intervalRef.current = setInterval(() => {
      flushOutbox()
      if (activoRef.current && Date.now() - lastFixAtRef.current > 25000) setEstado('sin_senal')
    }, INTERVAL_MS)
    setEstado('activo')
  }

  const detener = () => {
    activoRef.current = false
    setRastreando(false)
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    liberarWakeLock()
    setEstado('inactivo')
  }

  useEffect(() => { return () => detener() }, [])

  // Al volver a primer plano (p. ej. tras usar Google Maps para navegar), el
  // navegador pudo suspender el GPS y soltar el Wake Lock: se re-piden.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && activoRef.current) {
        pedirWakeLock()
        startWatch()
        flushOutbox()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    cargarIncidencia()
    incIntervalRef.current = setInterval(cargarIncidencia, INC_INTERVAL_MS)
    return () => { if (incIntervalRef.current) clearInterval(incIntervalRef.current) }
  }, [vehiculoId])

  // Cualquier toque arma el audio (si no lo estaba) y detiene la alarma.
  useEffect(() => {
    const alTocar = () => { if (!audioListo) armarAudio(); detenerAlarma() }
    window.addEventListener('pointerdown', alTocar)
    return () => window.removeEventListener('pointerdown', alTocar)
  }, [audioListo])

  const tipo = incidencia
    ? (TIPO_COLOR[incidencia.tipoIncidencia] || { label: incidencia.tipoIncidencia, color: '#7C8AA5' })
    : null

  const C = {
    bg: 'radial-gradient(130% 100% at 50% 0%, #16213b 0%, #0a0e19 62%)',
    panel: '#111a2c', panelBorder: 'rgba(255,255,255,0.07)',
    text: '#E8EDF4', muted: '#8A97AD', faint: '#5a6b86',
    blue: '#2F6BFF', green: '#2FA96A', red: '#E5484D', amber: '#E0A93B',
  }

  const gps = estado === 'activo'
    ? { color: C.green, texto: 'GPS en línea' }
    : estado === 'sin_senal' ? { color: C.amber, texto: 'GPS sin señal' }
    : estado === 'error' ? { color: C.red, texto: 'GPS error' }
    : { color: C.faint, texto: 'GPS parado' }

  return (
    <div style={{
      minHeight: '100dvh', background: C.bg, color: C.text,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column', padding: 14, gap: 12,
    }}>
      <audio ref={audioElRef} src={ALARMA_SRC} loop preload="auto" />
      <style>{`
        @keyframes edgePulse { 0%,100%{ box-shadow:0 0 0 0 rgba(229,72,77,0) } 50%{ box-shadow:0 0 0 5px rgba(229,72,77,0.35) } }
        @keyframes dot { 0%,100%{opacity:1} 50%{opacity:.35} }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        button { font-family:inherit; }
      `}</style>

      {/* Cabecera */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '11px 15px',
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.faint, fontWeight: 700 }}>UNIDAD</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.05 }}>{vehiculoId}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: gps.color,
            animation: estado === 'activo' ? 'dot 1.5s ease-in-out infinite' : undefined,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: C.muted, textTransform: 'uppercase' }}>
            {gps.texto}
          </span>
        </div>
      </header>

      {/* Incidencia */}
      {incidencia && tipo ? (
        <section style={{
          background: C.panel, border: `1px solid ${alerta ? C.red : C.panelBorder}`,
          borderRadius: 16, overflow: 'hidden',
          animation: alerta ? 'edgePulse 1s ease-in-out infinite' : undefined,
        }}>
          {/* Franja de tipo */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: 6, background: tipo.color }} />
            <div style={{ flex: 1, padding: '13px 16px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.muted, fontWeight: 700 }}>
                INCIDENCIA ACTIVA · {incidencia.numero}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.01em', marginTop: 2 }}>{tipo.label}</div>
            </div>
          </div>

          <div style={{ height: 1, background: C.panelBorder }} />

          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.faint, fontWeight: 700, marginBottom: 6 }}>DESTINO</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ color: C.muted, marginTop: 2, flexShrink: 0 }}><IconPin /></span>
              <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>{incidencia.direccion}</span>
            </div>

            <a href={urlNavegacion(incidencia)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              textDecoration: 'none', background: C.blue, color: '#fff', fontWeight: 800,
              fontSize: 17, letterSpacing: '0.02em', padding: 16, borderRadius: 12, marginBottom: 18,
            }}>
              <IconNav /> INICIAR NAVEGACIÓN
            </a>

            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: C.faint, fontWeight: 700, marginBottom: 9 }}>TIEMPOS DE INTERVENCIÓN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ISOCRONAS.map(({ campo, label, t }) => {
                const valor = incidencia[campo] as string | null
                const marcada = !!valor
                const cargando = marcando === campo
                return (
                  <button key={campo} onClick={() => !marcada && marcarIsocrona(campo)} disabled={marcada || cargando}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, width: '100%',
                      cursor: marcada ? 'default' : 'pointer', textAlign: 'left',
                      border: `1px solid ${marcada ? 'rgba(47,169,106,0.45)' : C.panelBorder}`,
                      background: marcada ? 'rgba(47,169,106,0.14)' : 'rgba(255,255,255,0.035)',
                      color: C.text, opacity: cargando ? 0.55 : 1,
                    }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                      background: marcada ? C.green : 'rgba(255,255,255,0.06)', color: marcada ? '#fff' : C.muted,
                    }}>{marcada ? <IconCheck c="#fff" /> : t}</span>
                    <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{label}</span>
                    <span style={{
                      fontSize: marcada ? 17 : 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      letterSpacing: marcada ? 0 : '0.08em',
                      color: marcada ? '#7BD3A0' : C.faint,
                    }}>{marcada ? valor : (cargando ? '···' : 'MARCAR')}</span>
                  </button>
                )
              })}
            </div>

            {sonando ? (
              <button onClick={detenerAlarma} style={{
                marginTop: 14, width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: C.red, color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer',
              }}>SILENCIAR ALARMA</button>
            ) : !audioListo ? (
              <button onClick={armarAudio} style={{
                marginTop: 14, width: '100%', padding: 12, borderRadius: 11,
                border: `1px solid ${C.panelBorder}`, background: 'rgba(255,255,255,0.03)',
                color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
              }}>ACTIVAR SONIDO DE AVISOS</button>
            ) : null}
          </div>
        </section>
      ) : (
        <section style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 16, padding: '36px 22px', textAlign: 'center', gap: 12,
        }}>
          <span style={{ color: C.green }}><IconSignal s={30} /></span>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.02em' }}>EN ESPERA</div>
          <div style={{ fontSize: 13, color: C.muted, maxWidth: 230, lineHeight: 1.45 }}>
            Sin incidencias asignadas. Recibirás aviso en cuanto CECOPAL active una.
          </div>
        </section>
      )}

      {/* Pie: control GPS */}
      <footer style={{
        background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '11px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, minWidth: 0 }}>
          {lastPos
            ? <>{lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}<br /><span style={{ color: C.faint }}>Envíos: {enviados}{lastPos.vel !== null ? ` · ${lastPos.vel} km/h` : ''}{pendientes > 0 ? ` · ${pendientes} en cola` : ''}</span></>
            : <>Pulsa iniciar al comenzar el turno<br /><span style={{ color: C.faint }}>Activa el GPS y el sonido</span></>}
          {pendientes > 0 && <div style={{ color: C.amber, marginTop: 4 }}>Sin conexión: {pendientes} punto(s) guardados, se enviarán al recuperar señal.</div>}
          {errorMsg && <div style={{ color: estado === 'error' ? C.red : C.amber, marginTop: 4 }}>{errorMsg}</div>}
        </div>
        <button onClick={rastreando ? detener : iniciar} style={{
          padding: '12px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0,
          background: rastreando ? C.red : C.blue, color: '#fff',
        }}>{rastreando ? 'DETENER' : 'INICIAR'}</button>
      </footer>
    </div>
  )
}
