// Modelo oficial 09A del Ayuntamiento de Bormujos:
// PROPUESTA de AUTORIZACIÓN de GASTOS.
// Reproduce el formulario original campo a campo, relleno con los datos del
// expediente de compra.

import { cargarImagen } from '@/lib/pdf-corporativo'

const W = 210
const M = 12                 // margen lateral
const ANCHO = W - M * 2      // 186 mm útiles

// Paleta del impreso original.
const VERDE_TITULO: [number, number, number] = [196, 214, 155]
const VERDE_ETIQUETA: [number, number, number] = [216, 228, 188]
const VERDE_09A: [number, number, number] = [223, 233, 207]
const BORDE: [number, number, number] = [154, 178, 120]
const TEXTO: [number, number, number] = [0, 0, 0]

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

/** jsPDF con fuentes estándar: se transliteran los acentos conflictivos. */
const t = (s: any) => String(s ?? '')
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I')
  .replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[’‘]/g, "'")

const eur = (n?: number | null) => (n === null || n === undefined || n === ('' as any))
  ? ''
  : Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface Datos09A {
  // Solicitante
  solNombre: string; solApellido1: string; solApellido2: string; solDelegacion: string
  // Proveedor
  provTipoPersona: 'fisica' | 'juridica'
  provTipoDoc: string; provNumDoc: string; provNombre: string; provApellido1: string; provApellido2: string
  // Persona de contacto
  contNombre: string; contApellido1: string; contApellido2: string; contTelefono: string; contEmail: string
  // Domicilio social
  socCodVia: string; socNombreVia: string; socNumero: string; socLetra: string; socEscalera: string
  socPiso: string; socPuerta: string; socTelefono: string; socMovil: string; socEmail: string
  socProvincia: string; socMunicipio: string; socCP: string
  // Domicilio de notificación
  notCodVia: string; notNombreVia: string; notNumero: string; notLetra: string; notEscalera: string
  notPiso: string; notPuerta: string; notTelefono: string; notMovil: string; notEmail: string
  notProvincia: string; notMunicipio: string; notCP: string
  // Datos del gasto
  gasDelegacion: string; gasAreaGasto: string; gasPartida: string; gasObraPrograma: string
  gasDetalle: string; gasBase: string; gasIva: string; gasTotal: string
  // Documentación adjunta
  adjInforme: boolean; adjPresupuestos: boolean
  // Fecha del documento
  fecha: string // AAAA-MM-DD
}

export const DATOS_09A_VACIOS: Datos09A = {
  solNombre: '', solApellido1: '', solApellido2: '', solDelegacion: '12 Policía Local/Protección Civil',
  provTipoPersona: 'juridica', provTipoDoc: 'C.I.F.', provNumDoc: '', provNombre: '', provApellido1: '', provApellido2: '',
  contNombre: '', contApellido1: '', contApellido2: '', contTelefono: '', contEmail: '',
  socCodVia: 'CALLE', socNombreVia: '', socNumero: '', socLetra: '', socEscalera: '', socPiso: '', socPuerta: '',
  socTelefono: '', socMovil: '', socEmail: '', socProvincia: '', socMunicipio: '', socCP: '',
  notCodVia: 'CALLE', notNombreVia: '', notNumero: '', notLetra: '', notEscalera: '', notPiso: '', notPuerta: '',
  notTelefono: '', notMovil: '', notEmail: '', notProvincia: '', notMunicipio: '', notCP: '',
  gasDelegacion: '12 Policía Local/Protección Civil', gasAreaGasto: '', gasPartida: '', gasObraPrograma: '',
  gasDetalle: '', gasBase: '', gasIva: '', gasTotal: '',
  adjInforme: true, adjPresupuestos: true,
  fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }),
}

