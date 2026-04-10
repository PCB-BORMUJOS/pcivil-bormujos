'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Plus, Search, Edit, Trash2, X, ChevronDown,
  BookOpen, Users, Clock, AlertTriangle, Shield,
  ClipboardList, CheckCircle2, RefreshCw
} from 'lucide-react'

const FAMILIAS = [
  { id: 'socorrismo', label: 'Socorrismo', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'incendios', label: 'Incendios', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'rescate', label: 'Rescate', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'transmisiones', label: 'Transmisiones', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'drones', label: 'Drones/RPAS', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'pma', label: 'PMA', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'vehiculos', label: 'Vehículos', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const NIVELES = [
  { id: 'basico', label: 'Básico', color: 'bg-green-100 text-green-700' },
  { id: 'intermedio', label: 'Intermedio', color: 'bg-amber-100 text-amber-700' },
  { id: 'avanzado', label: 'Avanzado', color: 'bg-red-100 text-red-700' },
]

const RIESGOS = [
  { id: 'bajo', label: 'Bajo', color: 'text-green-600' },
  { id: 'medio', label: 'Medio', color: 'text-amber-600' },
  { id: 'alto', label: 'Alto', color: 'text-red-600' },
]

interface Practica {
  id: string; numero: string; titulo: string; familia: string
  subfamilia?: string; objetivo: string; descripcion?: string
  desarrollo?: string; conclusiones?: string
  personalMinimo: number; materialNecesario?: string
  riesgoPractica: string; riesgoIntervencion?: string
  duracionEstimada: number; nivel: string; prerequisitos?: string
  activa: boolean; createdAt: string
  youtubeUrl?: string; imagenes?: string[]
  grupo?: string; definicion?: string; lugarDesarrollo?: string
}


interface RegistroPractica {
  id: string; practicaId: string; fecha: string; turno: string
  duracionReal?: number; responsableId: string; participantes: string[]
  observaciones?: string; resultado: string
  firmaResponsable?: string; firmaJefe?: string
  firmadoResponsableNombre?: string; firmadoJefeNombre?: string
  firmaJefeTimestamp?: string; firmaJefeIp?: string
  practica?: { titulo: string; numero: string; familia: string }
  responsable?: { nombre: string; apellidos: string; numeroVoluntario: string }
}

interface Voluntario {
  id: string; nombre: string; apellidos: string; numeroVoluntario: string; email: string
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5"

function getFamiliaStyle(familia: string) {
  return FAMILIAS.find(f => f.id === familia)?.color || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function PracticasPage() {
  const { data: session } = useSession()
  const [practicas, setPracticas] = useState<Practica[]>([])
  const [familias, setFamilias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroFamilia, setFiltroFamilia] = useState('all')
  const [filtroNivel, setFiltroNivel] = useState('all')
  const [practicaExpandida, setPracticaExpandida] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [showRegistro, setShowRegistro] = useState(false)
  const [practicaParaRegistro, setPracticaParaRegistro] = useState<Practica | null>(null)
  const [registros, setRegistros] = useState<RegistroPractica[]>([])
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [participantesSeleccionados, setParticipantesSeleccionados] = useState<string[]>([])
  const [firmaResp, setFirmaResp] = useState<string>('')
  const [firmaJefe, setFirmaJefe] = useState<string>('')
  const [pasoRegistro, setPasoRegistro] = useState<1|2|3>(1)
  const [showFirmaJefe, setShowFirmaJefe] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [registroParaFirma, setRegistroParaFirma] = useState<RegistroPractica | null>(null)
  const [practicaEditando, setPracticaEditando] = useState<Practica | null>(null)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroFamilia !== 'all') params.set('familia', filtroFamilia)
      if (filtroNivel !== 'all') params.set('nivel', filtroNivel)
      if (searchTerm) params.set('busqueda', searchTerm)
      const res = await fetch(`/api/practicas?${params}`)
      const data = await res.json()
      setPracticas(data.practicas || [])
      setFamilias(data.familias || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const cargarVoluntarios = async () => {
    try {
      const res = await fetch('/api/admin/personal?roles=true')
      const data = await res.json()
      setVoluntarios(data.voluntarios || [])
    } catch (e) { console.error(e) }
  }

  const cargarRegistrosPractica = async (practicaId: string) => {
    try {
      const res = await fetch(`/api/practicas/registros?practicaId=${practicaId}`)
      const data = await res.json()
      setRegistros(data.registros || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    cargarDatos()
    cargarVoluntarios()
    const cargarTodosRegistros = async () => {
      try {
        const res = await fetch('/api/practicas/registros')
        const data = await res.json()
        setRegistros(data.registros || [])
      } catch(e) { console.error(e) }
    }
    cargarTodosRegistros()
  }, [filtroFamilia, filtroNivel])
  useEffect(() => {
    const t = setTimeout(() => cargarDatos(), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSaving(true)
    const body = {
      id: practicaEditando?.id,
      numero: f.get('numero'),
      titulo: f.get('titulo'),
      familia: f.get('familia'),
      subfamilia: f.get('subfamilia'),
      objetivo: f.get('objetivo'),
      descripcion: f.get('descripcion'),
      desarrollo: f.get('desarrollo'),
      conclusiones: f.get('conclusiones'),
      personalMinimo: f.get('personalMinimo'),
      materialNecesario: f.get('materialNecesario'),
      riesgoPractica: f.get('riesgoPractica'),
      riesgoIntervencion: f.get('riesgoIntervencion'),
      duracionEstimada: f.get('duracionEstimada'),
      nivel: f.get('nivel'),
      prerequisitos: f.get('prerequisitos'),
      grupo: f.get('grupo'),
      definicion: f.get('definicion'),
      lugarDesarrollo: f.get('lugarDesarrollo'),
      youtubeUrl: f.get('youtubeUrl'),
    }
    const method = practicaEditando ? 'PUT' : 'POST'
    await fetch('/api/practicas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowNueva(false)
    setPracticaEditando(null)
    cargarDatos()
  }

  const handleGuardarRegistro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!practicaParaRegistro) return
    const f = new FormData(e.currentTarget)
    if (!firmaResp) { alert('La firma del responsable es obligatoria'); return }
    setSaving(true)
    const userId = (session?.user as any)?.id
    await fetch('/api/practicas/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        practicaId: practicaParaRegistro.id,
        turno: f.get('turno'),
        duracionReal: f.get('duracionReal'),
        responsableId: f.get('responsableId') || userId,
        participantes: participantesSeleccionados,
        observaciones: f.get('observaciones'),
        resultado: f.get('resultado'),
        firmaResponsable: firmaResp,
        firmaJefe: firmaJefe || null,
        firmadoResponsableNombre: f.get('firmadoResponsableNombre'),
        firmadoJefeNombre: f.get('firmadoJefeNombre') || null,
      })
    })
    setSaving(false)
    setShowRegistro(false)
    setPracticaParaRegistro(null)
    setFirmaResp('')
    setFirmaJefe('')
    setParticipantesSeleccionados([])
    setPasoRegistro(1)
    alert('Registro guardado correctamente')
    // Ofrecer PDF automáticamente tras guardar
  }


  const subirImagenPractica = async (practicaId: string, file: File) => {
    setSubiendoImagen(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('practicaId', practicaId)
    const res = await fetch('/api/practicas/imagenes', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.imagenes) {
      setPracticas(prev => prev.map(p => p.id === practicaId ? { ...p, imagenes: data.imagenes } : p))
    }
    setSubiendoImagen(false)
  }

  const eliminarImagenPractica = async (practicaId: string, url: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return
    const res = await fetch('/api/practicas/imagenes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ practicaId, url })
    })
    const data = await res.json()
    if (data.imagenes) {
      setPracticas(prev => prev.map(p => p.id === practicaId ? { ...p, imagenes: data.imagenes } : p))
    }
  }

  const generarPDFPractica = async (practica: Practica, registro?: RegistroPractica) => {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210
    const margin = 15
    let y = 15

    const familiaLabel = FAMILIAS.find(f => f.id === practica.familia)?.label || practica.familia
    const nivelLabel = NIVELES.find(n => n.id === practica.nivel)?.label || practica.nivel
    const riesgoLabel = RIESGOS.find(r => r.id === practica.riesgoPractica)?.label || practica.riesgoPractica

    // ── CABECERA ──────────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('LIBRO DE PRÁCTICAS', margin, 10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Protección Civil Bormujos', margin, 16)
    doc.text('Servicio de Protección Civil · Ayuntamiento de Bormujos (Sevilla)', margin, 21)
    // Número práctica
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(practica.numero, W - margin - 30, 16, { align: 'right' })
    y = 35

    // ── IDENTIFICACIÓN ────────────────────────────────────────────────────
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, y, W - margin * 2, 8, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(practica.titulo, margin + 3, y + 5.5)
    y += 12

    // Chips familia / nivel / riesgo
    const chips = [
      { label: familiaLabel, bg: [236, 253, 245], fg: [6, 95, 70] },
      { label: nivelLabel, bg: [254, 252, 232], fg: [133, 77, 14] },
      { label: 'Riesgo: ' + riesgoLabel, bg: [254, 242, 242], fg: [153, 27, 27] },
      { label: 'Personal min: ' + practica.personalMinimo, bg: [239, 246, 255], fg: [29, 78, 216] },
      { label: 'Duracion: ' + practica.duracionEstimada + ' min', bg: [245, 243, 255], fg: [109, 40, 217] },
    ]
    let cx = margin
    chips.forEach(chip => {
      const tw = doc.getTextWidth(chip.label) + 6
      doc.setFillColor(chip.bg[0], chip.bg[1], chip.bg[2])
      doc.roundedRect(cx, y, tw, 6, 1.5, 1.5, 'F')
      doc.setTextColor(chip.fg[0], chip.fg[1], chip.fg[2])
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(chip.label, cx + 3, y + 4.2)
      cx += tw + 3
    })
    y += 10

    const seccion = (titulo: string) => {
      doc.setFillColor(226, 232, 240)
      doc.rect(margin, y, W - margin * 2, 6, 'F')
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(titulo.toUpperCase(), margin + 3, y + 4.2)
      y += 8
    }

    const bloque = (texto: string) => {
      doc.setTextColor(51, 65, 85)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(texto, W - margin * 2 - 4)
      lines.forEach((line: string) => {
        if (y > 265) { doc.addPage(); y = 20 }
        doc.text(line, margin + 3, y)
        y += 5
      })
      y += 3
    }

    // ── OBJETIVO ──────────────────────────────────────────────────────────
    seccion('Objetivo')
    bloque(practica.objetivo)

    // ── DESCRIPCIÓN ───────────────────────────────────────────────────────
    if (practica.descripcion) {
      seccion('Descripción')
      bloque(practica.descripcion)
    }

    // ── DESARROLLO ────────────────────────────────────────────────────────
    if (practica.desarrollo) {
      seccion('Desarrollo de la práctica')
      bloque(practica.desarrollo)
    }

    // ── MATERIAL ──────────────────────────────────────────────────────────
    if (practica.materialNecesario) {
      seccion('Material necesario')
      bloque(practica.materialNecesario)
    }

    // ── CONCLUSIONES ──────────────────────────────────────────────────────
    if (practica.conclusiones) {
      seccion('Conclusiones')
      bloque(practica.conclusiones)
    }

    // ── RIESGO INTERVENCIÓN ───────────────────────────────────────────────
    if (practica.riesgoIntervencion) {
      seccion('Riesgo de la intervención (no se tendrá en cuenta)')
      bloque(practica.riesgoIntervencion)
    }

    // ── REGISTRO DE REALIZACIÓN ───────────────────────────────────────────
    if (registro) {
      if (y > 200) { doc.addPage(); y = 20 }
      y += 5
      doc.setFillColor(20, 83, 45)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('REGISTRO DE REALIZACIÓN', margin + 3, y + 4.8)
      y += 10

      // Datos registro
      const turnoLabel = registro.turno === 'manana' ? 'Mañana' : registro.turno === 'tarde' ? 'Tarde' : 'Noche'
      const fecha = new Date(registro.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const hora = new Date(registro.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

      const datosReg = [
        ['Fecha', fecha],
        ['Hora', hora],
        ['Turno', turnoLabel],
        ['Duración real', registro.duracionReal ? registro.duracionReal + ' min' : 'No registrada'],
        ['Resultado', registro.resultado.toUpperCase()],
        ['Responsable', registro.firmadoResponsableNombre || (registro.responsable ? registro.responsable.nombre + ' ' + registro.responsable.apellidos : '-')],
      ]
      datosReg.forEach(([key, val]) => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text(key + ':', margin + 3, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 41, 59)
        doc.text(val, margin + 45, y)
        y += 5.5
      })

      // Observaciones
      if (registro.observaciones) {
        y += 2
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text('Observaciones:', margin + 3, y)
        y += 5
        bloque(registro.observaciones)
      }

      // Participantes
      if (registro.participantes && registro.participantes.length > 0) {
        y += 3
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text('Participantes (' + registro.participantes.length + '):', margin + 3, y)
        y += 5
        // Buscar nombres de participantes
        const nombresPartic = registro.participantes.map((id: string) => {
          const v = voluntarios.find(vol => vol.id === id)
          return v ? v.numeroVoluntario + ' — ' + v.nombre + ' ' + v.apellidos : id
        })
        nombresPartic.forEach((nombre: string) => {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(30, 41, 59)
          doc.text('• ' + nombre, margin + 6, y)
          y += 5
          if (y > 265) { doc.addPage(); y = 20 }
        })
      }

      // ── FIRMAS ────────────────────────────────────────────────────────
      if (registro.firmaResponsable || registro.firmaJefe) {
        if (y > 220) { doc.addPage(); y = 20 }
        y += 5
        doc.setFillColor(226, 232, 240)
        doc.rect(margin, y, W - margin * 2, 6, 'F')
        doc.setTextColor(30, 41, 59)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('FIRMAS', margin + 3, y + 4.2)
        y += 10

        const firmaW = (W - margin * 2 - 10) / 2
        // Firma responsable
        if (registro.firmaResponsable) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(71, 85, 105)
          doc.text('Responsable del turno:', margin + 3, y)
          if (registro.firmadoResponsableNombre) {
            doc.setFont('helvetica', 'normal')
            doc.text(registro.firmadoResponsableNombre, margin + 3, y + 4)
          }
          try {
            doc.addImage(registro.firmaResponsable, 'PNG', margin + 3, y + 6, firmaW - 6, 25)
          } catch(e) {}
          doc.rect(margin + 3, y + 6, firmaW - 6, 25)
        }
        // Firma jefe
        if (registro.firmaJefe) {
          const x2 = margin + firmaW + 10
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(71, 85, 105)
          doc.text('VB Jefe de Servicio:', x2, y)
          if (registro.firmadoJefeNombre) {
            doc.setFont('helvetica', 'normal')
            doc.text(registro.firmadoJefeNombre, x2, y + 4)
          }
          try {
            doc.addImage(registro.firmaJefe, 'PNG', x2, y + 6, firmaW - 6, 25)
          } catch(e) {}
          doc.rect(x2, y + 6, firmaW - 6, 25)
          // Sello de tiempo
          if (registro.firmaJefeTimestamp) {
            const ts = new Date(registro.firmaJefeTimestamp)
            const tsStr = ts.toLocaleDateString('es-ES') + ' ' + ts.toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})
            doc.setFillColor(240, 253, 244)
            doc.rect(x2, y + 32, firmaW - 6, 10, 'F')
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(22, 163, 74)
            doc.text('FIRMADO DIGITALMENTE', x2 + 2, y + 37)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(71, 85, 105)
            doc.text(tsStr, x2 + 2, y + 41)
            if (registro.firmaJefeIp) doc.text('IP: ' + registro.firmaJefeIp, x2 + 2, y + 45)
          }
        }
        y += 35
      }
    }

    // ── PIE DE PÁGINA ─────────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(241, 245, 249)
      doc.rect(0, 284, W, 13, 'F')
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Protección Civil Bormujos · info.pcivil@bormujos.net · www.proteccioncivilbormujos.es', margin, 290)
      doc.text('LDP ' + practica.numero + ' — Pag. ' + i + '/' + totalPages, W - margin, 290, { align: 'right' })
    }

    const filename = registro
      ? 'LDP-' + practica.numero + '-' + new Date(registro.fecha).toLocaleDateString('es-ES').split('/').join('-') + '.pdf'
      : 'LDP-' + practica.numero + '.pdf'
    doc.save(filename)
  }

  const iniciarFirma = (canvasId: string, setter: (v: string) => void) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let drawing = false
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    }
    const down = (e: MouseEvent | TouchEvent) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault() }
    const move = (e: MouseEvent | TouchEvent) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault() }
    const up = () => { drawing = false; setter(canvas.toDataURL()) }
    canvas.addEventListener('mousedown', down as EventListener)
    canvas.addEventListener('touchstart', down as EventListener, { passive: false })
    canvas.addEventListener('mousemove', move as EventListener)
    canvas.addEventListener('touchmove', move as EventListener, { passive: false })
    canvas.addEventListener('mouseup', up)
    canvas.addEventListener('touchend', up)
  }

  const limpiarFirma = (canvasId: string, setter: (v: string) => void) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setter('')
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Desactivar esta práctica?')) return
    await fetch(`/api/practicas?id=${id}`, { method: 'DELETE' })
    cargarDatos()
  }

  const practicasFiltradas = practicas.filter(p =>
    !searchTerm || p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const porFamilia = practicasFiltradas.reduce((acc, p) => {
    if (!acc[p.familia]) acc[p.familia] = []
    acc[p.familia].push(p)
    return acc
  }, {} as Record<string, Practica[]>)

  const isAdmin = ['superadministrador', 'superadmin', 'admin', 'coordinador'].includes(
    ((session?.user as any)?.rol || '').toLowerCase()
  )

  const FormularioPractica = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {practicaEditando ? `Editar — ${practicaEditando.numero}` : 'Nueva práctica'}
            </h3>
            <p className="text-xs text-slate-500">Ficha del Libro de Prácticas PCB</p>
          </div>
          <button onClick={() => { setShowNueva(false); setPracticaEditando(null) }}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleGuardar} className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BookOpen size={12} />Identificación
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Número (ej: SOC-001)</label>
                <input name="numero" defaultValue={practicaEditando?.numero || ''} placeholder="AUTO" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Familia *</label>
                <select name="familia" required defaultValue={practicaEditando?.familia || ''} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {FAMILIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Título *</label>
                <input name="titulo" required defaultValue={practicaEditando?.titulo || ''} placeholder="Ej: RCP en adulto con DEA" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Subfamilia</label>
                <input name="subfamilia" defaultValue={practicaEditando?.subfamilia || ''} placeholder="Ej: RCP, Inmovilización..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Grupo</label>
                <input name="grupo" defaultValue={practicaEditando?.grupo || ''} placeholder="Ej: Soporte Vital Básico, Rescate..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nivel</label>
                <select name="nivel" defaultValue={practicaEditando?.nivel || 'basico'} className={inputCls}>
                  {NIVELES.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lugar de desarrollo</label>
                <input name="lugarDesarrollo" defaultValue={practicaEditando?.lugarDesarrollo || ''} placeholder="Ej: Parque, Exterior, Gimnasio..." className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ClipboardList size={12} />Contenido
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Objetivo *</label>
                <textarea name="objetivo" required rows={2} defaultValue={practicaEditando?.objetivo || ''}
                  placeholder="¿Qué se pretende conseguir?" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Definición</label>
                <textarea name="definicion" rows={2} defaultValue={practicaEditando?.definicion || ''}
                  placeholder="Definición técnica de la práctica..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea name="descripcion" rows={3} defaultValue={practicaEditando?.descripcion || ''}
                  placeholder="Descripción general..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Desarrollo de la práctica</label>
                <textarea name="desarrollo" rows={6} defaultValue={practicaEditando?.desarrollo || ''}
                  placeholder="Pasos detallados para el desarrollo..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Conclusiones</label>
                <textarea name="conclusiones" rows={3} defaultValue={practicaEditando?.conclusiones || ''}
                  placeholder="Puntos clave a reforzar..." className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BookOpen size={12} />Multimedia
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>URL Vídeo YouTube</label>
                <input name="youtubeUrl" type="url" defaultValue={practicaEditando?.youtubeUrl || ''}
                  placeholder="https://www.youtube.com/watch?v=..." className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Enlace al vídeo de demostración en el canal privado de YouTube</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shield size={12} />Recursos y riesgos
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Personal mínimo</label>
                <input name="personalMinimo" type="number" min="1" defaultValue={practicaEditando?.personalMinimo || 2} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Duración estimada (min)</label>
                <input name="duracionEstimada" type="number" min="5" defaultValue={practicaEditando?.duracionEstimada || 30} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Material necesario</label>
                <textarea name="materialNecesario" rows={2} defaultValue={practicaEditando?.materialNecesario || ''}
                  placeholder="Material necesario..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Riesgo de la práctica</label>
                <select name="riesgoPractica" defaultValue={practicaEditando?.riesgoPractica || 'bajo'} className={inputCls}>
                  {RIESGOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Riesgo de intervención</label>
                <input name="riesgoIntervencion" defaultValue={practicaEditando?.riesgoIntervencion || ''}
                  placeholder="No se tendrá en cuenta..." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Prerequisitos</label>
                <input name="prerequisitos" defaultValue={practicaEditando?.prerequisitos || ''}
                  placeholder="Ej: SOC-001 completada" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowNueva(false); setPracticaEditando(null) }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Guardando...' : practicaEditando ? 'Guardar cambios' : 'Crear práctica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-orange-500" size={24} />Libro de Prácticas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Catálogo de prácticas operativas — Protección Civil Bormujos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarDatos} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
          {isAdmin && (
            <button onClick={() => setShowNueva(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm">
              <Plus size={16} />Nueva práctica
            </button>
          )}
        </div>
      </div>

      {/* Dashboard visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Total prácticas</p>
          <p className="text-3xl font-black mt-1">{practicas.length}</p>
          <p className="text-xs opacity-70 mt-1">{familias.length} familias</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Nivel básico</p>
          <p className="text-3xl font-black mt-1">{practicas.filter(p => p.nivel === 'basico').length}</p>
          <p className="text-xs opacity-70 mt-1">prácticas</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Nivel intermedio</p>
          <p className="text-3xl font-black mt-1">{practicas.filter(p => p.nivel === 'intermedio').length}</p>
          <p className="text-xs opacity-70 mt-1">prácticas</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Nivel avanzado</p>
          <p className="text-3xl font-black mt-1">{practicas.filter(p => p.nivel === 'avanzado').length}</p>
          <p className="text-xs opacity-70 mt-1">prácticas</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Registros totales</p>
          <p className="text-3xl font-black mt-1">{registros.length}</p>
          <p className="text-xs opacity-70 mt-1">realizaciones</p>
        </div>
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Pendientes VB</p>
          <p className="text-3xl font-black mt-1">{registros.filter(r => r.resultado === 'pendiente_jefe').length}</p>
          <p className="text-xs opacity-70 mt-1">sin firmar</p>
        </div>
      </div>

      {/* Cobertura por familia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-700 mb-4">Cobertura por familia</p>
          <div className="space-y-3">
            {FAMILIAS.map(fam => {
              const total = practicas.filter(p => p.familia === fam.id).length
              if (total === 0) return null
              const realizadas = new Set(registros.filter(r => {
                const prac = practicas.find(p => p.id === r.practicaId)
                return prac?.familia === fam.id
              }).map(r => r.practicaId)).size
              const pct = total > 0 ? Math.round((realizadas / total) * 100) : 0
              return (
                <div key={fam.id}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${fam.color}`}>{fam.label}</span>
                    <span className="text-slate-500 font-medium">{realizadas}/{total} realizadas — <span className="font-bold text-slate-700">{pct}%</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-700 mb-4">Últimas realizaciones</p>
          {registros.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin registros aún</p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {registros.slice(0, 8).map((reg: any) => {
                const prac = practicas.find(p => p.id === reg.practicaId)
                return (
                  <div key={reg.id} className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${reg.resultado === 'completado' ? 'bg-green-500' : reg.resultado === 'pendiente_jefe' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{prac?.titulo || reg.practicaId}</p>
                      <p className="text-[10px] text-slate-400">{new Date(reg.fecha).toLocaleDateString('es-ES')} · {reg.turno === 'manana' ? 'Mañana' : reg.turno === 'tarde' ? 'Tarde' : 'Noche'}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${reg.resultado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {reg.resultado === 'completado' ? 'OK' : 'VB'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, número u objetivo..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroFamilia('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroFamilia === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            Todas
          </button>
          {FAMILIAS.map(f => (
            <button key={f.id} onClick={() => setFiltroFamilia(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroFamilia === f.id ? f.color : 'bg-white text-slate-600 border-slate-200'}`}>
              {f.label}
              {familias.find((x: any) => x.familia === f.id) && (
                <span className="ml-1.5 opacity-70">{familias.find((x: any) => x.familia === f.id)?._count.id}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFiltroNivel('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroNivel === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            Todos los niveles
          </button>
          {NIVELES.map(n => (
            <button key={n.id} onClick={() => setFiltroNivel(n.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroNivel === n.id ? n.color + ' border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando prácticas...</div>
      ) : practicasFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <BookOpen size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No hay prácticas registradas</p>
          {isAdmin && (
            <button onClick={() => setShowNueva(true)} className="mt-3 text-orange-500 text-sm font-medium hover:underline">
              + Crear la primera práctica
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porFamilia).map(([familia, pracs]) => {
            const familiaInfo = FAMILIAS.find(f => f.id === familia)
            return (
              <div key={familia}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getFamiliaStyle(familia)}`}>
                    {familiaInfo?.label || familia.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">{pracs.length} práctica{pracs.length !== 1 ? 's' : ''}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <div className="space-y-2">
                  {pracs.map(p => {
                    const isOpen = practicaExpandida === p.id
                    const nivelInfo = NIVELES.find(n => n.id === p.nivel)
                    const riesgoInfo = RIESGOS.find(r => r.id === p.riesgoPractica)
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <button onClick={() => setPracticaExpandida(isOpen ? null : p.id)}
                          className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded shrink-0">{p.numero}</span>
                              <p className="font-semibold text-slate-800 text-sm truncate">{p.titulo}</p>
                              {p.subfamilia && <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded shrink-0">{p.subfamilia}</span>}
                              {p.youtubeUrl && (
                                <span title="Tiene vídeo YouTube" className="shrink-0">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                </span>
                              )}
                              {(p.imagenes || []).length > 0 && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-medium shrink-0">
                                  {(p.imagenes || []).length} img
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${nivelInfo?.color}`}>{nivelInfo?.label}</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock size={10} />{p.duracionEstimada}min</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400"><Users size={10} />≥{p.personalMinimo}</span>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                            <div className="bg-white rounded-lg p-3.5 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Objetivo</p>
                              <p className="text-sm text-slate-700">{p.objetivo}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Personal</p>
                                <p className="text-sm font-bold text-slate-800">≥ {p.personalMinimo}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Duración</p>
                                <p className="text-sm font-bold text-slate-800">{p.duracionEstimada} min</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Riesgo</p>
                                <p className={`text-sm font-bold ${riesgoInfo?.color}`}>{riesgoInfo?.label}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 mb-1">Nivel</p>
                                <p className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${nivelInfo?.color}`}>{nivelInfo?.label}</p>
                              </div>
                            </div>
                            {p.descripcion && <div className="bg-white rounded-lg p-3.5 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Descripción</p><p className="text-sm text-slate-600 whitespace-pre-line">{p.descripcion}</p></div>}
                            {p.desarrollo && <div className="bg-white rounded-lg p-3.5 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Desarrollo</p><p className="text-sm text-slate-600 whitespace-pre-line">{p.desarrollo}</p></div>}
                            {p.materialNecesario && <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100"><p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Material necesario</p><p className="text-sm text-slate-700">{p.materialNecesario}</p></div>}
                            {p.conclusiones && <div className="bg-green-50 rounded-lg p-3.5 border border-green-100"><p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">Conclusiones</p><p className="text-sm text-slate-700">{p.conclusiones}</p></div>}
                            {p.riesgoIntervencion && <div className="bg-slate-100 rounded-lg p-3 border border-slate-200 flex items-start gap-2"><AlertTriangle size={14} className="text-slate-500 shrink-0 mt-0.5" /><div><p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Riesgo de intervención (no se tendrá en cuenta)</p><p className="text-xs text-slate-600">{p.riesgoIntervencion}</p></div></div>}
                            {p.lugarDesarrollo && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-medium text-slate-400">Lugar:</span>
                                <span>{p.lugarDesarrollo}</span>
                              </div>
                            )}
                            {p.prerequisitos && <div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={12} /><span>Prerequisito: <span className="font-medium">{p.prerequisitos}</span></span></div>}
                            {/* Imágenes */}
                            {isAdmin && (
                              <div className="bg-white rounded-lg border border-slate-100 p-3.5">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Imágenes de la práctica</p>
                                  <label className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${subiendoImagen ? 'bg-slate-100 text-slate-400' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                    {subiendoImagen ? 'Subiendo...' : '+ Añadir imagen'}
                                    <input type="file" accept="image/*" className="hidden" disabled={subiendoImagen}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) subirImagenPractica(p.id, f) }} />
                                  </label>
                                </div>
                                {(p.imagenes || []).length === 0 ? (
                                  <p className="text-[10px] text-slate-400 text-center py-3">Sin imágenes. Añade fotos o diagramas de la práctica.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {(p.imagenes || []).map((img, idx) => (
                                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-100">
                                        <img src={img} alt={`Imagen ${idx+1}`} className="w-full h-28 object-cover" />
                                        <button onClick={() => eliminarImagenPractica(p.id, img)}
                                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {!isAdmin && (p.imagenes || []).length > 0 && (
                              <div className="bg-white rounded-lg border border-slate-100 p-3.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Imágenes</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {(p.imagenes || []).map((img, idx) => (
                                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-100">
                                      <img src={img} alt={`Imagen ${idx+1}`} className="w-full h-28 object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {p.youtubeUrl && (
                              <a href={p.youtubeUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                Ver vídeo en YouTube
                              </a>
                            )}
                            {/* Historial registros */}
                            {practicaExpandida === p.id && registros.filter(r => r.practicaId === p.id).length > 0 && (
                              <div className="bg-white rounded-lg border border-slate-100">
                                <div className="px-3.5 py-2.5 border-b border-slate-50 flex items-center justify-between">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Historial de realizaciones</p>
                                  <span className="text-[10px] text-slate-400">{registros.filter(r => r.practicaId === p.id).length} registro/s</span>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                                  {registros.filter(r => r.practicaId === p.id).map(reg => (
                                    <div key={reg.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-medium text-slate-700">{new Date(reg.fecha).toLocaleDateString('es-ES')}</span>
                                          <span className="text-[10px] text-slate-400">{reg.turno === 'manana' ? 'Mañana' : reg.turno === 'tarde' ? 'Tarde' : 'Noche'}</span>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reg.resultado === 'completado' ? 'bg-green-100 text-green-700' : reg.resultado === 'pendiente_jefe' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {reg.resultado === 'pendiente_jefe' ? 'Pendiente firma jefe' : reg.resultado}
                                          </span>
                                          <span className="text-[10px] text-slate-400">{reg.participantes?.length || 0} participantes</span>
                                        </div>
                                        {reg.firmadoResponsableNombre && <p className="text-[10px] text-slate-400 mt-0.5">Resp: {reg.firmadoResponsableNombre}</p>}
                                      </div>
                                      <div className="flex gap-1.5 shrink-0">
                                        {reg.resultado === 'pendiente_jefe' && isAdmin && (
                                          <button onClick={() => { setRegistroParaFirma(reg); setShowFirmaJefe(true) }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                                            Firmar VB
                                          </button>
                                        )}
                                        <button onClick={() => generarPDFPractica(p, reg)} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                                          PDF
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                              <button type="button" onClick={() => generarPDFPractica(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"><BookOpen size={12} />PDF plantilla</button>
                              <button onClick={() => { setPracticaParaRegistro(p); setShowRegistro(true); cargarRegistrosPractica(p.id) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"><ClipboardList size={12} />Registrar realización</button>
                            </div>
                            {isAdmin && (
                              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                <button onClick={() => handleEliminar(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50"><Trash2 size={12} />Desactivar</button>
                                <button onClick={() => setPracticaEditando(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50"><Edit size={12} />Editar</button>
                                <button onClick={() => { setPracticaParaRegistro(p); setShowRegistro(true); cargarRegistrosPractica(p.id) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"><ClipboardList size={12} />Registrar práctica</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}


      {showFirmaJefe && registroParaFirma && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-base font-bold text-slate-900">VB Jefe de Servicio</h3>
                <p className="text-xs text-slate-500">Firma de conformidad — {registroParaFirma.practica?.numero} {registroParaFirma.practica?.titulo}</p>
              </div>
              <button onClick={() => { setShowFirmaJefe(false); setRegistroParaFirma(null); setFirmaJefe('') }}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Fecha:</span><span className="font-medium">{new Date(registroParaFirma.fecha).toLocaleDateString('es-ES')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Turno:</span><span className="font-medium">{registroParaFirma.turno === 'manana' ? 'Mañana' : registroParaFirma.turno === 'tarde' ? 'Tarde' : 'Noche'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Responsable:</span><span className="font-medium">{registroParaFirma.firmadoResponsableNombre || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Participantes:</span><span className="font-medium">{registroParaFirma.participantes?.length || 0}</span></div>
              </div>
              <div>
                <label className={labelCls}>Nombre del Jefe de Servicio</label>
                <input id="jefeNombreInput" placeholder="Nombre completo" className={inputCls} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Firma VB *</label>
                  <button type="button" onClick={() => limpiarFirma('firmaJefeModalCanvas', setFirmaJefe)} className="text-[10px] text-red-500 hover:underline">Limpiar</button>
                </div>
                <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <canvas id="firmaJefeModalCanvas" width={480} height={150} className="w-full touch-none cursor-crosshair"
                    ref={el => { if (el) iniciarFirma('firmaJefeModalCanvas', setFirmaJefe) }} />
                </div>
                {firmaJefe && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={10} />Firma capturada</p>}
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <button onClick={() => { setShowFirmaJefe(false); setRegistroParaFirma(null); setFirmaJefe('') }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button disabled={!firmaJefe || saving} onClick={async () => {
                  if (!firmaJefe || !registroParaFirma) return
                  setSaving(true)
                  const nombre = (document.getElementById('jefeNombreInput') as HTMLInputElement)?.value || ''
                  await fetch('/api/practicas/registros', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: registroParaFirma.id, firmaJefe, firmadoJefeNombre: nombre })
                  })
                  setSaving(false)
                  setShowFirmaJefe(false)
                  setRegistroParaFirma(null)
                  setFirmaJefe('')
                  if (practicaExpandida) cargarRegistrosPractica(practicaExpandida)
                }} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${firmaJefe ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  {saving ? 'Firmando...' : 'Firmar y completar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegistro && practicaParaRegistro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registrar realización</h3>
                <p className="text-xs text-slate-500">{practicaParaRegistro.numero} — {practicaParaRegistro.titulo}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1,2,3].map(p => (
                    <div key={p} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${pasoRegistro === p ? 'bg-green-600 text-white' : pasoRegistro > p ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{p}</div>
                  ))}
                </div>
                <button onClick={() => { setShowRegistro(false); setPracticaParaRegistro(null); setFirmaResp(''); setFirmaJefe(''); setParticipantesSeleccionados([]); setPasoRegistro(1) }}><X size={18} className="text-slate-400" /></button>
              </div>
            </div>
            <form onSubmit={handleGuardarRegistro} className="p-5 space-y-4">
              {pasoRegistro === 1 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Paso 1 — Datos de la sesión</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Turno *</label>
                      <select name="turno" required className={inputCls}>
                        <option value="manana">Mañana</option>
                        <option value="tarde">Tarde</option>
                        <option value="noche">Noche</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Duración real (min)</label>
                      <input name="duracionReal" type="number" defaultValue={practicaParaRegistro.duracionEstimada} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Resultado</label>
                      <select name="resultado" className={inputCls}>
                        <option value="completado">Completado</option>
                        <option value="parcial">Parcial</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Responsable del turno</label>
                      <select name="responsableId" className={inputCls}>
                        {voluntarios.map(v => (
                          <option key={v.id} value={v.id}>{v.numeroVoluntario} — {v.nombre} {v.apellidos}</option>
                        ))}
                      </select>
                      <input name="firmadoResponsableNombre" placeholder="Nombre responsable" className={inputCls + ' mt-2'} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Observaciones</label>
                    <textarea name="observaciones" rows={3} placeholder="Observaciones sobre el desarrollo de la práctica..." className={inputCls} />
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setPasoRegistro(2)} className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700">Siguiente → Participantes</button>
                  </div>
                </div>
              )}
              {pasoRegistro === 2 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Paso 2 — Participantes</p>
                  <p className="text-xs text-slate-400">Selecciona los voluntarios que han participado en esta práctica</p>
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {voluntarios.map(v => (
                      <label key={v.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${participantesSeleccionados.includes(v.id) ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={participantesSeleccionados.includes(v.id)}
                          onChange={e => {
                            if (e.target.checked) setParticipantesSeleccionados(prev => [...prev, v.id])
                            else setParticipantesSeleccionados(prev => prev.filter(id => id !== v.id))
                          }} className="w-4 h-4 accent-green-600" />
                        <span className="font-mono text-xs text-slate-400 w-12">{v.numeroVoluntario}</span>
                        <span className="text-sm text-slate-700">{v.nombre} {v.apellidos}</span>
                        {participantesSeleccionados.includes(v.id) && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
                      </label>
                    ))}
                  </div>
                  <div className="bg-green-50 rounded-lg px-4 py-2 text-xs text-green-700 font-medium">
                    {participantesSeleccionados.length} voluntario/s seleccionado/s
                  </div>
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setPasoRegistro(1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">← Volver</button>
                    <button type="button" onClick={() => setPasoRegistro(3)} className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700">Siguiente → Firmas</button>
                  </div>
                </div>
              )}
              {pasoRegistro === 3 && (
                <div className="space-y-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Paso 3 — Firmas biométricas</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls}>Firma responsable del turno *</label>
                        <button type="button" onClick={() => limpiarFirma('firmaRespCanvas', setFirmaResp)} className="text-[10px] text-red-500 hover:underline">Limpiar</button>
                      </div>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                        <canvas id="firmaRespCanvas" width={560} height={160} className="w-full touch-none cursor-crosshair"
                          ref={el => { if (el) iniciarFirma('firmaRespCanvas', setFirmaResp) }} />
                      </div>
                      {firmaResp && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={10} />Firma capturada</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls}>Firma jefe de servicio (VB)</label>
                        <button type="button" onClick={() => limpiarFirma('firmaJefeCanvas', setFirmaJefe)} className="text-[10px] text-red-500 hover:underline">Limpiar</button>
                      </div>
                      <input name="firmadoJefeNombre" placeholder="Nombre del jefe de servicio" className={inputCls + ' mb-2'} />
                      <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                        <canvas id="firmaJefeCanvas" width={560} height={160} className="w-full touch-none cursor-crosshair"
                          ref={el => { if (el) iniciarFirma('firmaJefeCanvas', setFirmaJefe) }} />
                      </div>
                      {firmaJefe && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={10} />Firma capturada</p>}
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setPasoRegistro(2)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">← Volver</button>
                    <button type="submit" disabled={saving || !firmaResp} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${firmaResp ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {saving ? 'Guardando...' : 'Guardar registro'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {(showNueva || practicaEditando) && <FormularioPractica />}
    </div>
  )
}