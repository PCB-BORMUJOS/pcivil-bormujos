'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Shield, Check, Save, Lock, Eye, Pencil } from 'lucide-react'
import { MODULOS_APP, keyVer, keyEditar } from '@/lib/modulos-permisos'

interface UsuarioPermisos {
  id: string
  nombre: string
  apellidos: string
  numeroVoluntario: string | null
  permisosPersonalizados: boolean
  permisosExtra: string[]
  rol: { nombre: string }
}

export default function GestionPermisos() {
  const [usuarios, setUsuarios] = useState<UsuarioPermisos[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [personalizado, setPersonalizado] = useState(false)
  const [permisos, setPermisos] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/permisos')
      const d = await r.json()
      setUsuarios(d.usuarios || [])
    } catch { /* silenciado */ }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [])

  const seleccionar = (u: UsuarioPermisos) => {
    setSelId(u.id)
    setPersonalizado(u.permisosPersonalizados)
    setPermisos(new Set((u.permisosExtra || []).filter(k => k.startsWith('ver:') || k.startsWith('editar:'))))
    setGuardado(false)
  }

  const sel = usuarios.find(u => u.id === selId) || null

  const toggle = (k: string) => setPermisos(prev => {
    const s = new Set(prev)
    s.has(k) ? s.delete(k) : s.add(k)
    return s
  })
  const toggleModulo = (mod: string, tipo: 'ver' | 'editar') => {
    const kv = keyVer(mod), ke = keyEditar(mod)
    setPermisos(prev => {
      const s = new Set(prev)
      if (tipo === 'ver') {
        if (s.has(kv)) { s.delete(kv); s.delete(ke) } else { s.add(kv) } // sin ver no hay editar
      } else {
        if (s.has(ke)) { s.delete(ke) } else { s.add(ke); s.add(kv) } // editar implica ver
      }
      return s
    })
  }
  const marcarTodos = (valor: boolean) => {
    setPermisos(() => {
      if (!valor) return new Set()
      const s = new Set<string>()
      MODULOS_APP.filter(m => !m.siempre).forEach(m => { s.add(keyVer(m.key)); s.add(keyEditar(m.key)) })
      return s
    })
  }

  const guardar = async () => {
    if (!sel) return
    setGuardando(true); setGuardado(false)
    try {
      const r = await fetch('/api/admin/permisos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: sel.id, permisosPersonalizados: personalizado, permisosExtra: Array.from(permisos) }),
      })
      if (r.ok) {
        setGuardado(true)
        setUsuarios(prev => prev.map(u => u.id === sel.id ? { ...u, permisosPersonalizados: personalizado, permisosExtra: Array.from(permisos) } : u))
        setTimeout(() => setGuardado(false), 2500)
      } else {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'No se pudo guardar')
      }
    } catch { alert('Error de conexión') }
    finally { setGuardando(false) }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return usuarios
    return usuarios.filter(u => `${u.numeroVoluntario || ''} ${u.nombre} ${u.apellidos} ${u.rol?.nombre || ''}`.toLowerCase().includes(q))
  }, [usuarios, busqueda])

  const nVer = Array.from(permisos).filter(k => k.startsWith('ver:')).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <Shield size={18} className="text-blue-600" />
        <div>
          <h3 className="font-bold text-slate-800">Permisos por persona</h3>
          <p className="text-xs text-slate-500">Activa "permisos personalizados" en una persona y marca qué módulos puede <b>Ver</b> y/o <b>Editar</b>. Solo tú (superadmin) puedes cambiarlo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        {/* Lista de personas */}
        <div className="border-r border-slate-100 max-h-[70vh] overflow-y-auto">
          <div className="p-3 sticky top-0 bg-white border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar persona…" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Cargando…</div>
          ) : filtrados.map(u => (
            <button key={u.id} onClick={() => seleccionar(u)} className={`w-full text-left px-4 py-2.5 border-b border-slate-50 flex items-center justify-between gap-2 hover:bg-slate-50 ${selId === u.id ? 'bg-blue-50' : ''}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{u.nombre} {u.apellidos}</p>
                <p className="text-xs text-slate-400">{u.numeroVoluntario || '—'} · {u.rol?.nombre}</p>
              </div>
              {u.permisosPersonalizados && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">Personalizado</span>}
            </button>
          ))}
        </div>

        {/* Panel de permisos */}
        <div className="p-4">
          {!sel ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
              <Lock size={28} className="mb-2" />
              <p className="text-sm">Selecciona una persona para configurar sus permisos.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{sel.nombre} {sel.apellidos}</h4>
                  <p className="text-xs text-slate-500">{sel.numeroVoluntario || '—'} · Rol: {sel.rol?.nombre}</p>
                </div>
                <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
                  {guardado ? <><Check size={15} /> Guardado</> : <><Save size={15} /> {guardando ? 'Guardando…' : 'Guardar'}</>}
                </button>
              </div>

              {/* Interruptor de permisos personalizados */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 mb-4 cursor-pointer">
                <input type="checkbox" checked={personalizado} onChange={e => setPersonalizado(e.target.checked)} className="accent-blue-600 w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Permisos personalizados</p>
                  <p className="text-xs text-slate-500">Si está activo, esta persona <b>solo</b> verá y editará los módulos marcados abajo (ignora su rol). Si está desactivado, mantiene los permisos de su rol.</p>
                </div>
              </label>

              <div className={personalizado ? '' : 'opacity-50 pointer-events-none'}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Módulos ({nVer} visibles)</p>
                  <div className="flex gap-2">
                    <button onClick={() => marcarTodos(true)} className="text-xs text-blue-600 hover:underline">Marcar todo</button>
                    <span className="text-slate-300">·</span>
                    <button onClick={() => marcarTodos(false)} className="text-xs text-slate-500 hover:underline">Quitar todo</button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_70px_70px] bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    <div className="px-3 py-2">Módulo</div>
                    <div className="px-2 py-2 text-center flex items-center justify-center gap-1"><Eye size={12} />Ver</div>
                    <div className="px-2 py-2 text-center flex items-center justify-center gap-1"><Pencil size={12} />Editar</div>
                  </div>
                  {MODULOS_APP.filter(m => !m.siempre).map(m => {
                    const ver = permisos.has(keyVer(m.key))
                    const editar = permisos.has(keyEditar(m.key))
                    return (
                      <div key={m.key} className="grid grid-cols-[1fr_70px_70px] items-center border-t border-slate-100">
                        <div className="px-3 py-2 text-sm text-slate-700">{m.label}</div>
                        <div className="px-2 py-2 flex justify-center">
                          <input type="checkbox" checked={ver} onChange={() => toggleModulo(m.key, 'ver')} className="accent-blue-600 w-4 h-4" />
                        </div>
                        <div className="px-2 py-2 flex justify-center">
                          <input type="checkbox" checked={editar} onChange={() => toggleModulo(m.key, 'editar')} className="accent-emerald-600 w-4 h-4" />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Dashboard y Mi Área son siempre accesibles. Configuración es exclusiva de superadmin y no se puede asignar.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
