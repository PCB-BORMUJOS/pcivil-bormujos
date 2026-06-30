'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePermisos } from '@/lib/permisos'
import {
  Plus, Search, Edit, Trash2, X, ChevronDown,
  BookOpen, Users, Clock, AlertTriangle, Shield,
  ClipboardList, CheckCircle2, RefreshCw, Settings, ZoomIn, FileText, Upload
} from 'lucide-react'
import ModalImportarPDF from '@/components/practicas/ModalImportarPDF'

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
  riesgoPractica: string; riesgoIntervencion?: string; riesgoObservaciones?: string
  duracionEstimada: number; nivel: string; prerequisitos?: string
  activa: boolean; createdAt: string
  youtubeUrl?: string; imagenes?: string[]
  grupo?: string; definicion?: string; lugarDesarrollo?: string
}


interface FamiliaPractica {
  id: string; nombre: string; slug: string; color: string; icono: string; orden: number
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
  const [familiasDinamicas, setFamiliasDinamicas] = useState<FamiliaPractica[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [showImportar, setShowImportar] = useState(false)
  const [nuevaFamiliaNombre, setNuevaFamiliaNombre] = useState('')
  const [nuevaFamiliaColor, setNuevaFamiliaColor] = useState('#f97316')
  const [guardandoFamilia, setGuardandoFamilia] = useState(false)
  const [errorNumero, setErrorNumero] = useState('')
  const [vistaActual, setVistaActual] = useState<'catalogo' | 'historial'>('catalogo')
  const [filtroHFamilia, setFiltroHFamilia] = useState('all')
  const [filtroHResultado, setFiltroHResultado] = useState('all')
  const [busquedaH, setBusquedaH] = useState('')

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
      setFamiliasDinamicas(data.familiasDinamicas || [])
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
      riesgoObservaciones: f.get('riesgoObservaciones'),
      duracionEstimada: f.get('duracionEstimada'),
      nivel: f.get('nivel'),
      prerequisitos: f.get('prerequisitos'),
      grupo: f.get('grupo'),
      definicion: f.get('definicion'),
      lugarDesarrollo: f.get('lugarDesarrollo'),
      youtubeUrl: f.get('youtubeUrl'),
    }
    const method = practicaEditando ? 'PUT' : 'POST'
    const res = await fetch('/api/practicas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setErrorNumero(data.error); return }
    setShowNueva(false)
    setPracticaEditando(null)
    setErrorNumero('')
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
        firmaResponsable: getFirmaImagen(firmaResp),
        firmaJefe: firmaJefe ? getFirmaImagen(firmaJefe) : null,
        firmaBiometricaResp: firmaResp.includes('||META:') ? firmaResp.split('||META:')[1] : null,
        firmaBiometricaJefe: firmaJefe && firmaJefe.includes('||META:') ? firmaJefe.split('||META:')[1] : null,
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
    const resRegs = await fetch('/api/practicas/registros')
    const dataRegs = await resRegs.json()
    setRegistros(dataRegs.registros || [])
    alert('Registro guardado correctamente')
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
    let lastX = 0, lastY = 0
    // Datos biométricos del Apple Pencil
    const biometricData: Array<{x:number,y:number,pressure:number,tiltX:number,tiltY:number,t:number}> = []

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const getPos = (e: PointerEvent | MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      if ('touches' in e && !('pointerId' in e)) {
        return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY, pressure: 0.5, tiltX: 0, tiltY: 0 }
      }
      const pe = e as PointerEvent
      return {
        x: (pe.clientX - rect.left) * scaleX,
        y: (pe.clientY - rect.top) * scaleY,
        pressure: pe.pressure > 0 ? pe.pressure : 0.5,
        tiltX: pe.tiltX || 0,
        tiltY: pe.tiltY || 0
      }
    }

    const down = (e: PointerEvent) => {
      drawing = true
      const p = getPos(e)
      lastX = p.x; lastY = p.y
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      biometricData.push({ x: p.x, y: p.y, pressure: p.pressure, tiltX: p.tiltX, tiltY: p.tiltY, t: Date.now() })
      e.preventDefault()
    }

