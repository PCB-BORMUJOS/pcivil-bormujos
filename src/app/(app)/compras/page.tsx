'use client'

// Área de Compras — gestión completa del proceso: petición, expediente
// (propuesta de gasto, informe técnico y ofertas), adjudicación, recepción y
// facturación. Reservada a coordinación y jefatura del servicio.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePermisos } from '@/lib/permisos'
import { generarPropuestaGasto, TIPOS_COMPRA, etiquetaTipoCompra } from '@/lib/informe-compras'
import { generar09A, DATOS_09A_VACIOS, type Datos09A } from '@/lib/formulario-09a'
import {
  ShoppingCart, RefreshCw, FolderOpen, FileText, Euro, CheckCircle2, Clock,
  AlertTriangle, X, Plus, ChevronRight, Package, Truck, Receipt, ShieldAlert,
  FileDown, Upload, Trash2, Building2, Search, Filter, History, Award, Info,
  GripVertical, FileSpreadsheet,
} from 'lucide-react'

const COLUMNAS = [
  { id: 'solicitada', label: 'Solicitada', icon: Clock, color: 'border-amber-300', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'expediente', label: 'Expediente', icon: FolderOpen, color: 'border-violet-400', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'aprobada', label: 'Aprobada', icon: CheckCircle2, color: 'border-blue-300', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'en_compra', label: 'En compra', icon: ShoppingCart, color: 'border-purple-300', chip: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'recibida', label: 'Recibida', icon: Package, color: 'border-emerald-300', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]
const PRIORIDADES: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-orange-50 text-orange-700 border-orange-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  baja: 'bg-slate-100 text-slate-600 border-slate-200',
}
const ESTADO_EXP: Record<string, { label: string; color: string }> = {
  borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  propuesta: { label: 'En propuesta', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  adjudicado: { label: 'Adjudicado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  recibido: { label: 'Recibido', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  facturado: { label: 'Facturado', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  cerrado: { label: 'Cerrado', color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const fmtFecha = (d?: string | Date | null) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '—'
const fmtEur = (n?: number | null) => (n === null || n === undefined) ? '—' : Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

export default function ComprasPage() {
  const { isAdmin } = usePermisos()
  const [loading, setLoading] = useState(true)
  const [peticiones, setPeticiones] = useState<any[]>([])
  const [sueltos, setSueltos] = useState<any[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [maestros, setMaestros] = useState<{ proveedores: any[]; partidas: any[] }>({ proveedores: [], partidas: [] })
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState('todas')
  const [expedienteId, setExpedienteId] = useState<string | null>(null)
  const [expediente, setExpediente] = useState<any>(null)
  const [tabExp, setTabExp] = useState<'propuesta' | 'informe' | 'ofertas' | 'facturas' | 'historial'>('propuesta')
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [lineas, setLineas] = useState<any[]>([])
  const [nuevaOferta, setNuevaOferta] = useState<any>({ proveedorNombre: '', importe: '', iva: '21' })
  const [nuevaFactura, setNuevaFactura] = useState<any>({ numeroFactura: '', importeBase: '', iva: '21' })
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [columnaDestino, setColumnaDestino] = useState<string | null>(null)
  const [show09A, setShow09A] = useState(false)
  const [datos09A, setDatos09A] = useState<Datos09A>(DATOS_09A_VACIOS)

  const cargar = useCallback(async () => {
    try {
      const [rp, rk, rm] = await Promise.all([
        fetch('/api/compras?tipo=pipeline'),
        fetch('/api/compras?tipo=kpis'),
        fetch('/api/compras?tipo=maestros'),
      ])
      const [dp, dk, dm] = await Promise.all([rp.json(), rk.json(), rm.json()])
      setPeticiones(dp.peticiones || [])
      setSueltos(dp.expedientesSueltos || [])
      setKpis(dk.kpis || null)
      setMaestros({ proveedores: dm.proveedores || [], partidas: dm.partidas || [] })
    } catch { /* silenciado */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirExpediente = async (id: string) => {
    setExpedienteId(id)
    setTabExp('propuesta')
    try {
      const r = await fetch(`/api/compras?tipo=expediente&id=${id}`)
      const d = await r.json()
      setExpediente(d.expediente)
      setLineas(d.expediente?.lineas || [])
      setForm({
        titulo: d.expediente?.titulo || '', objeto: d.expediente?.objeto || '',
        justificacion: d.expediente?.justificacion || '', propuestaGasto: d.expediente?.propuestaGasto || '',
        informeTecnico: d.expediente?.informeTecnico || '', tipoCompra: d.expediente?.tipoCompra || 'directa_menor500',
        importeEstimado: d.expediente?.importeEstimado ?? '', partidaId: d.expediente?.partidaId || '',
        numeroRC: d.expediente?.numeroRC || '', plazoEntrega: d.expediente?.plazoEntrega || '',
        retencionCredito: !!d.expediente?.retencionCredito, notas: d.expediente?.notas || '',
      })
    } catch { /* silenciado */ }
  }

  const abrirArchivador = async (peticion: any) => {
    if (peticion.expedienteCompra) return abrirExpediente(peticion.expedienteCompra.id)
    setGuardando(true)
    try {
      const r = await fetch('/api/compras?tipo=expediente', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peticionId: peticion.id }),
      })
      const d = await r.json()
      if (r.ok) { await cargar(); abrirExpediente(d.expediente.id) }
      else setAviso(d.error || 'No se ha podido abrir el expediente')
    } catch { setAviso('Error al abrir el expediente') } finally { setGuardando(false) }
  }

  const guardarExpediente = async () => {
    if (!expediente) return
    setGuardando(true)
    try {
      const r = await fetch('/api/compras?tipo=expediente', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expediente.id, ...form }),
      })
      if (r.ok) { setAviso('Expediente guardado.'); await abrirExpediente(expediente.id); await cargar() }
      else setAviso('No se ha podido guardar')
    } catch { setAviso('Error al guardar') } finally { setGuardando(false) }
  }

  // Arrastrar una tarjeta a otra columna avanza o retrocede su estado.
  const soltarEn = async (columna: string) => {
    const id = arrastrando
    setArrastrando(null)
    setColumnaDestino(null)
    if (!id) return
    const peticion = peticiones.find(p => p.id === id)
    if (!peticion) return

    const actual = peticion.expedienteCompra && peticion.estado === 'pendiente' ? 'expediente' : peticion.estado
    if (actual === columna) return

    if (columna === 'expediente') {
      // Volver al archivador: la petición queda pendiente y se abre expediente.
      if (peticion.estado !== 'pendiente') await moverPeticion(id, 'pendiente', true)
      if (!peticion.expedienteCompra) {
        await fetch('/api/compras?tipo=expediente', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peticionId: id }),
        })
      }
      await cargar()
      return
    }
    const destino = columna === 'solicitada' ? 'pendiente' : columna
    await moverPeticion(id, destino, true)
  }

  const moverPeticion = async (id: string, estado: string, silencioso = false) => {
    const comentario = (!silencioso && estado === 'rechazada') ? (prompt('Motivo del rechazo:') || '') : undefined
    const r = await fetch('/api/compras?tipo=peticion', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado, comentario }),
    })
    if (r.ok) cargar(); else setAviso('No se ha podido mover la petición')
  }

  const anadirOferta = async () => {
    if (!expediente || !nuevaOferta.proveedorNombre || !nuevaOferta.importe) return
    setGuardando(true)
    try {
      const r = await fetch('/api/compras?tipo=presupuesto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId: expediente.id, ...nuevaOferta }),
      })
      if (r.ok) { setNuevaOferta({ proveedorNombre: '', importe: '', iva: '21' }); await abrirExpediente(expediente.id); await cargar() }
    } finally { setGuardando(false) }
  }

  const adjudicar = async (presupuestoId: string) => {
    if (!expediente) return
    if (!confirm('¿Adjudicar el expediente a esta oferta? El resto quedarán descartadas.')) return
    const r = await fetch('/api/compras?tipo=adjudicar', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: expediente.id, presupuestoId }),
    })
    if (r.ok) { setAviso('Expediente adjudicado.'); await abrirExpediente(expediente.id); await cargar() }
  }

  const anadirFactura = async () => {
    if (!expediente || !nuevaFactura.numeroFactura) return
    setGuardando(true)
    try {
      const r = await fetch('/api/compras?tipo=factura', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedienteId: expediente.id, proveedor: expediente.proveedor?.nombre, ...nuevaFactura }),
      })
      if (r.ok) { setNuevaFactura({ numeroFactura: '', importeBase: '', iva: '21' }); await abrirExpediente(expediente.id); await cargar() }
    } finally { setGuardando(false) }
  }

  const subirDocumento = async (campo: string, file: File, extra?: { presupuestoId?: string; facturaId?: string }) => {
    if (!expediente) return
    const fd = new FormData()
    fd.append('expedienteId', expediente.id)
    fd.append('campo', campo)
    fd.append('file', file)
    if (extra?.presupuestoId) fd.append('presupuestoId', extra.presupuestoId)
    if (extra?.facturaId) fd.append('facturaId', extra.facturaId)
    setGuardando(true)
    try {
      const r = await fetch('/api/compras?tipo=documento', { method: 'POST', body: fd })
      if (r.ok) await abrirExpediente(expediente.id)
      else { const d = await r.json().catch(() => ({})); setAviso(d.error || 'No se ha podido subir el documento') }
    } finally { setGuardando(false) }
  }

  // El impreso oficial se precarga con lo que ya consta en el expediente.
  const abrir09A = () => {
    if (!expediente) return
    const guardado = expediente.datos09A as Partial<Datos09A> | null
    const oferta = (expediente.presupuestosProv || []).find((o: any) => o.estado === 'adjudicado')
      || (expediente.presupuestosProv || [])[0]
    const prov = expediente.proveedor || oferta?.proveedor
    const base = oferta ? Number(oferta.importe) : (form.importeEstimado ? parseFloat(form.importeEstimado) : 0)
    const tipoIva = oferta ? Number(oferta.iva) : 21
    const cuota = +(base * tipoIva / 100).toFixed(2)

    setDatos09A({
      ...DATOS_09A_VACIOS,
      ...(guardado || {}),
      solNombre: guardado?.solNombre || 'Emilio',
      solApellido1: guardado?.solApellido1 || 'Simón',
      solApellido2: guardado?.solApellido2 || 'Gómez',
      provTipoDoc: guardado?.provTipoDoc || (prov?.cif ? 'C.I.F.' : 'D.N.I.'),
      provNumDoc: guardado?.provNumDoc || prov?.cif || '',
      provNombre: guardado?.provNombre || prov?.nombre || '',
      contNombre: guardado?.contNombre || prov?.contacto || '',
      contTelefono: guardado?.contTelefono || prov?.telefono || '',
      contEmail: guardado?.contEmail || prov?.email || '',
      socNombreVia: guardado?.socNombreVia || prov?.direccion || '',
      notNombreVia: guardado?.notNombreVia || prov?.direccion || '',
      gasPartida: guardado?.gasPartida || (expediente.partida ? `${expediente.partida.codigo} — ${expediente.partida.denominacion}` : ''),
      gasDetalle: guardado?.gasDetalle || form.objeto || form.propuestaGasto || expediente.titulo || '',
      gasBase: guardado?.gasBase || (base ? String(base) : ''),
      gasIva: guardado?.gasIva || (cuota ? String(cuota) : ''),
      gasTotal: guardado?.gasTotal || (base ? String(+(base + cuota).toFixed(2)) : ''),
    })
    setShow09A(true)
  }

  const guardar09A = async (descargar: boolean) => {
    if (!expediente) return
    setGuardando(true)
    try {
      await fetch('/api/compras?tipo=expediente', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expediente.id, datos09A }),
      })
      if (descargar) await generar09A(datos09A, `09A-Propuesta-autorizacion-gastos-${expediente.numero.replace('/', '-')}.pdf`)
      setAviso(descargar ? 'Impreso 09A generado y datos guardados.' : 'Datos del impreso guardados.')
      await abrirExpediente(expediente.id)
    } catch { setAviso('Error al generar el impreso') } finally { setGuardando(false) }
  }

  const generarPdf = async () => {
    if (!expediente) return
    await generarPropuestaGasto({
      numero: expediente.numero, ejercicio: expediente.ejercicio, titulo: expediente.titulo,
      objeto: form.objeto, justificacion: form.justificacion, propuestaGasto: form.propuestaGasto,
      informeTecnico: form.informeTecnico, tipoCompra: form.tipoCompra,
      partida: expediente.partida ? `${expediente.partida.codigo} — ${expediente.partida.denominacion}` : null,
      importeEstimado: form.importeEstimado ? parseFloat(form.importeEstimado) : null,
      importeAdjudicado: expediente.importeAdjudicado ? Number(expediente.importeAdjudicado) : null,
      numeroRC: form.numeroRC, plazoEntrega: form.plazoEntrega, solicitadoPor: expediente.solicitadoPor,
      destinatarioNombre: 'D. Luis Alberto Paniagua López', destinatarioCargo: 'Delegado de Economía y Hacienda',
      copiaNombre: 'Maria Irene Martínez Criado', copiaCargo: 'Dpto. de Intervención',
      firmanteNombre: 'Emilio Simón Gómez', firmanteCargo: 'Jefe de Protección Civil y Emergencias',
      lineas: (expediente.lineas || []).map((l: any) => ({
        descripcion: l.descripcion, cantidad: l.cantidad, unidad: l.unidad,
        precioUnitario: l.precioUnitario ? Number(l.precioUnitario) : null,
        importeTotal: l.importeTotal ? Number(l.importeTotal) : null,
      })),
      ofertas: (expediente.presupuestosProv || []).map((o: any) => ({
        proveedor: o.proveedor?.nombre || '', cif: o.proveedor?.cif,
        importe: Number(o.importe), iva: Number(o.iva), importeTotal: Number(o.importeTotal),
        adjudicada: o.estado === 'adjudicado',
      })),
    })
  }

  // Clasificación en columnas del pipeline.
  const columnas = useMemo(() => {
    const filtradas = peticiones.filter(p => {
      const t = `${p.numero} ${p.nombreArticulo} ${p.solicitante?.nombre || ''} ${p.areaOrigen || ''}`.toLowerCase()
      return (!busqueda || t.includes(busqueda.toLowerCase())) && (filtroArea === 'todas' || p.areaOrigen === filtroArea)
    })
    const res: Record<string, any[]> = { solicitada: [], expediente: [], aprobada: [], en_compra: [], recibida: [] }
    filtradas.forEach(p => {
      if (['rechazada', 'cancelada'].includes(p.estado)) return
      if (p.estado === 'pendiente') { p.expedienteCompra ? res.expediente.push(p) : res.solicitada.push(p); return }
      if (res[p.estado]) res[p.estado].push(p)
    })
    sueltos.forEach(e => res.expediente.push({ id: `exp-${e.id}`, suelto: true, expedienteCompra: e, nombreArticulo: e.titulo, numero: e.numero, prioridad: 'normal' }))
    return res
  }, [peticiones, sueltos, busqueda, filtroArea])

  const areas = useMemo(() => Array.from(new Set(peticiones.map(p => p.areaOrigen).filter(Boolean))), [peticiones])
  const alertasTotal = kpis ? Object.values(kpis.alertas || {}).reduce((s: number, n: any) => s + Number(n), 0) : 0
  // Compra directa: 1 oferta. El resto de modalidades exigen 3 presupuestos.
  const ofertasMin = (t?: string) => (!t || t === 'directa_menor500') ? 1 : 3

  // Edita una línea en el estado local; recalcula el importe al cambiar cantidad/precio.
  const editarLinea = (i: number, patch: any) => setLineas(prev => prev.map((l, idx) => {
    if (idx !== i) return l
    const nl = { ...l, ...patch }
    if ('cantidad' in patch || 'precioUnitario' in patch) {
      const c = parseFloat(String(nl.cantidad).replace(',', '.')) || 0
      const p = (nl.precioUnitario === '' || nl.precioUnitario === null || nl.precioUnitario === undefined)
        ? null : parseFloat(String(nl.precioUnitario).replace(',', '.'))
      if (p !== null && !Number.isNaN(p)) nl.importeTotal = +(c * p).toFixed(2)
    }
    return nl
  }))

  // Guarda una línea (unidades, precio unidad, importe) en el expediente.
  const guardarLinea = async (l: any) => {
    setGuardando(true)
    try {
      const r = await fetch('/api/compras?tipo=linea', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: l.id, descripcion: l.descripcion, unidad: l.unidad,
          cantidad: l.cantidad, precioUnitario: l.precioUnitario, importeTotal: l.importeTotal,
        }),
      })
      if (r.ok) { setAviso('Línea actualizada.'); await abrirExpediente(expediente.id); await cargar() }
      else setAviso('No se ha podido guardar la línea')
    } catch { setAviso('Error al guardar la línea') } finally { setGuardando(false) }
  }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
      <ShieldAlert className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">El área de Compras está reservada a coordinación y jefatura del servicio.</p>
    </div>
  )
  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /><p className="text-slate-500 font-medium">Cargando compras...</p></div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl flex-shrink-0"><ShoppingCart className="w-7 h-7 text-emerald-600" /></div>
          <div>
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide">GESTIÓN ECONÓMICA</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Compras</h1>
            <p className="text-sm text-slate-500 mt-1">Trazabilidad completa: petición, expediente, ofertas, adjudicación, recepción y factura.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option value="todas">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={cargar} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
        </div>
      </div>

      {aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-800">{aviso}</p>
          <button onClick={() => setAviso(null)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { l: 'Expedientes abiertos', v: kpis.abiertos, i: FolderOpen, c: 'text-violet-600 bg-violet-50' },
            { l: 'Peticiones pendientes', v: kpis.peticionesPendientes, i: Clock, c: 'text-amber-600 bg-amber-50' },
            { l: 'Comprometido', v: fmtEur(kpis.comprometido), i: Euro, c: 'text-blue-600 bg-blue-50' },
            { l: 'Facturado', v: fmtEur(kpis.facturado), i: Receipt, c: 'text-emerald-600 bg-emerald-50' },
            { l: 'Pendiente de facturar', v: fmtEur(kpis.pendienteFacturar), i: Truck, c: 'text-purple-600 bg-purple-50' },
            { l: 'Incidencias de gestión', v: alertasTotal, i: AlertTriangle, c: 'text-red-600 bg-red-50' },
          ].map(k => (
            <div key={k.l} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${k.c}`}><k.i className="w-5 h-5" /></div>
              <div className="min-w-0"><p className="text-lg font-bold text-slate-800 leading-tight truncate">{k.v}</p><p className="text-[11px] text-slate-500 mt-0.5">{k.l}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de gestión */}
      {kpis && alertasTotal > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle size={16} />Incidencias de gestión a resolver</p>
          <div className="flex flex-wrap gap-2">
            {[
              ['Sin informe técnico', kpis.alertas.sinInformeTecnico],
              ['Sin ofertas', kpis.alertas.sinPresupuestos],
              ['Ofertas insuficientes', kpis.alertas.ofertasInsuficientes],
              ['Sin retención de crédito', kpis.alertas.sinRetencionCredito],
              ['Sin partida asignada', kpis.alertas.sinPartida],
              ['Adjudicados sin factura', kpis.alertas.adjudicadosSinFactura],
              ['Facturas sin pagar', kpis.alertas.facturasPendientesPago],
            ].filter(([, n]) => Number(n) > 0).map(([l, n]) => (
              <span key={String(l)} className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-800">{l}: <strong>{String(n)}</strong></span>
            ))}
          </div>
          {(kpis.plazoMedioAprobacion !== null || kpis.plazoMedioEntrega !== null) && (
            <p className="text-xs text-amber-700 mt-2">
              Plazo medio de aprobación: <strong>{kpis.plazoMedioAprobacion ?? '—'} días</strong> · de entrega tras aprobar: <strong>{kpis.plazoMedioEntrega ?? '—'} días</strong>
            </p>
          )}
        </div>
      )}

      {/* PIPELINE */}
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <GripVertical size={13} />Arrastra una tarjeta de una columna a otra para avanzar o retroceder su estado. Todo movimiento queda registrado en la trazabilidad.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {COLUMNAS.map(col => {
          const items = columnas[col.id] || []
          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setColumnaDestino(col.id) }}
              onDragLeave={() => setColumnaDestino(c => c === col.id ? null : c)}
              onDrop={e => { e.preventDefault(); soltarEn(col.id) }}
              className={`rounded-xl border-t-4 ${col.color} p-3 min-h-[200px] transition-colors ${columnaDestino === col.id && arrastrando ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-slate-50'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5"><col.icon size={14} />{col.label}</p>
                <span className="px-1.5 py-0.5 bg-white rounded text-[11px] font-bold text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((p: any) => {
                  const exp = p.expedienteCompra
                  const nOfertas = exp?.presupuestosProv?.length || 0
                  const faltanOfertas = exp && nOfertas < ofertasMin(exp.tipoCompra)
                  return (
                    <div
                      key={p.id}
                      draggable={!p.suelto}
                      onDragStart={() => setArrastrando(p.id)}
                      onDragEnd={() => { setArrastrando(null); setColumnaDestino(null) }}
                      className={`bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-all ${!p.suelto ? 'cursor-grab active:cursor-grabbing' : ''} ${arrastrando === p.id ? 'opacity-40 scale-95' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          {!p.suelto && <GripVertical size={11} className="text-slate-300" />}{p.numero}
                        </span>
                        {p.prioridad && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORIDADES[p.prioridad] || PRIORIDADES.normal}`}>{p.prioridad}</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{p.nombreArticulo}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {p.suelto ? 'Expediente directo' : `${p.areaOrigen || '—'} · ${p.solicitante?.nombre || ''}`}
                        {p._count?.items ? ` · ${p._count.items} artículo(s)` : ''}
                      </p>

                      {exp && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${ESTADO_EXP[exp.estado]?.color || ESTADO_EXP.borrador.color}`}>{ESTADO_EXP[exp.estado]?.label || exp.estado}</span>
                            <span className="text-xs font-bold text-slate-700">{fmtEur(exp.importeAdjudicado ?? exp.importeEstimado)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {!exp.informeTecnico && !exp.documentoInforme && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-200">sin informe</span>}
                            {faltanOfertas && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{nOfertas}/{ofertasMin(exp.tipoCompra)} ofertas</span>}
                            {!exp.numeroRC && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200">sin RC</span>}
                            {exp.proveedor && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">{exp.proveedor.nombre}</span>}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => p.suelto ? abrirExpediente(exp.id) : abrirArchivador(p)}
                          disabled={guardando}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-[11px] font-semibold disabled:opacity-50"
                        >
                          <FolderOpen size={12} />{exp ? 'Expediente' : 'Abrir expediente'}
                        </button>
                        {!p.suelto && p.estado === 'pendiente' && (
                          <>
                            <button onClick={() => moverPeticion(p.id, 'aprobada')} title="Aprobar" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><CheckCircle2 size={14} /></button>
                            <button onClick={() => moverPeticion(p.id, 'rechazada')} title="Rechazar" className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><X size={14} /></button>
                          </>
                        )}
                        {!p.suelto && p.estado === 'aprobada' && (
                          <button onClick={() => moverPeticion(p.id, 'en_compra')} title="Pasar a compra" className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"><ShoppingCart size={14} /></button>
                        )}
                        {!p.suelto && p.estado === 'en_compra' && (
                          <button onClick={() => moverPeticion(p.id, 'recibida')} title="Marcar recibida" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Package size={14} /></button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && <p className="text-center text-xs text-slate-300 py-6">Sin registros</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* ARCHIVADOR / EXPEDIENTE */}
      {expedienteId && expediente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1200] p-4" onClick={() => { setExpedienteId(null); setExpediente(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-5 text-white flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 bg-white/20 rounded-xl shrink-0"><FolderOpen className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-white/80 font-mono">Expediente {expediente.numero} · ejercicio {expediente.ejercicio}</p>
                  <h3 className="text-lg font-bold leading-tight truncate">{expediente.titulo}</h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {ESTADO_EXP[expediente.estado]?.label} · estimado {fmtEur(expediente.importeEstimado)}
                    {expediente.importeAdjudicado ? ` · adjudicado ${fmtEur(expediente.importeAdjudicado)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={abrir09A} className="flex items-center gap-1.5 px-3 py-2 bg-white text-violet-700 hover:bg-violet-50 rounded-lg text-sm font-bold"><FileSpreadsheet size={15} />Impreso 09A</button>
                <button onClick={generarPdf} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium"><FileDown size={15} />Informe interno</button>
                <button onClick={() => { setExpedienteId(null); setExpediente(null) }} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="border-b border-slate-200 px-5 shrink-0">
              <nav className="flex gap-1 -mb-px overflow-x-auto">
                {[
                  { id: 'propuesta', label: 'Propuesta de gasto', icon: Euro },
                  { id: 'informe', label: 'Informe técnico', icon: FileText },
                  { id: 'ofertas', label: `Presupuestos (${expediente.presupuestosProv?.length || 0})`, icon: Award },
                  { id: 'facturas', label: `Facturas (${expediente.facturas?.length || 0})`, icon: Receipt },
                  { id: 'historial', label: 'Trazabilidad', icon: History },
                ].map(t => (
                  <button key={t.id} onClick={() => setTabExp(t.id as any)} className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tabExp === t.id ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <t.icon className="w-4 h-4" />{t.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* PROPUESTA DE GASTO */}
              {tabExp === 'propuesta' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Título del expediente</label>
                      <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Objeto del contrato</label>
                      <input value={form.objeto} onChange={e => setForm({ ...form, objeto: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Modalidad de compra</label>
                      <select value={form.tipoCompra} onChange={e => setForm({ ...form, tipoCompra: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                        {form.tipoCompra && !TIPOS_COMPRA[form.tipoCompra] && (
                          <option value={form.tipoCompra}>{etiquetaTipoCompra(form.tipoCompra)}</option>
                        )}
                        {Object.entries(TIPOS_COMPRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Partida presupuestaria</label>
                      <select value={form.partidaId} onChange={e => setForm({ ...form, partidaId: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                        <option value="">Sin asignar</option>
                        {maestros.partidas.map((p: any) => <option key={p.id} value={p.id}>{p.codigo} — {p.denominacion}</option>)}
                      </select></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Importe estimado (€)</label>
                      <input type="number" step="0.01" value={form.importeEstimado} onChange={e => setForm({ ...form, importeEstimado: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Plazo de entrega</label>
                      <input value={form.plazoEntrega} onChange={e => setForm({ ...form, plazoEntrega: e.target.value })} placeholder="Ej: 15 días desde la adjudicación" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Retención de crédito</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div><label className="block text-xs font-medium text-slate-600 mb-1">Nº de RC</label>
                        <input value={form.numeroRC} onChange={e => setForm({ ...form, numeroRC: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                      <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm cursor-pointer">
                        <input type="checkbox" checked={form.retencionCredito} onChange={e => setForm({ ...form, retencionCredito: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-violet-600" />
                        <span className="text-slate-700 font-medium">Crédito retenido</span>
                      </label>
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm cursor-pointer hover:bg-slate-50">
                        <Upload size={14} className="text-slate-500" />
                        <span className="text-slate-600">{expediente.documentoRC ? 'Sustituir RC' : 'Adjuntar RC'}</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumento('documentoRC', f); e.target.value = '' }} />
                      </label>
                    </div>
                    {expediente.documentoRC && <a href={expediente.documentoRC} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline mt-2 inline-block">Ver documento de retención de crédito</a>}
                  </div>

                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Justificación de la necesidad</label>
                    <textarea value={form.justificacion} onChange={e => setForm({ ...form, justificacion: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Propuesta de gasto</label>
                    <textarea value={form.propuestaGasto} onChange={e => setForm({ ...form, propuestaGasto: e.target.value })} rows={4} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>

                  {lineas.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <p className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide border-b border-slate-200">Detalle del suministro</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[11px] text-slate-500 uppercase tracking-wide bg-slate-50/60">
                              <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                              <th className="px-3 py-2 text-center font-semibold">Unidades</th>
                              <th className="px-3 py-2 text-center font-semibold">Unidad</th>
                              <th className="px-3 py-2 text-center font-semibold">Precio/ud (€)</th>
                              <th className="px-3 py-2 text-center font-semibold">Importe (€)</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {lineas.map((l: any, i: number) => (
                              <tr key={l.id}>
                                <td className="px-2 py-1.5">
                                  <input value={l.descripcion ?? ''} onChange={e => editarLinea(i, { descripcion: e.target.value })}
                                    className="w-full min-w-[140px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input type="number" step="0.001" value={l.cantidad ?? ''} onChange={e => editarLinea(i, { cantidad: e.target.value })}
                                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input value={l.unidad ?? ''} onChange={e => editarLinea(i, { unidad: e.target.value })}
                                    className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input type="number" step="0.0001" value={l.precioUnitario ?? ''} onChange={e => editarLinea(i, { precioUnitario: e.target.value })}
                                    className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input type="number" step="0.01" value={l.importeTotal ?? ''} onChange={e => editarLinea(i, { importeTotal: e.target.value })}
                                    className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-semibold" />
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <button onClick={() => guardarLinea(l)} disabled={guardando}
                                    className="px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg disabled:opacity-50">Guardar</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* INFORME TÉCNICO */}
              {tabExp === 'informe' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">El informe técnico motiva la necesidad y las características de lo que se compra. Es la pieza que justifica el gasto ante Intervención.</p>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Informe técnico</label>
                    <textarea value={form.informeTecnico} onChange={e => setForm({ ...form, informeTecnico: e.target.value })} rows={12} placeholder="Necesidad que se cubre, características técnicas exigidas, alternativas valoradas y motivación de la elección." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium cursor-pointer">
                      <Upload size={15} />{expediente.documentoInforme ? 'Sustituir informe firmado' : 'Adjuntar informe firmado'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumento('documentoInforme', f); e.target.value = '' }} />
                    </label>
                    {expediente.documentoInforme && <a href={expediente.documentoInforme} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 hover:underline">Ver documento adjunto</a>}
                  </div>
                </>
              )}

              {/* OFERTAS */}
              {tabExp === 'ofertas' && (
                <>
                  {expediente.presupuestosProv?.length < ofertasMin(expediente.tipoCompra) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">Esta modalidad requiere <strong>{ofertasMin(expediente.tipoCompra)} oferta(s)</strong> y hay {expediente.presupuestosProv?.length || 0}. Recaba las que faltan antes de adjudicar.</p>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        {['Proveedor', 'Base', 'IVA', 'Total', 'Documento', 'Acción'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {(expediente.presupuestosProv || []).map((o: any, i: number) => {
                          const esMasEconomica = i === 0
                          const adjudicada = o.estado === 'adjudicado'
                          return (
                            <tr key={o.id} className={adjudicada ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}>
                              <td className="px-3 py-2.5 text-center">
                                <p className="font-semibold text-slate-800">{o.proveedor?.nombre}</p>
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  {esMasEconomica && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">más económica</span>}
                                  {adjudicada && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">adjudicada</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">{fmtEur(o.importe)}</td>
                              <td className="px-3 py-2.5 text-center">{Number(o.iva)}%</td>
                              <td className="px-3 py-2.5 text-center font-bold whitespace-nowrap">{fmtEur(o.importeTotal)}</td>
                              <td className="px-3 py-2.5 text-center">
                                {o.documentoUrl
                                  ? <a href={o.documentoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline">Ver</a>
                                  : <label className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Adjuntar<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirDocumento('oferta', f, { presupuestoId: o.id }); e.target.value = '' }} /></label>}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {!adjudicada && <button onClick={() => adjudicar(o.id)} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">Adjudicar</button>}
                              </td>
                            </tr>
                          )
                        })}
                        {(!expediente.presupuestosProv || expediente.presupuestosProv.length === 0) && (
                          <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-sm">Sin ofertas registradas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Registrar oferta</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input list="proveedores-lista" value={nuevaOferta.proveedorNombre} onChange={e => setNuevaOferta({ ...nuevaOferta, proveedorNombre: e.target.value })} placeholder="Proveedor" className="px-3 py-2 border border-slate-200 rounded-lg text-sm md:col-span-2" />
                      <datalist id="proveedores-lista">{maestros.proveedores.map((p: any) => <option key={p.id} value={p.nombre} />)}</datalist>
                      <input type="number" step="0.01" value={nuevaOferta.importe} onChange={e => setNuevaOferta({ ...nuevaOferta, importe: e.target.value })} placeholder="Base imponible" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <div className="flex gap-2">
                        <input type="number" step="1" value={nuevaOferta.iva} onChange={e => setNuevaOferta({ ...nuevaOferta, iva: e.target.value })} placeholder="IVA %" className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        <button onClick={anadirOferta} disabled={guardando} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"><Plus size={15} />Añadir</button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* FACTURAS */}
              {tabExp === 'facturas' && (
                <>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        {['Nº factura', 'Fecha', 'Base', 'IVA', 'Total', 'Estado', 'Doc.'].map(h => <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {(expediente.facturas || []).map((f: any) => (
                          <tr key={f.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-slate-700">{f.numeroFactura}</td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">{fmtFecha(f.fechaFactura)}</td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">{fmtEur(f.importeBase)}</td>
                            <td className="px-3 py-2.5 text-center">{Number(f.iva)}%</td>
                            <td className="px-3 py-2.5 text-center font-bold whitespace-nowrap">{fmtEur(f.importeTotal)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <select
                                value={f.estado}
                                onChange={async e => { await fetch('/api/compras?tipo=factura', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, estado: e.target.value }) }); abrirExpediente(expediente.id); cargar() }}
                                className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
                              >
                                {['recibida', 'conformada', 'pagada', 'rechazada'].map(x => <option key={x} value={x}>{x}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {f.documentoUrl
                                ? <a href={f.documentoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline">Ver</a>
                                : <label className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Adjuntar<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) subirDocumento('factura', file, { facturaId: f.id }); e.target.value = '' }} /></label>}
                            </td>
                          </tr>
                        ))}
                        {(!expediente.facturas || expediente.facturas.length === 0) && (
                          <tr><td colSpan={7} className="text-center py-6 text-slate-400 text-sm">Sin facturas registradas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Registrar factura</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input value={nuevaFactura.numeroFactura} onChange={e => setNuevaFactura({ ...nuevaFactura, numeroFactura: e.target.value })} placeholder="Nº de factura" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <input type="date" value={nuevaFactura.fechaFactura || ''} onChange={e => setNuevaFactura({ ...nuevaFactura, fechaFactura: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <input type="number" step="0.01" value={nuevaFactura.importeBase} onChange={e => setNuevaFactura({ ...nuevaFactura, importeBase: e.target.value })} placeholder="Base imponible" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <div className="flex gap-2">
                        <input type="number" value={nuevaFactura.iva} onChange={e => setNuevaFactura({ ...nuevaFactura, iva: e.target.value })} className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        <button onClick={anadirFactura} disabled={guardando} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"><Plus size={15} />Añadir</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Estimado', expediente.importeEstimado],
                      ['Adjudicado', expediente.importeAdjudicado],
                      ['Facturado', expediente.importeFacturado],
                    ].map(([l, v]: any) => (
                      <div key={l} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-slate-500">{l}</p>
                        <p className="text-lg font-bold text-slate-800">{fmtEur(v)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* TRAZABILIDAD */}
              {tabExp === 'historial' && (
                <div className="space-y-2">
                  {expediente.peticion && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Petición de origen</p>
                      <p className="text-sm text-slate-700"><strong>{expediente.peticion.numero}</strong> · {expediente.peticion.nombreArticulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Solicitada el {fmtFecha(expediente.peticion.fechaSolicitud)} por {expediente.peticion.solicitante?.nombre} {expediente.peticion.solicitante?.apellidos} · estado {expediente.peticion.estado}
                      </p>
                    </div>
                  )}
                  {(expediente.historial || []).map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 border border-slate-200 rounded-xl p-3">
                      <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">{h.comentario}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {h.estadoAnterior ? `${h.estadoAnterior} → ` : ''}{h.estadoNuevo} · {fmtFecha(h.createdAt)} · {h.usuarioNombre || '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!expediente.historial || expediente.historial.length === 0) && <p className="text-center py-8 text-sm text-slate-400">Sin movimientos registrados</p>}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-slate-500">Los cambios de estado y los importes quedan registrados en la trazabilidad y en auditoría.</p>
              <div className="flex gap-2">
                <button onClick={() => { setExpedienteId(null); setExpediente(null) }} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cerrar</button>
                {(tabExp === 'propuesta' || tabExp === 'informe') && (
                  <button onClick={guardarExpediente} disabled={guardando} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
                    {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Guardar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPRESO OFICIAL 09A */}
      {show09A && expediente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1300] p-4" onClick={() => !guardando && setShow09A(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#c4d69b] p-5 flex items-start justify-between gap-4 shrink-0 border-b-2 border-[#9ab278]">
              <div>
                <p className="text-xs font-bold text-slate-700">ADMINISTRACIÓN ELECTRÓNICA BORMUJOS · impreso 09A</p>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">PROPUESTA de AUTORIZACIÓN de GASTOS</h3>
                <p className="text-xs text-slate-600 mt-0.5">Expediente {expediente.numero} · el PDF reproduce el modelo oficial</p>
              </div>
              <button onClick={() => setShow09A(false)} className="p-1.5 hover:bg-black/10 rounded-lg"><X className="w-5 h-5 text-slate-700" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {(() => {
                const campo = (k: keyof Datos09A, label: string, cols = 1, tipo = 'text') => (
                  <div key={k} className={cols === 3 ? 'md:col-span-3' : cols === 2 ? 'md:col-span-2' : ''}>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                    <input
                      type={tipo}
                      value={(datos09A[k] as any) ?? ''}
                      onChange={e => setDatos09A({ ...datos09A, [k]: e.target.value } as Datos09A)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ab278]/40"
                    />
                  </div>
                )
                const seccion = (titulo: string, contenido: React.ReactNode) => (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <p className="bg-[#d8e4bc] px-4 py-2 text-xs font-bold text-slate-800 uppercase tracking-wide">{titulo}</p>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">{contenido}</div>
                  </div>
                )
                return (
                  <>
                    {seccion('Datos del solicitante (empleado/a municipal)', <>
                      {campo('solNombre', 'Nombre')}
                      {campo('solApellido1', 'Primer apellido')}
                      {campo('solApellido2', 'Segundo apellido')}
                      {campo('solDelegacion', 'Delegación municipal / área / departamento', 3)}
                    </>)}

                    {seccion('Datos del proveedor', <>
                      <div className="md:col-span-3 flex items-center gap-6">
                        {(['fisica', 'juridica'] as const).map(t => (
                          <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" checked={datos09A.provTipoPersona === t} onChange={() => setDatos09A({ ...datos09A, provTipoPersona: t })} className="w-4 h-4 text-[#7d9a5a]" />
                            <span className="font-medium text-slate-700">Persona {t === 'fisica' ? 'física' : 'jurídica'}</span>
                          </label>
                        ))}
                      </div>
                      {campo('provTipoDoc', 'Documento de identificación')}
                      {campo('provNumDoc', 'Número de documento')}
                      {campo('provNombre', 'Nombre o razón social')}
                      {campo('provApellido1', 'Primer apellido')}
                      {campo('provApellido2', 'Segundo apellido')}
                    </>)}

                    {seccion('Persona de contacto', <>
                      {campo('contNombre', 'Nombre')}
                      {campo('contApellido1', 'Primer apellido')}
                      {campo('contApellido2', 'Segundo apellido')}
                      {campo('contTelefono', 'Teléfono de contacto')}
                      {campo('contEmail', 'Correo electrónico', 2)}
                    </>)}

                    {seccion('Domicilio social', <>
                      {campo('socCodVia', 'Código vía')}
                      {campo('socNombreVia', 'Nombre vía', 2)}
                      {campo('socNumero', 'Número vía')}
                      {campo('socLetra', 'Letra')}
                      {campo('socEscalera', 'Escalera')}
                      {campo('socPiso', 'Piso')}
                      {campo('socPuerta', 'Puerta')}
                      {campo('socTelefono', 'Teléfono')}
                      {campo('socMovil', 'Móvil')}
                      {campo('socEmail', 'Correo electrónico', 2)}
                      {campo('socProvincia', 'Provincia')}
                      {campo('socMunicipio', 'Municipio')}
                      {campo('socCP', 'Código postal')}
                    </>)}

                    <div className="flex justify-end">
                      <button
                        onClick={() => setDatos09A({
                          ...datos09A,
                          notCodVia: datos09A.socCodVia, notNombreVia: datos09A.socNombreVia, notNumero: datos09A.socNumero,
                          notLetra: datos09A.socLetra, notEscalera: datos09A.socEscalera, notPiso: datos09A.socPiso,
                          notPuerta: datos09A.socPuerta, notTelefono: datos09A.socTelefono, notMovil: datos09A.socMovil,
                          notEmail: datos09A.socEmail, notProvincia: datos09A.socProvincia, notMunicipio: datos09A.socMunicipio, notCP: datos09A.socCP,
                        })}
                        className="text-xs font-semibold text-violet-600 hover:underline"
                      >
                        Copiar el domicilio social al de notificación
                      </button>
                    </div>

                    {seccion('Domicilio de notificación', <>
                      {campo('notCodVia', 'Código vía')}
                      {campo('notNombreVia', 'Nombre vía', 2)}
                      {campo('notNumero', 'Número vía')}
                      {campo('notLetra', 'Letra')}
                      {campo('notEscalera', 'Escalera')}
                      {campo('notPiso', 'Piso')}
                      {campo('notPuerta', 'Puerta')}
                      {campo('notTelefono', 'Teléfono')}
                      {campo('notMovil', 'Móvil')}
                      {campo('notEmail', 'Correo electrónico', 2)}
                      {campo('notProvincia', 'Provincia')}
                      {campo('notMunicipio', 'Municipio')}
                      {campo('notCP', 'Código postal')}
                    </>)}

                    {seccion('Datos del gasto', <>
                      {campo('gasDelegacion', 'Delegación', 2)}
                      {campo('gasAreaGasto', 'Área de gasto')}
                      {campo('gasPartida', 'Partida presupuestaria', 2)}
                      {campo('gasObraPrograma', 'Obra o programa')}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Detalle del gasto (observaciones)</label>
                        <textarea
                          value={datos09A.gasDetalle}
                          onChange={e => setDatos09A({ ...datos09A, gasDetalle: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ab278]/40"
                        />
                      </div>
                      {campo('gasBase', 'Base imponible (€)', 1, 'number')}
                      {campo('gasIva', 'I.V.A. (valor en €)', 1, 'number')}
                      {campo('gasTotal', 'Importe total (€)', 1, 'number')}
                      <div className="md:col-span-3 flex justify-end">
                        <button
                          onClick={() => {
                            const b = parseFloat(String(datos09A.gasBase).replace(',', '.')) || 0
                            const i = parseFloat(String(datos09A.gasIva).replace(',', '.')) || 0
                            setDatos09A({ ...datos09A, gasTotal: String(+(b + i).toFixed(2)) })
                          }}
                          className="text-xs font-semibold text-violet-600 hover:underline"
                        >
                          Calcular el importe total (base + IVA)
                        </button>
                      </div>
                    </>)}

                    {seccion('Documentación adjunta requerida y fecha', <>
                      <label className="md:col-span-3 flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={datos09A.adjInforme} onChange={e => setDatos09A({ ...datos09A, adjInforme: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-[#7d9a5a]" />
                        <span className="text-slate-700">Informe justificativo emitido por empleado/a competente</span>
                      </label>
                      <label className="md:col-span-3 flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={datos09A.adjPresupuestos} onChange={e => setDatos09A({ ...datos09A, adjPresupuestos: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-[#7d9a5a]" />
                        <span className="text-slate-700">Presupuesto/s</span>
                      </label>
                      {campo('fecha', 'Fecha del documento', 1, 'date')}
                    </>)}
                  </>
                )
              })()}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-slate-500">Los datos quedan guardados en el expediente para futuras generaciones.</p>
              <div className="flex gap-2">
                <button onClick={() => setShow09A(false)} disabled={guardando} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50">Cerrar</button>
                <button onClick={() => guardar09A(false)} disabled={guardando} className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50">Guardar datos</button>
                <button onClick={() => guardar09A(true)} disabled={guardando} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#7d9a5a] hover:bg-[#6d8a4a] rounded-xl disabled:opacity-50">
                  {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}Generar impreso 09A
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