export async function generar09A(d: Datos09A, nombreArchivo = 'Propuesta-autorizacion-gastos-09A.pdf') {
  const escudo = await cargarImagen('/images/logo-ayuntamiento-bormujos.png')

  const { jsPDF } = await import('jspdf')
  const doc = new (jsPDF as any)({ format: 'a4', unit: 'mm', compress: true })

  let y = 12

  // ── Cabecera ────────────────────────────────────────────────────────────────
  if (escudo) {
    const h = 14
    const w = h * (escudo.w / escudo.h)
    try { doc.addImage(escudo.dataUrl, 'PNG', M, y, w, h) } catch { /* noop */ }
  }
  doc.setTextColor(...TEXTO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('ADMINISTRACION ELECTRONICA BORMUJOS', M + 26, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.6)
  doc.text('Pza. de Andalucia s/n 41930 Bormujos (Sevilla)   C.I.F. P4101700E', M + 26, y + 9)
  doc.text('Tfno. cent.: 955 724571 / Fax: 955 724582   www.bormujos.es', M + 26, y + 12)

  doc.setTextColor(...VERDE_09A)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(34)
  doc.text('09A', W - M, y + 12, { align: 'right' })
  doc.setTextColor(...TEXTO)

  y += 20

  // ── Título ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13.5)
  doc.text('PROPUESTA de AUTORIZACION de GASTOS', M, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text('Sr./Sra. Alcalde/sa-Presidente/a del Excmo. Ayuntamiento de Bormujos', M, y)
  y += 5

  // ── Utilidades de dibujo del impreso ────────────────────────────────────────
  doc.setLineWidth(0.2)

  /** Banda con texto, en verde de título. */
  const banda = (texto: string, alto = 6.5, size = 9.5) => {
    doc.setFillColor(...VERDE_TITULO)
    doc.setDrawColor(...BORDE)
    doc.rect(M, y, ANCHO, alto, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(...TEXTO)
    doc.text(t(texto), M + 2, y + alto - 2)
    y += alto
  }

  /** Fila de celdas: cada celda lleva su ancho, texto, si es etiqueta y su tamaño. */
  interface Celda { w: number; texto: string; etiqueta?: boolean; size?: number; alto?: number; multilinea?: boolean }
  const fila = (celdas: Celda[], alto = 5) => {
    let x = M
    doc.setDrawColor(...BORDE)
    celdas.forEach(c => {
      doc.setFillColor(...(c.etiqueta ? VERDE_ETIQUETA : [255, 255, 255] as [number, number, number]))
      doc.rect(x, y, c.w, alto, 'FD')
      doc.setFont('helvetica', c.etiqueta ? 'bold' : 'normal')
      doc.setFontSize(c.size ?? (c.etiqueta ? 6.8 : 8.5))
      doc.setTextColor(...TEXTO)
      if (c.texto) {
        if (c.multilinea) {
          const lineas = doc.splitTextToSize(t(c.texto), c.w - 3)
          doc.text(lineas.slice(0, Math.floor((alto - 1.5) / 3.4)), x + 1.5, y + 3.4)
        } else {
          const linea = doc.splitTextToSize(t(c.texto), c.w - 3)[0] || ''
          doc.text(linea, x + 1.5, y + alto - 1.7)
        }
      }
      x += c.w
    })
    y += alto
  }

  /** Par etiqueta / valor con los mismos anchos. */
  const parFilas = (etiquetas: [string, number][], valores: string[]) => {
    fila(etiquetas.map(([texto, w]) => ({ w, texto, etiqueta: true })), 4.6)
    fila(etiquetas.map(([, w], i) => ({ w, texto: valores[i] || '' })), 6)
  }

  /** Casilla de verificación del impreso. */
  const casilla = (x: number, yy: number, marcada: boolean, lado = 3.4) => {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(x, yy, lado, lado)
    if (marcada) {
      doc.setLineWidth(0.5)
      doc.line(x + 0.7, yy + lado / 2, x + lado / 2 - 0.1, yy + lado - 0.7)
      doc.line(x + lado / 2 - 0.1, yy + lado - 0.7, x + lado - 0.6, yy + 0.7)
      doc.setLineWidth(0.2)
    }
    doc.setDrawColor(...BORDE)
    doc.setLineWidth(0.2)
  }

  // ── Delegación destinataria ─────────────────────────────────────────────────
  banda('Ante la DELEGACION de ECONOMIA y HACIENDA', 7, 10)
  y += 1.2

  // ── Datos del solicitante ───────────────────────────────────────────────────
  banda('DATOS del SOLICITANTE (empleado/a municipal)', 6, 9)
  parFilas([['Nombre', 62], ['Primer apellido', 62], ['Segundo apellido', 62]],
    [d.solNombre, d.solApellido1, d.solApellido2])
  parFilas([['Delegacion Municipal / Area / Departamento', ANCHO]], [d.solDelegacion])
  y += 1.2

  // ── Datos del proveedor ─────────────────────────────────────────────────────
  const yBanda = y
  doc.setFillColor(...VERDE_TITULO)
  doc.setDrawColor(...BORDE)
  doc.rect(M, y, ANCHO, 6.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...TEXTO)
  doc.text('DATOS del PROVEEDOR', M + 2, y + 4.6)
  doc.setFontSize(7.5)
  doc.text('Persona Fisica', M + 104, y + 4.4)
  casilla(M + 126, yBanda + 1.5, d.provTipoPersona === 'fisica')
  doc.text('Persona Juridica', M + 140, y + 4.4)
  casilla(M + 166, yBanda + 1.5, d.provTipoPersona === 'juridica')
  y += 6.5

  parFilas([['Documento de identificacion', 56], ['Numero de documento', 45], ['Nombre', 85]],
    [d.provTipoDoc, d.provNumDoc, d.provNombre])
  parFilas([['Primer apellido', 93], ['Segundo apellido', 93]], [d.provApellido1, d.provApellido2])
  y += 1.2

  // ── Persona de contacto ─────────────────────────────────────────────────────
  banda('PERSONA de CONTACTO', 6, 9)
  parFilas([['Nombre', 62], ['Primer apellido', 62], ['Segundo apellido', 62]],
    [d.contNombre, d.contApellido1, d.contApellido2])
  fila([
    { w: 46, texto: 'Telefono de contacto', etiqueta: true },
    { w: 47, texto: d.contTelefono },
    { w: 40, texto: 'Correo electronico', etiqueta: true },
    { w: 53, texto: d.contEmail },
  ], 6)
  y += 1.2

  // ── Domicilios ──────────────────────────────────────────────────────────────
  const domicilio = (titulo: string, p: {
    codVia: string; nombreVia: string; numero: string; letra: string; escalera: string; piso: string; puerta: string
    telefono: string; movil: string; email: string; provincia: string; municipio: string; cp: string
  }) => {
    banda(titulo, 6, 9)
    parFilas([['Codigo via (calle/avenida/...)', 46], ['Nombre via', 140]], [p.codVia, p.nombreVia])
    parFilas([['Numero via', 37.2], ['Letra', 37.2], ['Escalera', 37.2], ['Piso', 37.2], ['Puerta', 37.2]],
      [p.numero, p.letra, p.escalera, p.piso, p.puerta])
    parFilas([['Telefono', 46], ['Movil', 46], ['Correo electronico', 94]], [p.telefono, p.movil, p.email])
    parFilas([['Provincia', 46], ['Municipio', 94], ['Codigo Postal', 46]], [p.provincia, p.municipio, p.cp])
    y += 1.2
  }
  domicilio('DOMICILIO SOCIAL', {
    codVia: d.socCodVia, nombreVia: d.socNombreVia, numero: d.socNumero, letra: d.socLetra,
    escalera: d.socEscalera, piso: d.socPiso, puerta: d.socPuerta, telefono: d.socTelefono,
    movil: d.socMovil, email: d.socEmail, provincia: d.socProvincia, municipio: d.socMunicipio, cp: d.socCP,
  })
  domicilio('DOMICILIO de NOTIFICACION', {
    codVia: d.notCodVia, nombreVia: d.notNombreVia, numero: d.notNumero, letra: d.notLetra,
    escalera: d.notEscalera, piso: d.notPiso, puerta: d.notPuerta, telefono: d.notTelefono,
    movil: d.notMovil, email: d.notEmail, provincia: d.notProvincia, municipio: d.notMunicipio, cp: d.notCP,
  })

  // ── Datos del gasto ─────────────────────────────────────────────────────────
  banda('DATOS del GASTO', 6, 9)
  fila([
    { w: 46, texto: 'Delegacion', etiqueta: true },
    { w: 70, texto: d.gasDelegacion },
    { w: 35, texto: 'Area de gasto', etiqueta: true },
    { w: 35, texto: d.gasAreaGasto },
  ], 6)
  fila([
    { w: 46, texto: 'Partida presupuestaria', etiqueta: true },
    { w: 70, texto: d.gasPartida },
    { w: 35, texto: 'Obra o programa', etiqueta: true },
    { w: 35, texto: d.gasObraPrograma },
  ], 6)
  fila([
    { w: 46, texto: 'Detalle del gasto (observaciones)', etiqueta: true, multilinea: true },
    { w: 140, texto: d.gasDetalle, multilinea: true },
  ], 22)
  fila([
    { w: 46, texto: 'Base imponible', etiqueta: true },
    { w: 40, texto: eur(d.gasBase as any) },
    { w: 30, texto: 'I.V.A (valor)', etiqueta: true },
    { w: 30, texto: eur(d.gasIva as any) },
    { w: 25, texto: 'Importe total', etiqueta: true },
    { w: 15, texto: eur(d.gasTotal as any) },
  ], 6)
  y += 1.2

  // ── Documentación adjunta ───────────────────────────────────────────────────
  banda('DOCUMENTACION ADJUNTA REQUERIDA', 6, 9)
  const filaCheck = (texto: string, marcada: boolean) => {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...BORDE)
    doc.rect(M, y, ANCHO, 6, 'FD')
    casilla(M + 3, y + 1.3, marcada)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.setTextColor(...TEXTO)
    doc.text(t(texto), M + 12, y + 4.2)
    y += 6
  }
  filaCheck('INFORME JUSTIFICATIVO EMITIDO por EMPLEADO/a COMPETENTE', d.adjInforme)
  filaCheck('PRESUPUESTO/s', d.adjPresupuestos)

  // ── Fecha y firma ───────────────────────────────────────────────────────────
  y += 7
  const f = d.fecha ? new Date(d.fecha + 'T12:00:00') : new Date()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXTO)
  doc.text('En Bormujos, a', M + 4, y)
  doc.setTextColor(0, 51, 102)
  doc.text(String(f.getDate()), M + 30, y)
  doc.setTextColor(...TEXTO)
  doc.text('de', M + 36, y)
  doc.setTextColor(0, 51, 102)
  doc.text(MESES[f.getMonth()], M + 43, y)
  doc.setTextColor(...TEXTO)
  doc.text('de', M + 70, y)
  doc.setTextColor(0, 51, 102)
  doc.text(String(f.getFullYear()), M + 77, y)
  doc.setTextColor(...TEXTO)

  y += 5
  doc.setFontSize(8)
  doc.text('Firmado (visto bueno)', W / 2, y, { align: 'center' })
  doc.text('el/la Concejal/a Delegado/a:', W / 2, y + 3.6, { align: 'center' })

  doc.save(nombreArchivo)
}
