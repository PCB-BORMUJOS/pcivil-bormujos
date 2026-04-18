'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Download, Pencil, Check, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getIconoEquipoECI, getColorEquipoECI } from '@/lib/iconos-config'

const BG_COLOR_MAP: Record<string, string> = {
  extintor: 'bg-red-500', extintor_co2: 'bg-slate-500', bie: 'bg-blue-500',
  detector: 'bg-yellow-500', pulsador: 'bg-orange-500', alarma: 'bg-purple-500',
  señalizacion: 'bg-green-500', salida_emergencia: 'bg-emerald-500',
}
const TIPOS_MARCADOR: { valor: string; label: string }[] = [
  { valor: 'extintor',          label: 'Extintor' },
  { valor: 'extintor_co2',      label: 'Extintor CO2' },
  { valor: 'bie',               label: 'BIE' },
  { valor: 'detector',          label: 'Detector' },
  { valor: 'pulsador',          label: 'Pulsador' },
  { valor: 'alarma',            label: 'Alarma/Sirena' },
  { valor: 'señalizacion',      label: 'Señalización' },
  { valor: 'salida_emergencia', label: 'Salida Emergencia' },
]

interface Marcador {
  id: string
  tipo: string
  etiqueta: string | null
  x: number
  y: number
  equipoECIId: string | null
  equipoECI?: { id: string; tipo: string; subtipo: string | null; ubicacion: string; estado: string } | null
}

interface Props {
  edificioId: string
  planoId?: string
  edificioNombre: string
  planoUrl: string
  equiposECI: any[]
  onCerrar: () => void
}

