'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw, Save,
  Shield, Car, Minus, Plus, Clock, AlertTriangle, CheckCircle2, Info
} from 'lucide-react'

interface UsuarioDisponible {
  id: string
  nombre: string
  apellidos: string
  numeroVoluntario: string | null
  responsableTurno: boolean
  carnetConducir: boolean
  experiencia: string
  nivelCompromiso: string
  esOperativo: boolean
  turnosDeseados: number
  puedeDobleturno: boolean
}

interface GuardiaExistente {
  id: string
  fecha: string
  turno: string
  usuarioId: string
  rol: string | null
  usuario: {
    id: string
    nombre: string
    apellidos: string
    numeroVoluntario: string | null
    responsableTurno: boolean
    carnetConducir: boolean
    esOperativo: boolean
  }
}

const getNextMonday = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7))
  return d
}

const getWeekDays = (start: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

const toDateStr = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const slotKey = (fecha: string, turno: string) => `${fecha}__${turno}`

const parseSlotKey = (sk: string): { fecha: string; turno: string } => {
  const [fecha, turno] = sk.split('__')
  return { fecha, turno }
}

const formatRange = (start: Date): string => {
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${fmt(start)} — ${fmt(end)}`
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIA_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

const TURNOS = [
  { key: 'mañana' as const, label: 'Mañana', horas: '09:00 – 14:30' },
  { key: 'tarde' as const, label: 'Tarde', horas: '17:00 – 22:00' },
]

export default function CuadrantesPage() {
  const [semanaStart, setSemanaStart] = useState<Date>(() => getNextMonday(new Date()))
  const [disponibilidades, setDisponibilidades] = useState<Record<string, UsuarioDisponible[]>>({})
  const [asignaciones, setAsignaciones] = useState<Record<string, string[]>>({})
  const [capacidad, setCapacidad] = useState<Record<string, number>>({})
  const [guardiasGuardadas, setGuardiasGuardadas] = useState<GuardiaExistente[]>([])
  const [sugerencias, setSugerencias] = useState<Record<string, string[]>>({})
  const [rolEspecial, setRolEspecial] = useState<Record<string, { responsable?: string; cecopal?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [pendiente, setPendiente] = useState(false)

  const calcularSugerencias = (
    dispMap: Record<string, UsuarioDisponible[]>,
    asigMap: Record<string, string[]>
  ): Record<string, string[]> => {
    const conteo: Record<string, number> = {}
    Object.values(asigMap).flat().forEach(uid => {
      conteo[uid] = (conteo[uid] || 0) + 1
    })
    const expScore = (e: string) => e === 'ALTA' ? 3 : e === 'MEDIA' ? 2 : 1
    const sugMap: Record<string, string[]> = {}
    Object.entries(dispMap).forEach(([sk, disponibles]) => {
      const elegibles = disponibles.filter(u =>
        u.esOperativo && (conteo[u.id] || 0) < u.turnosDeseados
      )
      const sorted = [...elegibles].sort((a, b) => {
        if (a.responsableTurno && !b.responsableTurno) return -1
        if (!a.responsableTurno && b.responsableTurno) return 1
        if (a.carnetConducir && !b.carnetConducir) return -1
        if (!a.carnetConducir && b.carnetConducir) return 1
        return expScore(b.experiencia) - expScore(a.experiencia)
      })
      const sugeridos: string[] = []
      let hasResp = false
      let conductores = 0
      let apoyo = 0
      for (const u of sorted) {
        if (sugeridos.includes(u.id)) continue
        if (!hasResp && u.responsableTurno) { sugeridos.push(u.id); hasResp = true; continue }
        if (conductores < 2 && u.carnetConducir) { sugeridos.push(u.id); conductores++; continue }
        if (apoyo < 2) { sugeridos.push(u.id); apoyo++; continue }
        if (sugeridos.length >= 5) break
      }
      sugMap[sk] = sugeridos
    })
    return sugMap
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const semanaStr = toDateStr(semanaStart)
      const res = await fetch(`/api/cuadrantes?semana=${semanaStr}&incluirDisponibilidades=true`)
      const data = await res.json()
      const guardias: GuardiaExistente[] = data.guardias || []
      setGuardiasGuardadas(guardias)
      const weekDays = getWeekDays(semanaStart)
      const dispMap: Record<string, UsuarioDisponible[]> = {}
      ;(data.disponibilidades || []).forEach((disp: any) => {
        const detalles: Record<string, string[]> =
          typeof disp.detalles === 'string' ? JSON.parse(disp.detalles) : (disp.detalles || {})
        weekDays.forEach((day, idx) => {
          const dateStr = toDateStr(day)
          const diaNombre = DIAS[idx]
          const turnosDia: string[] = detalles[diaNombre] || []
          TURNOS.forEach(({ key }) => {
            const variantes = key === 'mañana' ? ['mañana', 'Mañana'] : ['tarde', 'Tarde']
            if (turnosDia.some(t => variantes.includes(t))) {
              const sk = slotKey(dateStr, key)
              if (!dispMap[sk]) dispMap[sk] = []
              if (!dispMap[sk].find(u => u.id === disp.usuario.id)) {
                dispMap[sk].push({
                  id: disp.usuario.id,
                  nombre: disp.usuario.nombre,
                  apellidos: disp.usuario.apellidos,
                  numeroVoluntario: disp.usuario.numeroVoluntario,
                  responsableTurno: disp.usuario.responsableTurno,
                  carnetConducir: disp.usuario.carnetConducir,
                  experiencia: disp.usuario.experiencia,
                  nivelCompromiso: disp.usuario.nivelCompromiso,
                  esOperativo: disp.usuario.esOperativo,
                  turnosDeseados: disp.turnosDeseados,
                  puedeDobleturno: disp.puedeDobleturno,
                })
              }
            }
          })
        })
      })
      setDisponibilidades(dispMap)
      const asigMap: Record<string, string[]> = {}
      guardias.forEach(g => {
        const fechaStr = g.fecha.split('T')[0]
        const sk = slotKey(fechaStr, g.turno)
        if (!asigMap[sk]) asigMap[sk] = []
        if (!asigMap[sk].includes(g.usuarioId)) asigMap[sk].push(g.usuarioId)
      })
      setAsignaciones(asigMap)
      // Reconstruir roles especiales desde guardias guardadas
      const rolesMap: Record<string, { responsable?: string; cecopal?: string }> = {}
      guardias.forEach(g => {
        const fechaStr = g.fecha.split('T')[0]
        const sk = slotKey(fechaStr, g.turno)
        if (!rolesMap[sk]) rolesMap[sk] = {}
        if (g.rol === 'Responsable') rolesMap[sk].responsable = g.usuarioId
        if (g.rol === 'Cecopal') rolesMap[sk].cecopal = g.usuarioId
      })
      setRolEspecial(rolesMap)
      const capMap: Record<string, number> = {}
      weekDays.forEach(day => {
        const dateStr = toDateStr(day)
        TURNOS.forEach(({ key }) => { capMap[slotKey(dateStr, key)] = 4 })
      })
      setCapacidad(capMap)
      const sugMap = calcularSugerencias(dispMap, asigMap)
      setSugerencias(sugMap)
      setPendiente(false)
    } catch (e) {
      console.error('Error cargando cuadrante:', e)
    } finally {
      setLoading(false)
    }
  }, [semanaStart])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const toggleAsignacion = (sk: string, userId: string) => {
    setAsignaciones(prev => {
      const actual = prev[sk] || []
      const nuevo = actual.includes(userId)
        ? actual.filter(id => id !== userId)
        : [...actual, userId]
      return { ...prev, [sk]: nuevo }
    })
    setPendiente(true)
  }

  const turnosAsignadosUsuario = (userId: string): number =>
    Object.values(asignaciones).flat().filter(id => id === userId).length

  const handlePublicar = async () => {
    const totalAsig = Object.values(asignaciones).flat().length
    if (!confirm(`¿Publicar el cuadrante?\nSe guardarán ${totalAsig} asignaciones y se reemplazarán las anteriores.`)) return
    setGuardando(true)
    try {
      await Promise.all(
        guardiasGuardadas.map(g =>
          fetch(`/api/cuadrantes?id=${g.id}`, { method: 'DELETE' })
        )
      )
      const cuerpos: any[] = []
      Object.entries(asignaciones).forEach(([sk, userIds]) => {
        const { fecha, turno } = parseSlotKey(sk)
        userIds.forEach(uid => {
          const u =
            disponibilidades[sk]?.find(d => d.id === uid) ||
            guardiasGuardadas.find(g => g.usuarioId === uid)?.usuario
          const resSk = rolEspecial[sk] || {}
          const rolFinal = resSk.responsable === uid
            ? 'Responsable'
            : resSk.cecopal === uid
            ? 'Cecopal'
            : (u as any)?.carnetConducir
            ? 'Conductor'
            : 'Interviniente'
          cuerpos.push({ fecha, turno, usuarioId: uid, tipo: 'programada', rol: rolFinal })
        })
      })
      const resultados = await Promise.all(
        cuerpos.map(body =>
          fetch('/api/cuadrantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        )
      )
      const fallidas = resultados.filter(r => !r.ok).length
      if (fallidas > 0) {
        alert(`⚠ Cuadrante publicado con ${fallidas} error(es). Recarga para verificar.`)
      }
      // Notificar siempre, independientemente de errores parciales
      const asigParaNotif = cuerpos.map(b => ({ usuarioId: b.usuarioId, fecha: b.fecha, turno: b.turno }))
      await fetch('/api/cuadrantes/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones: asigParaNotif, semanaLabel: formatRange(semanaStart) })
      })
      if (cuerpos.length > 0) alert('Cuadrante publicado correctamente')
      await cargarDatos()
    } catch (e) {
      console.error(e)
      alert('Error al publicar el cuadrante')
    } finally {
      setGuardando(false)
    }
  }

  const weekDays = getWeekDays(semanaStart)
  const slotsCubiertos = Object.entries(asignaciones).filter(([sk, uids]) => {
    const cap = capacidad[sk] || 4
    const operativos = uids.filter(uid => {
      const u = disponibilidades[sk]?.find(d => d.id === uid) ||
        guardiasGuardadas.find(g => g.usuarioId === uid)?.usuario
      return (u as any)?.esOperativo !== false
    })
    return operativos.length >= cap
  }).length
  const totalSlots = Object.keys(capacidad).length
  const personasUnicas = new Set(Object.values(asignaciones).flat()).size
  const totalAsignaciones = Object.values(asignaciones).flat().length

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-orange-600" size={26} />
            Planificador de Turnos
          </h1>
          <p className="text-slate-500 text-sm">Asignación manual semanal · haz clic en una persona para asignarla o quitarla</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-sm">
            <button
              onClick={() => { const d = new Date(semanaStart); d.setDate(d.getDate() - 7); setSemanaStart(d) }}
              className="p-2 hover:bg-slate-100 rounded-l-lg"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="text-sm font-medium px-3 whitespace-nowrap text-slate-700 min-w-[195px] text-center">
              {formatRange(semanaStart)}
            </span>
            <button
              onClick={() => { const d = new Date(semanaStart); d.setDate(d.getDate() + 7); setSemanaStart(d) }}
              className="p-2 hover:bg-slate-100 rounded-r-lg"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <button
            onClick={handlePublicar}
            disabled={guardando || !pendiente}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${
              pendiente
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            } disabled:opacity-60`}
          >
            <Save size={15} />
            {guardando ? 'Guardando…' : 'Publicar Cuadrante'}
          </button>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-500' : 'text-slate-500'} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 px-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Asignado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 inline-block" /> Sugerido</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" /> Disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" /> Sin turnos restantes</span>
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1"><Shield size={10} className="text-indigo-500" /> Responsable</span>
        <span className="flex items-center gap-1"><Car size={10} className="text-blue-500" /> Conductor</span>
        <span className="flex items-center gap-1"><span className="font-mono text-[10px] text-slate-400">[N↓]</span> Turnos restantes</span>
        <span className="flex items-center gap-1"><span className="text-[9px] bg-slate-200 text-slate-500 px-1 rounded font-bold">ADM</span> Solo admin</span>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <RefreshCw className="animate-spin mx-auto mb-3 text-orange-500" size={30} />
          <p className="text-slate-500">Cargando disponibilidades…</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 min-w-[900px]">
            {weekDays.map((day, idx) => (
              <div key={idx} className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${idx >= 5 ? 'bg-slate-100' : ''}`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{DIA_LABELS[idx]}</div>
                <div className="text-xl font-bold text-slate-800 leading-tight">{day.getDate()}</div>
                <div className="text-[10px] text-slate-400 capitalize">{day.toLocaleDateString('es-ES', { month: 'short' })}</div>
              </div>
            ))}
          </div>
          {TURNOS.map((turno, turnoIdx) => (
            <div key={turno.key} className={`grid grid-cols-7 min-w-[900px] ${turnoIdx === 0 ? 'border-b-2 border-slate-200' : ''}`}>
              {weekDays.map((day, dayIdx) => {
                const dateStr = toDateStr(day)
                const sk = slotKey(dateStr, turno.key)
                const disponibles = disponibilidades[sk] || []
                const asignados = asignaciones[sk] || []
                const sugeridosSk = sugerencias[sk] || []
                const cap = capacidad[sk] || 4
                const asignadosOp = asignados.filter(uid => {
                  const u = disponibles.find(d => d.id === uid) ||
                    guardiasGuardadas.find(g => g.usuarioId === uid)?.usuario
                  return (u as any)?.esOperativo !== false
                })
                const slotOk = asignadosOp.length >= cap
                const slotParcial = asignadosOp.length > 0 && asignadosOp.length < cap
                const asignadosExternos = asignados.filter(uid => !disponibles.find(d => d.id === uid))
                return (
                  <div key={dayIdx} className={`border-r border-slate-100 last:border-r-0 p-2 ${dayIdx >= 5 ? 'bg-slate-50/60' : ''} ${turno.key === 'tarde' ? 'bg-slate-50/30' : ''}`}>
                    <div className={`flex items-center justify-between mb-1.5 pb-1 border-b ${turno.key === 'mañana' ? 'border-amber-100' : 'border-indigo-100'}`}>
                      <div className="flex items-center gap-1">
                        <Clock size={9} className={turno.key === 'mañana' ? 'text-amber-500' : 'text-indigo-500'} />
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${turno.key === 'mañana' ? 'text-amber-600' : 'text-indigo-600'}`}>{turno.label}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${slotOk ? 'bg-green-100 text-green-700' : slotParcial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                          {asignadosOp.length}/{cap}
                        </span>
                        <button onClick={() => setCapacidad(p => ({ ...p, [sk]: Math.max(1, (p[sk] || 4) - 1) }))} className="w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded text-slate-400"><Minus size={7} /></button>
                        <button onClick={() => setCapacidad(p => ({ ...p, [sk]: (p[sk] || 4) + 1 }))} className="w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded text-slate-400"><Plus size={7} /></button>
                      </div>
                    </div>
                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {disponibles.length === 0 && asignadosExternos.length === 0 ? (
                        <div className="text-[9px] text-slate-300 text-center py-3">Sin disponibilidad</div>
                      ) : (
                        <>
                          {disponibles.map(u => {
                            const isAsig = asignados.includes(u.id)
                            const isSug = sugeridosSk.includes(u.id) && !isAsig
                            const asigCount = turnosAsignadosUsuario(u.id)
                            const restantes = Math.max(0, u.turnosDeseados - asigCount)
                            const agotado = restantes === 0 && !isAsig
                            return (
                              <div
                                key={u.id}
                                onClick={() => !agotado && toggleAsignacion(sk, u.id)}
                                title={`${u.nombre} ${u.apellidos} · Quiere ${u.turnosDeseados} turnos · ${restantes} restantes`}
                                className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] transition-all select-none ${
                                  isAsig
                                    ? 'bg-green-100 border border-green-300 text-green-900 cursor-pointer'
                                    : isSug
                                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 cursor-pointer hover:bg-indigo-100'
                                    : agotado
                                    ? 'bg-red-50 border border-red-100 text-red-300 cursor-not-allowed opacity-50'
                                    : 'bg-white border border-slate-200 text-slate-700 cursor-pointer hover:bg-slate-50'
                                }`}
                              >
                                <span className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${isAsig ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`} style={{ fontSize: '7px' }}>
                                  {isAsig && '✓'}
                                </span>
                                <span className="font-bold truncate flex-1">{u.numeroVoluntario || `${u.nombre.slice(0, 3)}.`}</span>
                                <span className="flex items-center gap-0.5 flex-shrink-0">
                                  {u.responsableTurno && <Shield size={8} className={isAsig ? 'text-green-700' : 'text-indigo-500'} />}
                                  {u.carnetConducir && <Car size={8} className={isAsig ? 'text-green-700' : 'text-blue-500'} />}
                                  {!u.esOperativo && <span className="text-[7px] font-bold text-slate-400 bg-slate-100 px-0.5 rounded">ADM</span>}
                                </span>
                                <span className={`text-[8px] font-mono flex-shrink-0 ${isAsig ? 'text-green-600' : restantes === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                  [{restantes}↓]
                                {isAsig && (
                                  <span className="flex gap-0.5 ml-0.5" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => setRolEspecial(prev => {
                                        const actual = prev[sk] || {}
                                        const nuevo = actual.responsable === u.id ? undefined : u.id
                                        return { ...prev, [sk]: { ...actual, responsable: nuevo } }
                                      })}
                                      title="Responsable de turno"
                                      className={(rolEspecial[sk]?.responsable === u.id) ? 'text-[7px] font-bold px-0.5 rounded bg-indigo-500 text-white' : 'text-[7px] font-bold px-0.5 rounded bg-slate-100 text-slate-400 hover:bg-indigo-100'}
                                    >R</button>
                                    <button
                                      onClick={() => setRolEspecial(prev => {
                                        const actual = prev[sk] || {}
                                        const nuevo = actual.cecopal === u.id ? undefined : u.id
                                        return { ...prev, [sk]: { ...actual, cecopal: nuevo } }
                                      })}
                                      title="Responsable CECOPAL"
                                      className={(rolEspecial[sk]?.cecopal === u.id) ? 'text-[7px] font-bold px-0.5 rounded bg-orange-500 text-white' : 'text-[7px] font-bold px-0.5 rounded bg-slate-100 text-slate-400 hover:bg-orange-100'}
                                    >C</button>
                                  </span>
                                )}
                                </span>
                              </div>
                            )
                          })}
                          {asignadosExternos.map(uid => {
                            const g = guardiasGuardadas.find(gr => gr.usuarioId === uid)
                            if (!g) return null
                            return (
                              <div key={uid} onClick={() => toggleAsignacion(sk, uid)} className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] bg-green-100 border border-green-300 text-green-900 cursor-pointer">
                                <span className="w-3 h-3 rounded border bg-green-500 border-green-500 text-white flex items-center justify-center flex-shrink-0" style={{ fontSize: '7px' }}>✓</span>
                                <span className="font-bold truncate flex-1">{g.usuario.numeroVoluntario || g.usuario.nombre}</span>
                                {g.usuario.responsableTurno && <Shield size={8} className="text-green-700" />}
                                {g.usuario.carnetConducir && <Car size={8} className="text-green-700" />}
                                {!g.usuario.esOperativo && <span className="text-[7px] font-bold text-slate-400">ADM</span>}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                    {slotParcial && (
                      <div className="mt-1 flex items-center gap-0.5 text-[8px] text-amber-600">
                        <AlertTriangle size={8} /><span>Faltan {cap - asignadosOp.length}</span>
                      </div>
                    )}
                    {slotOk && asignados.length > 0 && (
                      <div className="mt-1 flex items-center gap-0.5 text-[8px] text-green-600">
                        <CheckCircle2 size={8} /><span>Cubierto</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Slots cubiertos</div>
            <div className="text-2xl font-bold text-green-600">{slotsCubiertos}<span className="text-base font-normal text-slate-400">/{totalSlots}</span></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Personas con turno</div>
            <div className="text-2xl font-bold text-slate-700">{personasUnicas}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Total asignaciones</div>
            <div className="text-2xl font-bold text-orange-600">{totalAsignaciones}</div>
          </div>
          <div className={`rounded-lg border p-3 shadow-sm ${pendiente ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="text-xs text-slate-400 mb-1">Estado</div>
            <div className={`text-sm font-bold ${pendiente ? 'text-amber-600' : 'text-green-600'}`}>
              {pendiente ? '⚠ Cambios sin publicar' : '✓ Publicado'}
            </div>
            {pendiente && (
              <button onClick={handlePublicar} disabled={guardando} className="mt-2 w-full bg-green-600 text-white py-1 rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                {guardando ? 'Guardando…' : 'Publicar ahora'}
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2 text-xs text-blue-700">
          <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
          <span>
            <strong>Composición mínima por turno:</strong> 1 Responsable · 2 Conductores · 1 Apoyo (mínimo 4 operativos).
            Ideal 5 para cubrir CECOPAL. Las personas marcadas como <strong>ADM</strong> no computan en el recuento operativo.
            El sistema sugiere en <span className="text-indigo-700 font-bold">azul</span> la combinación óptima respetando turnos deseados.
          </span>
        </div>
      )}
    </div>
  )
}
