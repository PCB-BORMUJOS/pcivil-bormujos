'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw, Save,
  Shield, Car, Minus, Plus, Clock, AlertTriangle, CheckCircle2, Info
, X } from 'lucide-react'

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
  fichaVoluntario?: { enPracticas?: boolean; turnosPracticasRealizados?: number; kmDesplazamiento?: number } | null
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

const getCurrentMonday = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
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
  const [semanaStart, setSemanaStart] = useState<Date>(() => getCurrentMonday(new Date()))
  const [disponibilidades, setDisponibilidades] = useState<Record<string, UsuarioDisponible[]>>({})
  const [asignaciones, setAsignaciones] = useState<Record<string, string[]>>({})
  const [capacidad, setCapacidad] = useState<Record<string, number>>({})
  const [guardiasGuardadas, setGuardiasGuardadas] = useState<GuardiaExistente[]>([])
  const [sugerencias, setSugerencias] = useState<Record<string, string[]>>({})
  const [rolEspecial, setRolEspecial] = useState<Record<string, { responsable?: string; cecopal?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [pendiente, setPendiente] = useState(false)
  const [horasSlot, setHorasSlot] = useState<Record<string, number>>({})
  const [guardandoHoras, setGuardandoHoras] = useState<Record<string, boolean>>({})
  const [showExtraordinario, setShowExtraordinario] = useState(false)
  const [extraPersonas, setExtraPersonas] = useState<string[]>([])
  const [todosUsuarios, setTodosUsuarios] = useState<any[]>([])
  const [idsNoDisponible, setIdsNoDisponible] = useState<string[]>([])
  const [idsQueRespondieron, setIdsQueRespondieron] = useState<string[]>([])
  const { data: session } = useSession()
  const isAdmin = ['superadmin', 'admin'].includes((session?.user as any)?.rol ?? '')

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

  // Ordenación: J primero, luego B, luego S — dentro de cada grupo por número ascendente
  const sortIndicativo = (a: string | null, b: string | null): number => {
    const prefixOrder = (ind: string | null): number => {
      if (!ind) return 99
      if (ind.startsWith('J')) return 0
      if (ind.startsWith('S')) return 1
      if (ind.startsWith('B')) return 2
      return 3
    }
    const numOf = (ind: string | null): number => {
      if (!ind) return 9999
      const match = ind.match(/\d+/)
      return match ? parseInt(match[0]) : 9999
    }
    const pa = prefixOrder(a), pb = prefixOrder(b)
    if (pa !== pb) return pa - pb
    return numOf(a) - numOf(b)
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
      // dispMap contiene SOLO disponibilidad real declarada por los voluntarios
      // todosUsuarios se guarda separado para permitir asignación manual por admin
      const todosUsuariosActivos: any[] = data.todosUsuariosActivos || []
      setTodosUsuarios(todosUsuariosActivos)
      setIdsNoDisponible(data.idsNoDisponible || [])
      setIdsQueRespondieron(data.idsQueRespondieron || [])
      // NO añadir todosUsuarios a dispMap: contaminaría las sugerencias
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
      /* error silenciado */
    } finally {
      setLoading(false)
    }
  }, [semanaStart])

  useEffect(() => {
    cargarDatos()
    // Recarga automática cada 60s para reflejar disponibilidades nuevas en tiempo real
    const interval = setInterval(() => { cargarDatos() }, 60_000)
    return () => clearInterval(interval)
  }, [cargarDatos])

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

  const handleGuardar = async () => {
    const totalAsig = Object.values(asignaciones).flat().length
    if (!confirm(`¿Guardar el cuadrante sin notificar?\nSe guardarán ${totalAsig} asignaciones.`)) return
    setGuardando(true)
    try {
      // Calcular qué guardias ya guardadas ya NO están en asignaciones (borrar solo esas)
      const aEliminar = guardiasGuardadas.filter(g => {
        const dateStr = g.fecha.slice(0, 10)
        const sk = slotKey(dateStr, g.turno)
        const uidsEnSlot = asignaciones[sk] || []
        return !uidsEnSlot.includes(g.usuarioId)
      })

      // Calcular qué asignaciones son NUEVAS (no existen en guardiasGuardadas)
      const cuerpos: any[] = []
      Object.entries(asignaciones).forEach(([sk, userIds]) => {
        const { fecha, turno } = parseSlotKey(sk)
        userIds.forEach(uid => {
          const yaExiste = guardiasGuardadas.find(
            g => g.usuarioId === uid && g.fecha.slice(0, 10) === fecha && g.turno === turno
          )
          const u =
            disponibilidades[sk]?.find(d => d.id === uid) ||
            guardiasGuardadas.find(g => g.usuarioId === uid)?.usuario ||
            todosUsuarios.find((t: any) => t.id === uid)
          const resSk = rolEspecial[sk] || {}
          const rolFinal = resSk.responsable === uid
            ? 'Responsable'
            : resSk.cecopal === uid
            ? 'Cecopal'
            : (u as any)?.carnetConducir
            ? 'Conductor'
            : 'Interviniente'
          if (yaExiste) {
            // Si el rol cambió, eliminar y recrear
            if (yaExiste.rol !== rolFinal) {
              aEliminar.push(yaExiste)
              cuerpos.push({ fecha, turno, usuarioId: uid, tipo: 'programada', rol: rolFinal })
            }
            return
          }
          cuerpos.push({ fecha, turno, usuarioId: uid, tipo: 'programada', rol: rolFinal })
        })
      })

      // 1. Borrar solo las que desaparecen
      if (aEliminar.length > 0) {
        await Promise.all(
          aEliminar.map(g =>
            fetch(`/api/cuadrantes?id=${g.id}`, { method: 'DELETE' })
          )
        )
      }

      // 2. Crear solo las nuevas
      let fallidas = 0
      if (cuerpos.length > 0) {
        const resultados = await Promise.all(
          cuerpos.map(body =>
            fetch('/api/cuadrantes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          )
        )
        fallidas = resultados.filter(r => !r.ok).length
      }

      if (fallidas > 0) {
        alert(`⚠ Cuadrante guardado con ${fallidas} error(es). Recarga para verificar.`)
      } else {
        alert(`Cuadrante guardado correctamente (${aEliminar.length} eliminadas, ${cuerpos.length} nuevas)`)
      }
      await cargarDatos()
    } catch (e) {
      console.error('Error guardando cuadrante:', e)
      alert('Error al guardar el cuadrante. Los datos existentes NO se han borrado.')
    } finally {
      setGuardando(false)
    }
  }

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
            guardiasGuardadas.find(g => g.usuarioId === uid)?.usuario ||
            todosUsuarios.find((t: any) => t.id === uid)
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
      /* error silenciado */
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
            onClick={handleGuardar}
            disabled={guardando}
            className="px-3 py-2 bg-slate-600 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
            title="Guardar sin notificar"
          >
            💾 Guardar
          </button>
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
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> En prácticas</span>
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
                  <div key={dayIdx} className={`border-r border-slate-100 last:border-r-0 p-2.5 ${dayIdx >= 5 ? 'bg-slate-50/60' : ''} ${turno.key === 'tarde' ? 'bg-slate-50/30' : ''}`}>
                    <div className={`flex items-center justify-between mb-1.5 pb-1 border-b ${turno.key === 'mañana' ? 'border-amber-100' : 'border-indigo-100'}`}>
                      <div className="flex items-center gap-1">
                        <Clock size={9} className={turno.key === 'mañana' ? 'text-amber-500' : 'text-indigo-500'} />
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${turno.key === 'mañana' ? 'text-amber-600' : 'text-indigo-600'}`}>{turno.label}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${slotOk ? 'bg-green-100 text-green-700' : slotParcial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                          {asignadosOp.length}/{cap}
                        </span>
                        <button onClick={() => setCapacidad(p => ({ ...p, [sk]: Math.max(1, (p[sk] || 4) - 1) }))} className="w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded text-slate-400"><Minus size={7} /></button>
                        <button onClick={() => setCapacidad(p => ({ ...p, [sk]: (p[sk] || 4) + 1 }))} className="w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded text-slate-400"><Plus size={7} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1.5">
                      {[4, 8, 12].map(h => (
                        <button
                          key={h}
                          disabled={!!guardandoHoras[sk] || asignadosOp.length === 0}
                          onClick={async () => {
                            if (asignadosOp.length === 0) { alert('Asigna personas al turno primero'); return }
                            setGuardandoHoras(p => ({ ...p, [sk]: true }))
                            let ok = 0
                            for (const uid of asignadosOp) {
                              const res = await fetch('/api/cuadrantes/dieta-slot', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ usuarioId: uid, fecha: dateStr, turno: turno.key, horas: h })
                              })
                              if (res.ok) ok++
                            }
                            setHorasSlot(p => ({ ...p, [sk]: h }))
                            setGuardandoHoras(p => ({ ...p, [sk]: false }))
                            alert('Dietas (' + h + 'h) actualizadas para ' + ok + ' personas')
                          }}
                          className={'text-[8px] font-bold px-1.5 py-0.5 rounded transition-colors ' + (
                            horasSlot[sk] === h
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-700'
                          ) + ' disabled:opacity-40'}
                        >+{h}h</button>
                      ))}
                      {guardandoHoras[sk] && <span className="text-[8px] text-slate-400 ml-1">...</span>}
                    </div>
                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {(() => {
                        // Lista unificada de todos los voluntarios para este slot
                        const listaCompleta = todosUsuarios.map((u: any) => {
                          const dispData = disponibles.find((d: any) => d.id === u.id)
                          const g = guardiasGuardadas.find(gr => gr.usuarioId === u.id)
                          const isAsig = asignados.includes(u.id)
                          const haRespondido = idsQueRespondieron.includes(u.id)
                          const esNoDisponible = idsNoDisponible.includes(u.id)
                          const tieneDisponibilidadEsteSlot = !!dispData
                          return {
                            id: u.id,
                            numeroVoluntario: u.numeroVoluntario,
                            nombre: u.nombre,
                            apellidos: u.apellidos,
                            responsableTurno: u.responsableTurno,
                            carnetConducir: u.carnetConducir,
                            esOperativo: u.esOperativo,
                            experiencia: u.experiencia || 'BAJA',
                            turnosDeseados: dispData?.turnosDeseados ?? 4,
                            fichaVoluntario: dispData?.fichaVoluntario || null,
                            isAsig,
                            tieneDisponibilidadEsteSlot,
                            haRespondido,
                            esNoDisponible,
                            guardiaData: g || null,
                          }
                        })
                        // Ordenar: J → B → S, numérico ascendente
                        const listaOrdenada = listaCompleta.sort((a: any, b: any) =>
                          sortIndicativo(a.numeroVoluntario, b.numeroVoluntario)
                        )
                        if (listaOrdenada.length === 0) {
                          return <div className="text-[9px] text-slate-300 text-center py-3">Sin voluntarios</div>
                        }
                        return listaOrdenada.map((u: any) => {
                          const isSug = sugeridosSk.includes(u.id) && !u.isAsig
                          const esPracticas = !!u.fichaVoluntario?.enPracticas
                          const turnosPrac = u.fichaVoluntario?.turnosPracticasRealizados ?? 0
                          const asigCount = turnosAsignadosUsuario(u.id)
                          const restantes = Math.max(0, u.turnosDeseados - asigCount)
                          const agotado = restantes === 0 && !u.isAsig && u.tieneDisponibilidadEsteSlot

                          // Determinar estilo según estado
                          let className = ''
                          let clickable = true
                          if (u.isAsig && esPracticas) {
                            className = 'bg-amber-100 border border-amber-400 text-amber-900'
                          } else if (u.isAsig) {
                            className = 'bg-green-100 border border-green-300 text-green-900'
                          } else if (u.tieneDisponibilidadEsteSlot && isSug) {
                            className = 'bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                          } else if (u.tieneDisponibilidadEsteSlot && agotado) {
                            className = 'bg-red-50 border border-red-100 text-red-300 cursor-not-allowed opacity-50'
                            clickable = false
                          } else if (u.tieneDisponibilidadEsteSlot) {
                            className = 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          } else if (!u.haRespondido && !u.esNoDisponible) {
                            className = 'bg-red-50 border border-dashed border-red-300 text-red-400 hover:bg-red-100'
                          } else if (isAdmin && !u.esNoDisponible) {
                            // Admin puede ver y asignar voluntarios sin disponibilidad declarada
                            className = 'bg-slate-50 border border-dashed border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          } else {
                            return null
                          }

                          return (
                            <div
                              key={u.id}
                              onClick={() => clickable && toggleAsignacion(sk, u.id)}
                              title={`${u.nombre} ${u.apellidos}${u.tieneDisponibilidadEsteSlot ? ` · Quiere ${u.turnosDeseados} turnos · ${restantes} restantes` : u.esNoDisponible ? ' · No disponible esta semana' : ' · Sin disponibilidad declarada'}`}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] transition-all select-none cursor-pointer ${className}`}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${u.isAsig && u.estadoGuardia === 'ausente' ? 'bg-purple-500 border-purple-500 text-white' : u.isAsig && esPracticas ? 'bg-amber-500 border-amber-500 text-white' : u.isAsig ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`} style={{ fontSize: '9px' }}>
                                {u.isAsig && u.estadoGuardia === 'ausente' ? '✗' : u.isAsig ? '✓' : ''}
                              </span>
                              <span className={'font-bold truncate flex-1' + (u.isAsig && u.estadoGuardia === 'ausente' ? ' line-through' : '')}>
                                {u.numeroVoluntario || `${u.nombre.slice(0, 3)}.`}
                                {esPracticas && <span className="ml-0.5 text-[7px] font-bold text-amber-600 bg-amber-100 px-0.5 rounded">P{turnosPrac}/15</span>}
                              </span>
                              <span className="flex items-center gap-0.5 flex-shrink-0">
                                {u.responsableTurno && <Shield size={11} className={u.isAsig ? 'text-green-700' : u.tieneDisponibilidadEsteSlot ? 'text-indigo-500' : 'text-slate-300'} />}
                                {u.carnetConducir && <Car size={11} className={u.isAsig ? 'text-green-700' : u.tieneDisponibilidadEsteSlot ? 'text-blue-500' : 'text-slate-300'} />}
                                {!u.esOperativo && <span className="text-[7px] font-bold text-slate-400 bg-slate-100 px-0.5 rounded">ADM</span>}
                              </span>
                              {u.tieneDisponibilidadEsteSlot && (
                                <span className={`text-[10px] font-mono flex-shrink-0 ${u.isAsig ? 'text-green-600' : restantes === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                  [{restantes}↓]
                                </span>
                              )}
                              {u.isAsig && (
                                <span className="flex gap-0.5 ml-0.5" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setRolEspecial(prev => {
                                      const actual = prev[sk] || {}
                                      const nuevo = actual.responsable === u.id ? undefined : u.id
                                      return { ...prev, [sk]: { ...actual, responsable: nuevo } }
                                    })}
                                    title="Responsable de turno"
                                    className={rolEspecial[sk]?.responsable === u.id ? "text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-500 text-white" : "text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-400 hover:bg-indigo-100"}
                                  >R</button>
                                  <button
                                    onClick={() => setRolEspecial(prev => {
                                      const actual = prev[sk] || {}
                                      const nuevo = actual.cecopal === u.id ? undefined : u.id
                                      return { ...prev, [sk]: { ...actual, cecopal: nuevo } }
                                    })}
                                    title="Responsable CECOPAL"
                                    className={rolEspecial[sk]?.cecopal === u.id ? "text-[9px] font-bold px-1 py-0.5 rounded bg-orange-500 text-white" : "text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-400 hover:bg-orange-100"}
                                  >C</button>
                                </span>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                    {slotParcial && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600">
                        <AlertTriangle size={8} /><span>Faltan {cap - asignadosOp.length}</span>
                      </div>
                    )}
                    {slotOk && asignados.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-600">
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


      {/* ── Tabla resumen por voluntario ─────────────────────────────────── */}
      {!loading && todosUsuarios.length > 0 && (() => {
        // Generar fechas de la semana
        const fechasSemana = DIAS.map((_, i) => {
          const d = new Date(semanaStart)
          d.setDate(semanaStart.getDate() + i)
          return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
        })
        const diasCortos = ['L','M','X','J','V','S','D']

        // Construir mapa userId -> turnosDeseados desde disponibilidades
        const turnosDeseadosMap: Record<string, number> = {}
        Object.values(disponibilidades).flat().forEach((d: any) => {
          if (d.turnosDeseados && !turnosDeseadosMap[d.id]) turnosDeseadosMap[d.id] = d.turnosDeseados
        })

        // Todos los userIds con actividad (disp O asignado)
        const userIdsConActividad = new Set<string>()
        Object.values(disponibilidades).flat().forEach((d: any) => userIdsConActividad.add(d.id))
        Object.values(asignaciones).flat().forEach((id: any) => userIdsConActividad.add(id))

        // Para cada usuario calcular disponibilidad y asignaciones
        const filas = todosUsuarios
          .filter(u => userIdsConActividad.has(u.id))
          .map(u => {
            const dispSlots: string[] = []
            const asigSlots: string[] = []
            fechasSemana.forEach((fecha, di) => {
              TURNOS.forEach(({ key, label }) => {
                const sk = slotKey(fecha, key)
                const disp = disponibilidades[sk]?.some((d: any) => d.id === u.id)
                const asig = (asignaciones[sk] || []).includes(u.id)
                if (disp) dispSlots.push(`${diasCortos[di]}${label.charAt(0)}`)
                if (asig) asigSlots.push(`${diasCortos[di]}${label.charAt(0)}`)
              })
            })
            const turnosDeseados = turnosDeseadosMap[u.id] || 0
            return { u: { ...u, turnosDeseados }, dispSlots, asigSlots }
          })
          .sort((a, b) => (a.u.numeroVoluntario || '').localeCompare(b.u.numeroVoluntario || ''))

        if (filas.length === 0) return null

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Resumen por voluntario</h3>
              <span className="text-xs text-slate-400">{filas.length} con actividad esta semana</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Indicativo</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Disponible en</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Solicita</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Turnos asignados</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Asig.</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ u, dispSlots, asigSlots }) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-indigo-700">{u.numeroVoluntario || '—'}</span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">{u.nombre} {u.apellidos}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {dispSlots.length === 0
                            ? <span className="text-slate-300 italic text-xs">Sin declarar</span>
                            : dispSlots.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">{s}</span>
                            ))
                          }
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {u.turnosDeseados > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-xs">
                            {u.turnosDeseados}t
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {asigSlots.length === 0
                            ? <span className="text-slate-300 italic text-xs">Sin asignar</span>
                            : asigSlots.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-mono font-bold text-[10px]">{s}</span>
                            ))
                          }
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-bold text-sm ${asigSlots.length > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                          {asigSlots.length}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {(() => {
                          const deseados = u.turnosDeseados || 0
                          const asig = asigSlots.length
                          if (deseados === 0) return <span className="text-slate-300 text-xs">—</span>
                          if (asig >= deseados) return <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">✓ Cubierto</span>
                          if (asig > 0) return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">Parcial {asig}/{deseados}</span>
                          return <span className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px]">Sin asignar</span>
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {showExtraordinario && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowExtraordinario(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-orange-500 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Nuevo Servicio Extraordinario</h2>
                <p className="text-xs opacity-80 mt-0.5">Turnos de mas de 8h o 12h con dieta extraordinaria</p>
              </div>
              <button onClick={() => setShowExtraordinario(false)}><X size={17} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const fd = new FormData(form)
              const fecha = fd.get('fecha') as string
              const horas = fd.get('horas') as string
              const descripcion = fd.get('descripcion') as string
              if (!fecha || !horas || extraPersonas.length === 0) {
                alert('Selecciona fecha, duracion y al menos una persona')
                return
              }
              let errores = 0
              for (const uid of extraPersonas) {
                const res = await fetch('/api/cuadrantes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fecha, turno: 'extraordinario', usuarioId: uid, tipo: 'extraordinaria', horasTurno: parseFloat(horas), descripcionExtra: descripcion, notas: descripcion })
                })
                if (!res.ok) errores++
              }
              if (errores > 0) alert(errores + ' asignaciones fallaron')
              else alert('Servicio extraordinario creado para ' + extraPersonas.length + ' personas')
              setShowExtraordinario(false)
              setExtraPersonas([])
              form.reset()
              await cargarDatos()
            }} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                  <input name="fecha" type="date" required defaultValue={toDateStr(new Date())} className="w-full border border-slate-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duracion *</label>
                  <select name="horas" required className="w-full border border-slate-300 rounded-lg p-2.5">
                    <option value="">Seleccionar...</option>
                    <option value="8">Mas de 8 horas (49,15 euro)</option>
                    <option value="12">Mas de 12 horas (72,37 euro)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion del servicio</label>
                <input name="descripcion" type="text" placeholder="Ej: Emergencia inundaciones, Evento feria..." className="w-full border border-slate-300 rounded-lg p-2.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Personas asignadas *
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{extraPersonas.length} seleccionadas</span>
                </label>
                <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
                  {todosUsuarios.map((u: any) => (
                    <label key={u.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={extraPersonas.includes(u.id)}
                        onChange={() => setExtraPersonas(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className="w-4 h-4 rounded accent-orange-500" />
                      <span className="text-xs font-bold text-slate-400 w-8">{u.numeroVoluntario || '-'}</span>
                      <span className="text-sm font-medium text-slate-700">{u.nombre} {u.apellidos}</span>
                      <span className="ml-auto flex gap-1">
                        {u.responsableTurno && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">R</span>}
                        {u.carnetConducir && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">C</span>}
                      </span>
                    </label>
                  ))}
                  {todosUsuarios.length === 0 && <p className="text-slate-400 text-sm text-center py-6">Cargando voluntarios...</p>}
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setExtraPersonas(todosUsuarios.map((u:any) => u.id))} className="text-xs text-indigo-600 hover:underline">Seleccionar todos</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" onClick={() => setExtraPersonas([])} className="text-xs text-slate-500 hover:underline">Limpiar</button>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                Si algun voluntario ya tiene turno ordinario ese dia, su dieta ordinaria se reemplazara automaticamente por la extraordinaria.
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowExtraordinario(false); setExtraPersonas([]) }} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">Crear Servicio Extraordinario</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