export default function EditorPlano({ edificioId, planoId, edificioNombre, planoUrl, equiposECI, onCerrar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [marcadores, setMarcadores] = useState<Marcador[]>([])
  const [modoEdicion, setModoEdicion] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState('extintor')
  const [marcadorActivo, setMarcadorActivo] = useState<Marcador | null>(null)
  const [showModalMarcador, setShowModalMarcador] = useState(false)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [etiquetaInput, setEtiquetaInput] = useState('')
  const [equipoInput, setEquipoInput] = useState('')
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const pdfRenderizado = useRef(false)

  useEffect(() => {
    if (pdfRenderizado.current) return
    pdfRenderizado.current = true
    const renderPDF = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        // Fetch como ArrayBuffer para evitar CORS
        const response = await fetch(planoUrl)
        const arrayBuffer = await response.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const container = containerRef.current
        if (!container) return
        // Usar ancho de ventana menos panel lateral como referencia fiable
        const containerW = Math.max((typeof window !== 'undefined' ? window.innerWidth - 220 : 900), 600)
        const viewport0 = page.getViewport({ scale: 1 })
        const scale = (containerW - 32) / viewport0.width
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current!
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        setCargando(false)
      } catch (err) {
        console.error('Error renderizando PDF:', err)
        setCargando(false)
      }
    }
    renderPDF()
  }, [planoUrl])

  useEffect(() => {
    fetch(`/api/incendios/marcadores?${planoId ? 'planoId=' + planoId : 'edificioId=' + edificioId}`)
      .then(r => r.json())
      .then(d => setMarcadores(d.marcadores || []))
      .catch(console.error)
  }, [edificioId])

  const getTipoConfig = (tipo: string) => {
    const base = TIPOS_MARCADOR.find(t => t.valor === tipo) || TIPOS_MARCADOR[0]
    return { ...base, Icono: getIconoEquipoECI(base.valor), bgColor: BG_COLOR_MAP[base.valor] || 'bg-slate-500' }
  }

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!modoEdicion) return
    if ((e.target as HTMLElement).closest('.marcador-pin')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingPos({ x, y })
    setEtiquetaInput('')
    setEquipoInput('')
    setShowModalMarcador(true)
  }, [modoEdicion])

  const guardarMarcador = async () => {
    if (!pendingPos) return
    try {
      const res = await fetch('/api/incendios/marcadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edificioId, planoId: planoId || undefined, tipo: tipoSeleccionado,
          etiqueta: etiquetaInput || null,
          equipoECIId: equipoInput || null,
          x: pendingPos.x, y: pendingPos.y,
        })
      })
      const data = await res.json()
      setMarcadores(prev => [...prev, data.marcador])
      setShowModalMarcador(false)
      setPendingPos(null)
    } catch (err) { console.error(err) }
  }

  const eliminarMarcador = async (id: string) => {
    if (!confirm('¿Eliminar este marcador?')) return
    await fetch(`/api/incendios/marcadores?id=${id}`, { method: 'DELETE' })
    setMarcadores(prev => prev.filter(m => m.id !== id))
    setMarcadorActivo(null)
  }

  const exportarPDF = async () => {
    setExportando(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF } = await import('jspdf')
      const elemento = document.getElementById('plano-exportable')!
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height / canvas.width) * w
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`plano-eci-${edificioNombre.replace(/\s+/g, '-')}.pdf`)
    } catch (err) {
      alert('Error al exportar')
    } finally { setExportando(false) }
  }

  const tipoActivo = getTipoConfig(tipoSeleccionado)

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
            <X size={18} />
          </button>
          <div>
            <h2 className="font-bold text-base leading-tight">Plano ECI — {edificioNombre}</h2>
            <p className="text-xs text-slate-400">{marcadores.length} marcadores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarPDF} disabled={exportando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
            <Download size={14} />
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button onClick={() => setModoEdicion(!modoEdicion)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
              modoEdicion ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}>
            {modoEdicion ? <><Check size={14} /> Edición ON</> : <><Pencil size={14} /> Editar</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel lateral */}
        <div className="w-52 bg-slate-800 text-white flex flex-col overflow-y-auto flex-shrink-0 border-r border-slate-700">
          {modoEdicion && (
            <div className="p-3 border-b border-slate-700">
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Tipo a colocar</p>
              <div className="space-y-0.5">
                {TIPOS_MARCADOR.map(t => {
                  const Icono = getIconoEquipoECI(t.valor)
                  const bgColor = BG_COLOR_MAP[t.valor] || 'bg-slate-500'
                  return (
                    <button key={t.valor} onClick={() => setTipoSeleccionado(t.valor)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                        tipoSeleccionado === t.valor ? 'bg-red-600 text-white' : 'hover:bg-slate-700 text-slate-300'
                      }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                        <Icono size={11} className="text-white" />
                      </div>
                      <span className="text-xs">{t.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-tight">Click en el plano para colocar un marcador</p>
            </div>
          )}
          <div className="p-3 flex-1">
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Marcadores ({marcadores.length})</p>
            {marcadores.length === 0
              ? <p className="text-xs text-slate-500">Sin marcadores</p>
              : <div className="space-y-0.5">
                  {marcadores.map(m => {
                    const cfg = getTipoConfig(m.tipo)
                    const Icono = getIconoEquipoECI(cfg.valor)
                    return (
                      <button key={m.id}
                        onClick={() => setMarcadorActivo(marcadorActivo?.id === m.id ? null : m)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                          marcadorActivo?.id === m.id ? 'bg-slate-600' : 'hover:bg-slate-700'
                        }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bgColor}`}>
                          <Icono size={10} className="text-white" />
                        </div>
                        <span className="truncate text-slate-300">{m.etiqueta || cfg.label}</span>
                        {modoEdicion && (
                          <button onClick={e => { e.stopPropagation(); eliminarMarcador(m.id) }}
                            className="ml-auto text-red-400 hover:text-red-300 flex-shrink-0">
                            <X size={12} />
                          </button>
                        )}
                      </button>
                    )
                  })}
                </div>
            }
          </div>
        </div>

        {/* Plano */}
        <div className="flex-1 overflow-auto bg-slate-700 flex items-start justify-center p-4">
          <div id="plano-exportable" ref={containerRef}
            className="relative bg-white shadow-2xl"
            style={{ cursor: modoEdicion ? 'crosshair' : 'default', maxWidth: '100%' }}
            onClick={handleCanvasClick}>
            {cargando && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10 min-w-[400px] min-h-[300px]">
                <div className="text-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Cargando plano...</p>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="block max-w-full" />
            {marcadores.map(m => {
              const cfg = getTipoConfig(m.tipo)
              const { Icono } = cfg
              const activo = marcadorActivo?.id === m.id
              return (
                <div key={m.id} className="marcador-pin absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${m.x}%`, top: `${m.y}%`, zIndex: activo ? 20 : 10 }}
                  onClick={e => { e.stopPropagation(); setMarcadorActivo(activo ? null : m) }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110 ${cfg.bgColor} ${activo ? 'scale-125 ring-2 ring-white' : ''}`}
                    title={m.etiqueta || cfg.label}>
                    <Icono size={14} className="text-white" />
                  </div>
                  {activo && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg p-2.5 w-44 shadow-xl z-30 border border-slate-700">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${cfg.bgColor}`}>
                          <Icono size={9} className="text-white" />
                        </div>
                        <p className="font-medium">{cfg.label}</p>
                      </div>
                      {m.etiqueta && <p className="text-slate-300 text-xs">{m.etiqueta}</p>}
                      {m.equipoECI && (
                        <p className="text-slate-400 text-xs mt-1">
                          {m.equipoECI.ubicacion} —{' '}
                          <span className={m.equipoECI.estado === 'operativo' ? 'text-green-400' : m.equipoECI.estado === 'revision_pendiente' ? 'text-yellow-400' : 'text-red-400'}>
                            {m.equipoECI.estado === 'operativo' ? 'Operativo' : m.equipoECI.estado === 'revision_pendiente' ? 'Rev. Pendiente' : 'Fuera servicio'}
                          </span>
                        </p>
                      )}
                      {modoEdicion && (
                        <button onClick={e => { e.stopPropagation(); eliminarMarcador(m.id) }}
                          className="mt-2 w-full text-center text-red-400 hover:text-red-300 text-xs border-t border-slate-700 pt-1.5">
                          Eliminar marcador
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal nuevo marcador */}
      {showModalMarcador && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60" onClick={() => { setShowModalMarcador(false); setPendingPos(null) }}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${tipoActivo.bgColor}`}>
                <tipoActivo.Icono size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800">Nuevo marcador — {tipoActivo.label}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Etiqueta (opcional)</label>
                <input type="text" value={etiquetaInput} onChange={e => setEtiquetaInput(e.target.value)}
                  placeholder="Ej: Extintor pasillo norte"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus onKeyDown={e => e.key === 'Enter' && guardarMarcador()} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vincular a equipo ECI (opcional)</label>
                <select value={equipoInput} onChange={e => setEquipoInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Sin vincular</option>
                  {equiposECI.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.tipo}{eq.subtipo ? ` (${eq.subtipo})` : ''} — {eq.ubicacion}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowModalMarcador(false); setPendingPos(null) }}
                className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarMarcador}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                Colocar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