    const move = (e: PointerEvent) => {
      if (!drawing) return
      const p = getPos(e)
      // Grosor variable según presión del Apple Pencil
      const lineWidth = Math.max(0.8, Math.min(4, p.pressure * 5))
      ctx.strokeStyle = `rgba(30,41,59,${0.7 + p.pressure * 0.3})`
      ctx.lineWidth = lineWidth
      // Curva suave entre puntos
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      const midX = (lastX + p.x) / 2
      const midY = (lastY + p.y) / 2
      ctx.quadraticCurveTo(lastX, lastY, midX, midY)
      ctx.stroke()
      lastX = p.x; lastY = p.y
      biometricData.push({ x: p.x, y: p.y, pressure: p.pressure, tiltX: p.tiltX, tiltY: p.tiltY, t: Date.now() })
      e.preventDefault()
    }

    const up = (e: PointerEvent) => {
      if (!drawing) return
      drawing = false
      const dataUrl = canvas.toDataURL('image/png', 0.95)
      // Guardar imagen + metadata biométrica en base64
      const meta = JSON.stringify({
        puntos: biometricData.length,
        presionMedia: biometricData.length > 0 ? (biometricData.reduce((a,b) => a + b.pressure, 0) / biometricData.length).toFixed(3) : 0,
        duracionMs: biometricData.length > 1 ? biometricData[biometricData.length-1].t - biometricData[0].t : 0,
        dispositivo: navigator.userAgent.includes('iPad') ? 'iPad' : 'otro',
        timestamp: new Date().toISOString()
      })
      setter(dataUrl + '||META:' + btoa(meta))
      e.preventDefault()
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.setPointerCapture && canvas.addEventListener('pointerdown', (e: Event) => {
      canvas.setPointerCapture((e as PointerEvent).pointerId)
    })
  }

  const limpiarFirma = (canvasId: string, setter: (v: string) => void) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setter('')
  }

  // Extraer solo la imagen base64 de la firma (sin metadata biométrica)
  const getFirmaImagen = (firma: string) => firma.split('||META:')[0]

  // Extraer metadata biométrica
  const getFirmaMetadata = (firma: string) => {
    const parts = firma.split('||META:')
    if (parts.length < 2) return null
    try { return JSON.parse(atob(parts[1])) } catch { return null }
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

  const { isAdmin, isJefeArea } = usePermisos()

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
          <button onClick={() => { setShowNueva(false); setPracticaEditando(null) }} aria-label="Cerrar">
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
                <label className={labelCls}>Número de práctica</label>
                <input name="numero" defaultValue={practicaEditando?.numero || ''}
                  placeholder="Ej: SOC-001, INC-005 (vacío = automático)"
                  className={`${inputCls} font-mono font-bold ${errorNumero ? 'border-red-400' : ''}`} />
                {errorNumero && <p className="text-xs text-red-600 mt-1">{errorNumero}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Dejar vacío para asignar automáticamente</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls} style={{marginBottom:0}}>Familia *</label>
                  <button type="button" onClick={() => setShowGestionFamilias(true)}
                    className="text-[10px] text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1">
                    <Settings size={10} /> Gestionar familias
                  </button>
                </div>
                <select name="familia" required defaultValue={practicaEditando?.familia || ''} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {(familiasDinamicas.length > 0 ? familiasDinamicas.map(f => ({id: f.slug, label: f.nombre})) : FAMILIAS).map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
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
                <label className={labelCls}>Riesgo de intervención <span className="font-normal normal-case text-slate-400">(no se tendrá en cuenta)</span></label>
                <input name="riesgoIntervencion" defaultValue={practicaEditando?.riesgoIntervencion || ''}
                  placeholder="Riesgos derivados de la intervención..." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Observaciones sobre el riesgo</label>
                <textarea name="riesgoObservaciones" rows={2}
                  defaultValue={practicaEditando?.riesgoObservaciones || ''}
                  placeholder="Describe factores de riesgo, medidas preventivas, condiciones de seguridad..."
                  className={inputCls} />
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
    <div className="min-h-screen" style={{background: '#f8fafc'}}>
      <div style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'}}>
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl" style={{background: 'linear-gradient(135deg, #f97316, #ea580c)'}}>
                <BookOpen size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Libro de Prácticas</h1>
                <p className="text-slate-400 text-sm mt-0.5">Protección Civil Bormujos · Catálogo operativo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={cargarDatos} className="p-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors">
                <RefreshCw size={16} className="text-slate-400" />
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setShowGestionFamilias(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-semibold transition-colors">
                    <Settings size={15} /> Familias
                  </button>
                  <button onClick={() => setShowImportar(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-semibold transition-colors">
                    <Upload size={15} /> Importar PDFs
                  </button>
                  <button onClick={() => { setPracticaEditando(null); setShowNueva(true) }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg" style={{background: 'linear-gradient(135deg, #f97316, #ea580c)'}}>
                    <Plus size={16} /> Nueva práctica
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Prácticas', value: practicas.length, color: '#f97316' },
              { label: 'Básico', value: practicas.filter(p => p.nivel === 'basico').length, color: '#22c55e' },
              { label: 'Intermedio', value: practicas.filter(p => p.nivel === 'intermedio').length, color: '#f59e0b' },
              { label: 'Avanzado', value: practicas.filter(p => p.nivel === 'avanzado').length, color: '#ef4444' },
              { label: 'Realizaciones', value: registros.length, color: '#a78bfa' },
              { label: 'Pend. firma', value: registros.filter(r => r.resultado === 'pendiente_jefe').length, color: '#94a3b8' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-4 border" style={{background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)'}}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{color: 'rgba(148,163,184,0.8)'}}>{k.label}</p>
                <p className="text-3xl font-black mt-1" style={{color: k.color}}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 flex gap-1 border-b border-white/10">
          {([{ id: 'catalogo', label: 'Catálogo' }, { id: 'historial', label: `Historial (${registros.length})` }] as const).map(t => (
            <button key={t.id} onClick={() => setVistaActual(t.id as 'catalogo' | 'historial')} className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${vistaActual === t.id ? 'text-white border-orange-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {vistaActual === 'catalogo' && <div className="px-8 py-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-72">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por título, número u objetivo..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 transition-all" />
              {searchTerm && <button onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
            </div>
            <select value={filtroFamilia} onChange={e => setFiltroFamilia(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-400 bg-white min-w-44">
              <option value="all">Todas las familias</option>
              {FAMILIAS.filter(f => practicas.some(p => p.familia === f.id)).map(f => (
                <option key={f.id} value={f.id}>{f.label} ({practicas.filter(p => p.familia === f.id).length})</option>
              ))}
            </select>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {[{id:'all',label:'Todos'},{id:'basico',label:'Básico'},{id:'intermedio',label:'Intermedio'},{id:'avanzado',label:'Avanzado'}].map(n => (
                <button key={n.id} onClick={() => setFiltroNivel(n.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroNivel === n.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{n.label}</button>
              ))}
            </div>
            <span className="text-sm text-slate-400 font-medium ml-auto">{practicasFiltradas.length} resultado{practicasFiltradas.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {filtroFamilia === 'all' && !searchTerm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-slate-800">Cobertura por familia</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium">{new Set(practicas.map(p => p.familia)).size} familias activas</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {FAMILIAS.map(fam => {
                const total = practicas.filter(p => p.familia === fam.id).length
                if (total === 0) return null
                const realizadas = new Set(registros.filter(r => { const prac = practicas.find(p => p.id === r.practicaId); return prac?.familia === fam.id }).map(r => r.practicaId)).size
                const pct = total > 0 ? Math.round((realizadas / total) * 100) : 0
                const isActive = filtroFamilia === fam.id
                return (
                  <button key={fam.id} onClick={() => setFiltroFamilia(isActive ? 'all' : fam.id)} className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${isActive ? 'border-orange-400 bg-orange-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${fam.color}`}>{fam.label.toUpperCase()}</span>
                      <span className="text-lg font-black text-slate-800">{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all duration-700" style={{width: pct + '%', background: pct === 100 ? '#22c55e' : pct > 60 ? '#f97316' : '#94a3b8'}} />
                    </div>
                    <p className="text-xs text-slate-500">{realizadas}/{total} realizadas</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={32} className="animate-spin text-orange-400" />
              <p className="text-slate-500 font-medium">Cargando prácticas...</p>
            </div>
          </div>
        ) : practicasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200">
            <BookOpen size={48} className="text-slate-200 mb-4" />
            <p className="text-lg font-bold text-slate-500">No se encontraron prácticas</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(porFamilia).map(([familia, pracs]) => {
              const familiaInfo = FAMILIAS.find(f => f.id === familia)
              return (
                <div key={familia}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-black border ${familiaInfo?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{familiaInfo?.label?.toUpperCase() || familia.toUpperCase()}</span>
                    <span className="text-sm text-slate-400 font-medium">{pracs.length} prácticas</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                  </div>
                  <div className="space-y-3">
                    {pracs.map(p => {
                      const isOpen = practicaExpandida === p.id
                      const nivelInfo = NIVELES.find(n => n.id === p.nivel)
                      const riesgoInfo = RIESGOS.find(r => r.id === p.riesgoPractica)
                      const nRegs = registros.filter(r => r.practicaId === p.id).length
                      return (
                        <div key={p.id} className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${isOpen ? 'border-orange-300 shadow-lg' : 'border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md'}`}>
                          <button onClick={() => setPracticaExpandida(isOpen ? null : p.id)} className="w-full text-left px-6 py-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start gap-5">
                              <div className="flex-shrink-0 pt-0.5">
                                <span className="font-mono text-sm font-black text-white px-3 py-1.5 rounded-xl" style={{background: '#1e293b'}}>{p.numero}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-black text-slate-900 leading-tight mb-1.5">{p.titulo}</h3>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {p.subfamilia && <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{p.subfamilia}</span>}
                                  {p.grupo && <span className="text-xs text-slate-400 italic">{p.grupo}</span>}
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{p.objetivo}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  {p.youtubeUrl && <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></span>}
                                  {(p.imagenes||[]).length > 0 && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">{(p.imagenes||[]).length} img</span>}
                                  {nRegs > 0 && <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-bold">✓{nRegs}</span>}
                                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${nivelInfo?.id === 'basico' ? 'bg-green-50 text-green-700 border border-green-200' : nivelInfo?.id === 'intermedio' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{nivelInfo?.label}</span>
                                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                  <span className="flex items-center gap-1.5 font-medium"><Clock size={14} className="text-slate-400" />{p.duracionEstimada} min</span>
                                  <span className="flex items-center gap-1.5 font-medium"><Users size={14} className="text-slate-400" />≥{p.personalMinimo}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="border-t-2 border-slate-100">
                              <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/80">
                                <div className="px-6 py-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Personal mínimo</p><p className="text-xl font-black text-slate-800">≥ {p.personalMinimo}</p></div>
                                <div className="px-6 py-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Duración estimada</p><p className="text-xl font-black text-slate-800">{p.duracionEstimada} min</p></div>
                                <div className="px-6 py-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Riesgo práctica</p><p className={`text-xl font-black ${riesgoInfo?.id === 'bajo' ? 'text-green-600' : riesgoInfo?.id === 'medio' ? 'text-amber-600' : 'text-red-600'}`}>{riesgoInfo?.label}</p></div>
                                <div className="px-6 py-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Nivel</p><p className={`text-xl font-black ${nivelInfo?.id === 'basico' ? 'text-green-600' : nivelInfo?.id === 'intermedio' ? 'text-amber-600' : 'text-red-600'}`}>{nivelInfo?.label}</p></div>
                              </div>
                              <div className="p-6 space-y-5">
                                {p.objetivo && <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5"><p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2">Objetivo</p><p className="text-base text-slate-800 leading-relaxed font-medium">{p.objetivo}</p></div>}
                                {(p.definicion || p.lugarDesarrollo) && (
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {p.definicion && <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Definición</p><p className="text-sm text-slate-700 leading-relaxed">{p.definicion}</p></div>}
                                    {p.lugarDesarrollo && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Lugar de desarrollo</p><p className="text-sm font-semibold text-slate-800">{p.lugarDesarrollo}</p></div>}
                                  </div>
                                )}
                                {p.descripcion && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Descripción</p><p className="text-sm text-slate-700 leading-relaxed">{p.descripcion}</p></div>}
                                {p.desarrollo && (
                                  <div className="rounded-2xl p-6 border border-slate-700" style={{background: 'linear-gradient(135deg, #0f172a, #1e293b)'}}>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Desarrollo de la práctica</p>
                                    <div className="space-y-2.5">
                                      {p.desarrollo.split('\n').filter(Boolean).map((linea, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                          <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black" style={{background: 'rgba(249,115,22,0.2)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)'}}>{i+1}</span>
                                          <p className="text-sm text-slate-200 leading-relaxed">{linea.replace(/^[-•]\s*/, '')}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {p.materialNecesario && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                      <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">Material necesario</p>
                                      <div className="space-y-2">
                                        {p.materialNecesario.split('\n').filter(Boolean).map((item, i) => (
                                          <div key={i} className="flex items-center gap-2.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                            <p className="text-sm text-slate-700">{item.replace(/^[-•]\s*/, '')}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-3">
                                    {riesgoInfo && (
                                      <div className={`rounded-2xl p-5 border ${riesgoInfo.id === 'bajo' ? 'bg-green-50 border-green-200' : riesgoInfo.id === 'medio' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${riesgoInfo.id === 'bajo' ? 'text-green-700' : riesgoInfo.id === 'medio' ? 'text-amber-700' : 'text-red-700'}`}>Riesgo de la práctica</p>
                                        <p className={`text-2xl font-black mb-2 ${riesgoInfo.id === 'bajo' ? 'text-green-700' : riesgoInfo.id === 'medio' ? 'text-amber-700' : 'text-red-700'}`}>{riesgoInfo.label}</p>
                                        {p.riesgoObservaciones && <p className="text-sm text-slate-700 leading-relaxed border-t border-slate-200 pt-2 mt-2">{p.riesgoObservaciones}</p>}
                                      </div>
                                    )}
                                    {p.riesgoIntervencion && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Riesgo intervención</p><p className="text-sm text-slate-600 leading-relaxed">{p.riesgoIntervencion}</p></div>}
                                  </div>
                                </div>
                                {p.conclusiones && (
                                  <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                                    <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">Conclusiones</p>
                                    <div className="space-y-2">
                                      {p.conclusiones.split('\n').filter(Boolean).map((linea, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                                          <p className="text-sm text-slate-700 leading-relaxed">{linea.replace(/^[-•]\s*/, '')}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {((p.imagenes || []).length > 0 || isAdmin) && (
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Imágenes</p>
                                      {isAdmin && (
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${subiendoImagen ? 'bg-slate-100 text-slate-400' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                          <Plus size={14} />{subiendoImagen ? 'Subiendo...' : 'Añadir imagen'}
                                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) subirImagenPractica(p.id, f) }} />
                                        </label>
                                      )}
                                    </div>
                                    {(p.imagenes || []).length === 0 ? (
                                      <div className="border-2 border-dashed border-slate-200 rounded-2xl py-10 text-center"><p className="text-sm text-slate-400">Sin imágenes. Añade fotos o diagramas.</p></div>
                                    ) : (
                                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {(p.imagenes || []).map((img, idx) => (
                                          <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 aspect-square cursor-zoom-in hover:border-orange-300 transition-all" onClick={() => setLightboxUrl(img)}>
                                            <img src={img} alt={`img ${idx+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                              <ZoomIn size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                            {isAdmin && <button onClick={e => { e.stopPropagation(); eliminarImagenPractica(p.id, img) }} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"><X size={12} /></button>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {p.youtubeUrl && <a href={p.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>Ver vídeo demostrativo en YouTube</a>}
                                <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => generarPDFPractica(p)} className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"><FileText size={15} />PDF Ficha</button>
                                    {isAdmin && <>
                                      <button onClick={() => { setPracticaEditando(p); setShowNueva(true) }} className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"><Edit size={15} />Editar</button>
                                      <button onClick={() => handleEliminar(p.id)} className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-100 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15} />Desactivar</button>
                                    </>}
                                  </div>
                                  <button onClick={() => { setPracticaParaRegistro(p); setShowRegistro(true); setPasoRegistro(1); setParticipantesSeleccionados([]); setFirmaResp(''); setFirmaJefe('') }} className="flex items-center gap-2 px-6 py-2.5 text-white font-black text-sm rounded-xl transition-all hover:scale-105 shadow-lg" style={{background: 'linear-gradient(135deg, #f97316, #ea580c)'}}><ClipboardList size={16} />Registrar realización</button>
                                </div>
                              </div>
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
      </div>}
      {vistaActual === 'historial' && (
        <div className="px-8 py-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busquedaH} onChange={e => setBusquedaH(e.target.value)} placeholder="Buscar por práctica..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 transition-all" />
              {busquedaH && <button onClick={() => setBusquedaH('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <select value={filtroHFamilia} onChange={e => setFiltroHFamilia(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-400 bg-white min-w-44">
              <option value="all">Todas las familias</option>
              {FAMILIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <select value={filtroHResultado} onChange={e => setFiltroHResultado(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-400 bg-white">
              <option value="all">Todos los resultados</option>
              <option value="completado">Completado</option>
              <option value="pendiente_jefe">Pendiente VB Jefe</option>
              <option value="parcial">Parcial</option>
            </select>
          </div>
          {(() => {
            const regs = registros
              .filter(r => filtroHFamilia === 'all' || r.practica?.familia === filtroHFamilia)
              .filter(r => filtroHResultado === 'all' || r.resultado === filtroHResultado)
              .filter(r => !busquedaH || r.practica?.titulo?.toLowerCase().includes(busquedaH.toLowerCase()) || r.practica?.numero?.toLowerCase().includes(busquedaH.toLowerCase()))
            if (regs.length === 0) return (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200">
                <ClipboardList size={48} className="text-slate-200 mb-4" />
                <p className="text-lg font-bold text-slate-500">No hay realizaciones registradas</p>
                <p className="text-sm text-slate-400 mt-1">Usa el botón "Registrar realización" en el Catálogo para añadir una</p>
              </div>
            )
            return (
              <div className="space-y-3">
                {regs.map(reg => {
                  const familiaInfo = FAMILIAS.find(f => f.id === reg.practica?.familia)
                  const turnoLabel = reg.turno === 'manana' ? 'Mañana' : reg.turno === 'tarde' ? 'Tarde' : 'Noche'
                  const fechaStr = new Date(reg.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  const horaStr = new Date(reg.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  const practicaFull = practicas.find(p => p.id === reg.practicaId)
                  return (
                    <div key={reg.id} className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 pt-0.5">
                          <span className="font-mono text-sm font-black text-white px-3 py-1.5 rounded-xl bg-slate-800">{reg.practica?.numero || '—'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <p className="text-sm font-black text-slate-800">{reg.practica?.titulo || 'Práctica'}</p>
                            {familiaInfo && <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${familiaInfo.color}`}>{familiaInfo.label}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span>{fechaStr} · {horaStr}</span>
                            <span>Turno {turnoLabel}</span>
                            {reg.duracionReal && <span>{reg.duracionReal} min</span>}
                            <span>{reg.participantes.length} participante/s</span>
                            {reg.responsable && <span>Resp: {reg.responsable.nombre} {reg.responsable.apellidos}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-full ${reg.resultado === 'completado' ? 'bg-green-100 text-green-700' : reg.resultado === 'pendiente_jefe' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {reg.resultado === 'completado' ? 'Completado' : reg.resultado === 'pendiente_jefe' ? 'Pend. VB Jefe' : 'Parcial'}
                          </span>
                          {practicaFull && (
                            <button onClick={() => generarPDFPractica(practicaFull, reg)} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                              <FileText size={13} />PDF
                            </button>
                          )}
                          {isAdmin && reg.resultado === 'pendiente_jefe' && (
                            <button onClick={() => setRegistroParaFirma(reg)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors">
                              Firmar VB
                            </button>
                          )}
                        </div>
                      </div>
                      {reg.observaciones && <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">{reg.observaciones}</p>}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
      {(showNueva || practicaEditando) && <FormularioPractica />}
      {showRegistro && practicaParaRegistro && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{background: 'linear-gradient(135deg, #0f172a, #1e293b)'}}>
              <div><h3 className="text-base font-black text-white">Registrar realización</h3><p className="text-xs text-slate-400 mt-0.5">{practicaParaRegistro.numero} — {practicaParaRegistro.titulo}</p></div>
              <button onClick={() => { setShowRegistro(false); setPracticaParaRegistro(null); setFirmaResp(''); setFirmaJefe(''); setPasoRegistro(1) }}><X size={20} className="text-slate-400 hover:text-white transition-colors" /></button>
            </div>
            <form onSubmit={handleGuardarRegistro} className="p-6 space-y-5">
              <div className="flex gap-3 mb-2">{[1,2,3].map(paso => <div key={paso} className={`flex-1 h-1.5 rounded-full transition-colors ${pasoRegistro >= paso ? 'bg-orange-500' : 'bg-slate-200'}`} />)}</div>
              {pasoRegistro === 1 && (
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Paso 1 — Datos de la realización</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>Turno *</label><select name="turno" required className={inputCls}><option value="manana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></div>
                    <div><label className={labelCls}>Duración real (min)</label><input name="duracionReal" type="number" defaultValue={practicaParaRegistro.duracionEstimada} className={inputCls} /></div>
                  </div>
                  <div><label className={labelCls}>Responsable del turno</label><select name="responsableId" className={inputCls}>{voluntarios.map(v => <option key={v.id} value={v.id}>{v.numeroVoluntario} — {v.nombre} {v.apellidos}</option>)}</select><input name="firmadoResponsableNombre" placeholder="Nombre completo del responsable" className={inputCls + ' mt-2'} /></div>
                  <div><label className={labelCls}>Resultado</label><select name="resultado" className={inputCls}><option value="completado">Completado</option><option value="parcial">Parcial</option><option value="pendiente_jefe">Pendiente VB Jefe</option></select></div>
                  <div><label className={labelCls}>Observaciones</label><textarea name="observaciones" rows={3} placeholder="Observaciones..." className={inputCls} /></div>
                  <div className="flex justify-end"><button type="button" onClick={() => setPasoRegistro(2)} className="px-6 py-2.5 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600">Siguiente → Participantes</button></div>
                </div>
              )}
              {pasoRegistro === 2 && (
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Paso 2 — Participantes</p>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    {voluntarios.map(v => (
                      <label key={v.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${participantesSeleccionados.includes(v.id) ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={participantesSeleccionados.includes(v.id)} onChange={e => { if (e.target.checked) setParticipantesSeleccionados(prev => [...prev, v.id]); else setParticipantesSeleccionados(prev => prev.filter(id => id !== v.id)) }} className="w-4 h-4 accent-orange-500" />
                        <span className="font-mono text-xs text-slate-400 w-14">{v.numeroVoluntario}</span>
                        <span className="text-sm font-medium text-slate-700">{v.nombre} {v.apellidos}</span>
                        {participantesSeleccionados.includes(v.id) && <CheckCircle2 size={15} className="text-orange-500 ml-auto" />}
                      </label>
                    ))}
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 text-sm text-orange-700 font-bold">{participantesSeleccionados.length} voluntario/s seleccionado/s</div>
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setPasoRegistro(1)} className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">← Volver</button>
                    <button type="button" onClick={() => setPasoRegistro(3)} className="px-6 py-2.5 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600">Siguiente → Firmas</button>
                  </div>
                </div>
              )}
              {pasoRegistro === 3 && (
                <div className="space-y-5">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Paso 3 — Firmas biométricas</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2"><label className={labelCls}>Firma responsable del turno *</label><button type="button" onClick={() => limpiarFirma('firmaRespCanvas', setFirmaResp)} className="text-xs text-red-500 hover:underline font-medium">Limpiar</button></div>
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden"><canvas id="firmaRespCanvas" width={560} height={160} className="w-full touch-none cursor-crosshair" ref={el => { if (el) iniciarFirma('firmaRespCanvas', setFirmaResp) }} /></div>
                      {firmaResp && <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-medium"><CheckCircle2 size={12} />Firma capturada</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2"><label className={labelCls}>Firma jefe de servicio (VB)</label><button type="button" onClick={() => limpiarFirma('firmaJefeCanvas', setFirmaJefe)} className="text-xs text-red-500 hover:underline font-medium">Limpiar</button></div>
                      <input name="firmadoJefeNombre" placeholder="Nombre del jefe de servicio" className={inputCls + ' mb-2'} />
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden"><canvas id="firmaJefeCanvas" width={560} height={160} className="w-full touch-none cursor-crosshair" ref={el => { if (el) iniciarFirma('firmaJefeCanvas', setFirmaJefe) }} /></div>
                      {firmaJefe && <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-medium"><CheckCircle2 size={12} />Firma capturada</p>}
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-slate-100">
                    <button type="button" onClick={() => setPasoRegistro(2)} className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">← Volver</button>
                    <button type="submit" disabled={saving || !firmaResp} className={`px-8 py-2.5 text-sm font-black rounded-xl transition-all ${firmaResp ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{saving ? 'Guardando...' : 'Guardar registro'}</button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b rounded-t-2xl" style={{background: 'linear-gradient(135deg, #0f172a, #1e293b)'}}>
              <div className="flex items-center gap-2"><Settings size={18} className="text-orange-400" /><h3 className="font-black text-white text-base">Gestionar Familias</h3></div>
              <button onClick={() => setShowGestionFamilias(false)}><X size={18} className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Familias activas ({familiasDinamicas.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {familiasDinamicas.length === 0 ? <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Sin familias dinámicas</p> : familiasDinamicas.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{backgroundColor: f.color}}>{f.nombre.substring(0,2).toUpperCase()}</div>
                      <div className="flex-1"><p className="text-sm font-bold text-slate-800">{f.nombre}</p><p className="text-xs text-slate-400">{practicas.filter(p => p.familia === f.slug).length} prácticas</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nueva familia</p>
                <input value={nuevaFamiliaNombre} onChange={e => setNuevaFamiliaNombre(e.target.value)} placeholder="Nombre de la familia..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-400 transition-colors" />
                <div><p className="text-xs text-slate-500 mb-2 font-medium">Color:</p><div className="flex gap-2 flex-wrap">{['#ef4444','#f97316','#f59e0b','#22c55e','#0d9488','#3b82f6','#6366f1','#ec4899','#8b5cf6','#64748b'].map(col => <button key={col} type="button" onClick={() => setNuevaFamiliaColor(col)} className={`w-8 h-8 rounded-xl transition-all hover:scale-110 ${nuevaFamiliaColor === col ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`} style={{backgroundColor: col}} />)}</div></div>
                <button onClick={async () => { if (!nuevaFamiliaNombre.trim()) return; setGuardandoFamilia(true); const res = await fetch('/api/practicas', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tipo: 'familia', nombre: nuevaFamiliaNombre.trim(), color: nuevaFamiliaColor, icono: 'BookOpen'}) }); if (res.ok) { setNuevaFamiliaNombre(''); setNuevaFamiliaColor('#f97316'); await cargarDatos() } setGuardandoFamilia(false) }} disabled={!nuevaFamiliaNombre.trim() || guardandoFamilia} className="w-full py-3 text-white text-sm font-black rounded-xl disabled:opacity-50 transition-colors" style={{background: 'linear-gradient(135deg, #f97316, #ea580c)'}}>
                  {guardandoFamilia ? 'Creando...' : '+ Añadir familia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.96)'}} onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-5 right-5 text-white rounded-full p-3 z-10 border border-white/20" style={{background: 'rgba(255,255,255,0.1)'}}><X size={22} /></button>
          <img src={lightboxUrl} alt="Imagen ampliada" className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <a href={lightboxUrl} download target="_blank" rel="noopener noreferrer" className="absolute bottom-5 right-5 flex items-center gap-2 text-white text-sm font-bold rounded-xl px-5 py-2.5 z-10 border border-white/20" style={{background: 'rgba(255,255,255,0.1)'}} onClick={e => e.stopPropagation()}>⬇ Descargar</a>
        </div>
      )}
      {showImportar && (
        <ModalImportarPDF
          onClose={() => setShowImportar(false)}
          onImportadas={() => { cargarDatos(); }}
        />
      )}
    </div>
  )
}
