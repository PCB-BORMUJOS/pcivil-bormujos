import jsPDF from 'jspdf'
import { LOGO_BASE64 } from '@/lib/logo-data'
import { AYTO_LOGO_BASE64 } from '@/lib/footer-data'
import {
    EXTINTOR_ABC_CHECKS, EXTINTOR_CO2_CHECKS, GAS_IZQ, GAS_DER, DOC_IZQ, DOC_DER,
    ELECTRICA, EVACUACION, type PrfDatos, type ValorCheck, type ItemCheck,
} from '@/lib/prf-campos'

const AZUL: [number, number, number] = [40, 54, 102]
const NARANJA: [number, number, number] = [255, 122, 0]
const GRIS_TXT: [number, number, number] = [15, 23, 42]
const GRIS_BORDE: [number, number, number] = [203, 213, 225]
const GRIS_BG: [number, number, number] = [241, 245, 249]
const GRIS_LABEL: [number, number, number] = [100, 116, 139]

const W = 210, H = 297, M = 8, CW = W - M * 2

interface PrfPdfInput {
    numeroParte: string
    datos: PrfDatos
    fotos: { reportaje: string[]; zonaNoble: string[]; zonaCocina: string[]; extintorAbc: string[]; extintorCo2: string[] }
    firmas: { informa1?: string; informa2?: string; jefe?: string; tomador?: string }
}

async function urlADataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url); const blob = await res.blob()
        return await new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result as string); fr.onerror = () => r(null); fr.readAsDataURL(blob) })
    } catch { return null }
}

export async function generarPrfPDF(input: PrfPdfInput): Promise<jsPDF> {
    const { numeroParte, datos, fotos, firmas } = input
    const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true })

    // Pre-cargar todas las fotos a dataURL
    const cache: Record<string, string | null> = {}
    const todas = [...fotos.reportaje, ...fotos.zonaNoble, ...fotos.zonaCocina, ...fotos.extintorAbc, ...fotos.extintorCo2].filter(Boolean)
    await Promise.all(todas.map(async u => { cache[u] = await urlADataUrl(u) }))
    const img = (u?: string) => (u && cache[u]) || null

    // ── Helpers ──
    const rect = (x: number, y: number, w: number, h: number, fill?: [number, number, number], borde?: [number, number, number]) => {
        if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, 'F') }
        if (borde) { doc.setDrawColor(...borde); doc.setLineWidth(0.3); doc.rect(x, y, w, h, 'S') }
    }
    const txt = (t: string, x: number, y: number, o?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }) => {
        const { size = 8, bold = false, color = GRIS_TXT, align = 'left' } = o || {}
        doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color)
        doc.text(t || '', x, y, { align })
    }
    // Campo con etiqueta y valor sobre línea inferior
    const campo = (label: string, valor: string, x: number, y: number, w: number) => {
        txt(label.toUpperCase(), x, y, { size: 6, bold: true, color: GRIS_LABEL })
        doc.setDrawColor(...GRIS_BORDE); doc.setLineWidth(0.3); doc.line(x, y + 6, x + w, y + 6)
        txt(valor || '', x, y + 5, { size: 8.5 })
    }
    // Cabecera de página (barra azul)
    const cabecera = () => {
        rect(0, 0, W, 24, AZUL)
        txt('PRF', M, 14, { size: 26, bold: true, color: [255, 255, 255] })
        txt('PARTE DE', M + 26, 10, { size: 9, bold: true, color: [255, 255, 255] })
        txt('REVISIÓN FERIA', M + 26, 15, { size: 9, bold: true, color: [255, 255, 255] })
        try { doc.addImage(LOGO_BASE64, 'PNG', W - 62, 5, 13, 13) } catch { /* logo opcional */ }
        txt('PROTECCIÓN CIVIL', W - M, 10.5, { size: 9, bold: true, color: [255, 255, 255], align: 'right' })
        txt('BORMUJOS', W - M, 15.5, { size: 11, bold: true, color: [255, 255, 255], align: 'right' })
    }
    const pie = () => {
        rect(0, H - 20, W, 20, AZUL)
        try { doc.addImage(AYTO_LOGO_BASE64, 'PNG', M, H - 16, 12, 12) } catch { /* opcional */ }
        txt('Servicio de Protección Civil · Ayuntamiento de Bormujos (Sevilla)', W / 2, H - 12, { size: 7, bold: true, color: [255, 255, 255], align: 'center' })
        txt('Calle Maestro Francisco Rodriguez | Avda Universidad de Salamanca', W / 2, H - 8.5, { size: 6.5, color: [220, 226, 240], align: 'center' })
        txt('info.pcivil@bormujos.net | www.proteccioncivilbormujos.es', W / 2, H - 5, { size: 6.5, color: [220, 226, 240], align: 'center' })
        try { doc.addImage(LOGO_BASE64, 'PNG', W - 20, H - 16, 11, 11) } catch { /* opcional */ }
    }
    // Cabecera de sección (barra azul con número)
    const seccion = (n: string, titulo: string, y: number, extra?: string, color = AZUL): number => {
        rect(M, y, CW, 6, color)
        if (n) txt(n, M + 2, y + 4, { size: 7, bold: true, color: [180, 190, 215] })
        txt(titulo.toUpperCase(), M + (n ? 9 : 3), y + 4, { size: 8, bold: true, color: [255, 255, 255] })
        if (extra) txt(extra.toUpperCase(), W - M - 2, y + 4, { size: 6.5, bold: true, color: [200, 208, 228], align: 'right' })
        return y + 6
    }
    // Fila de check con casillas SÍ/NO/N.A.
    const checkFila = (item: ItemCheck, valor: ValorCheck, x: number, y: number, w: number): number => {
        txt(item.label, x, y + 3, { size: 8 })
        const bx = x + w - 33
        const casillas: { v: ValorCheck; cx: number }[] = [{ v: 'si', cx: bx }, { v: 'no', cx: bx + 11 }, { v: 'na', cx: bx + 22 }]
        casillas.forEach(c => {
            const sel = valor === c.v
            rect(c.cx, y, 4, 4, sel ? AZUL : [255, 255, 255], GRIS_BORDE)
            if (sel) { doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.line(c.cx + 0.8, y + 2, c.cx + 1.7, y + 3); doc.line(c.cx + 1.7, y + 3, c.cx + 3.2, y + 0.9) }
        })
        doc.setDrawColor(...[236, 240, 245] as [number, number, number]); doc.setLineWidth(0.2); doc.line(x, y + 4.6, x + w - 34, y + 4.6)
        return y + 5.2
    }
    const cabeceraChecks = (x: number, y: number, w: number) => {
        const bx = x + w - 33
        txt('SÍ', bx + 2, y, { size: 5.5, bold: true, color: GRIS_LABEL, align: 'center' })
        txt('NO', bx + 13, y, { size: 5.5, bold: true, color: GRIS_LABEL, align: 'center' })
        txt('N.A.', bx + 24, y, { size: 5.5, bold: true, color: GRIS_LABEL, align: 'center' })
    }
    const c = (k: string) => (datos.checks?.[k] || '') as ValorCheck

    // ── Foto en caja con marco discontinuo ──
    const foto = (u: string | undefined, etiqueta: string, x: number, y: number, w: number, h: number) => {
        rect(x, y, w, h, GRIS_BG)
        doc.setDrawColor(...GRIS_BORDE); doc.setLineWidth(0.3); doc.setLineDashPattern([1, 1], 0); doc.rect(x, y, w, h, 'S'); doc.setLineDashPattern([], 0)
        const d = img(u)
        if (d) { try { doc.addImage(d, 'JPEG', x + 0.5, y + 0.5, w - 1, h - 1, undefined, 'FAST') } catch { /* */ } }
        else txt(etiqueta, x + w / 2, y + h / 2, { size: 7.5, color: GRIS_LABEL, align: 'center' })
    }

    // ══════════════ PÁGINA 1 ══════════════
    cabecera()
    let y = 30
    txt('ACTA DE INSPECCIÓN DE SEGURIDAD Y PREVENCIÓN DE INCENDIOS EN CASETA DE FERIA', M, y, { size: 8, bold: true, color: AZUL })
    campo('Expediente Nº', datos.expediente, W - M - 55, y - 4, 55)
    doc.setDrawColor(...NARANJA); doc.setLineWidth(0.5); doc.line(M, y + 2, W - M, y + 2)
    y += 6
    const col5 = (CW - 8) / 5
    const fila = [['Fecha', datos.fecha], ['Hora de inicio', datos.horaInicio], ['Hora de fin', datos.horaFin], ['Indicativo que informa', datos.indicativoInforma], ['Equipo', datos.equipo]]
    fila.forEach((f, i) => campo(f[0], f[1], M + i * (col5 + 2), y, col5))
    y += 12
    campo('Policía Local · TIP Nº 1', datos.policiaTip1, M, y, col5 * 2)
    campo('Policía Local · TIP Nº 2', datos.policiaTip2, M + col5 * 2 + 4, y, col5 * 2)
    txt('EJEMPLAR DEL ACTA', M + col5 * 4 + 8, y, { size: 6, bold: true, color: GRIS_LABEL })
    const ejs: [string, string][] = [['titular', 'TITULAR'], ['servicio', 'SERVICIO'], ['policia_local', 'POLICÍA LOCAL']]
    let ex = M + col5 * 4 + 8
    ejs.forEach(([k, lbl]) => { const sel = datos.ejemplar === k; rect(ex, y + 2.5, 3.5, 3.5, sel ? AZUL : [255, 255, 255], GRIS_BORDE); txt(lbl, ex + 5, y + 5.3, { size: 6 }); ex += doc.getTextWidth(lbl) * 0.9 + 9 })
    y += 12

    // Intro
    const intro = 'Acta levantada por personal del Servicio de Protección Civil del Ayuntamiento de Bormujos en el ejercicio de las funciones de comprobación previa a la apertura de casetas de feria. Se verifican las condiciones exigibles conforme al RD 2816/1982, el RD 513/2017, el RD 919/2006, el RD 842/2002 (REBT) y la Ley 13/1999 de Espectáculos Públicos y Actividades Recreativas de Andalucía, así como la Ordenanza municipal de Feria. Marque SÍ únicamente cuando el requisito se cumple; N.A. cuando no resulte de aplicación.'
    rect(M, y, CW, 14, GRIS_BG); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS_LABEL)
    doc.text(doc.splitTextToSize(intro, CW - 6), M + 3, y + 3.5)
    y += 17

    // 01 Datos caseta
    y = seccion('01', 'Datos de la caseta', y)
    rect(M, y, CW, 20, [255, 255, 255], GRIS_BORDE)
    campo('Nombre de la caseta', datos.nombreCaseta, M + 3, y + 3, 90)
    campo('Nº de caseta', datos.numeroCaseta, M + 100, y + 3, 40)
    const modTxt = datos.modulos === 'otros' ? `Otros: ${datos.modulosOtros} m²` : datos.modulos ? `${datos.modulos} módulo(s)` : ''
    campo('Superficie en módulos', modTxt, M + 145, y + 3, CW - 148)
    campo('Calle o sector del real', datos.calleSector, M + 3, y + 12, 90)
    campo('Localidad', datos.localidad, M + 100, y + 12, 45)
    campo('Aforo autorizado', datos.aforo, M + 148, y + 12, CW - 151)
    y += 23

    // 02 + 03
    const half = (CW - 4) / 2
    const y02 = seccion('02', 'Datos del tomador o responsable', y)
    rect(M, y02, half, 27, [255, 255, 255], GRIS_BORDE)
    campo('Nombre y apellidos', datos.tomadorNombre, M + 3, y02 + 3, half - 40)
    campo('DNI o NIE', datos.tomadorDni, M + half - 34, y02 + 3, 31)
    campo('Domicilio', datos.tomadorDomicilio, M + 3, y02 + 12, half - 40)
    campo('Localidad', datos.tomadorLocalidad, M + half - 34, y02 + 12, 31)
    campo('Teléfonos', datos.tomadorTelefonos, M + 3, y02 + 21, (half - 6) / 2)
    campo('Email', datos.tomadorEmail, M + 3 + (half - 6) / 2, y02 + 21, (half - 6) / 2)
    const x03 = M + half + 4
    seccion('03', 'Póliza de seguro', y)
    rect(x03, y02, half, 27, [255, 255, 255], GRIS_BORDE)
    campo('Compañía', datos.polizaCompania, x03 + 3, y02 + 3, half - 6)
    campo('Nº de póliza', datos.polizaNumero, x03 + 3, y02 + 12, half - 6)
    campo('Vigencia hasta', datos.polizaVigencia, x03 + 3, y02 + 21, (half - 6) / 2)
    txt('RECIBO EN VIGOR', x03 + 3 + (half - 6) / 2, y02 + 21, { size: 6, bold: true, color: GRIS_LABEL })
    ;['si', 'no'].forEach((o, i) => { const sel = datos.polizaRecibo === o; const cx = x03 + 3 + (half - 6) / 2 + i * 12; rect(cx, y02 + 23.5, 3.5, 3.5, sel ? AZUL : [255, 255, 255], GRIS_BORDE); txt(o === 'si' ? 'Sí' : 'No', cx + 5, y02 + 26.3, { size: 7 }) })
    y = y02 + 30

    // 04 Extintores
    y = seccion('04', 'Protección contra incendios · Extintores', y, 'RD 513/2017')
    rect(M, y, CW, 40, [255, 255, 255], GRIS_BORDE)
    // ABC (izq)
    txt('EXTINTOR DE POLVO ABC', M + 3, y + 4, { size: 7.5, bold: true, color: AZUL })
    txt('ZONA NOBLE', M + half - 3, y + 4, { size: 6, bold: true, color: NARANJA, align: 'right' })
    campo('Nº de extintor', datos.abcNumero, M + 3, y + 7, half - 40)
    campo('Eficacia mínima 21A-113B', datos.abcEficacia, M + 3, y + 15, half - 40)
    campo('Revisión en vigor · fecha', datos.abcRevision, M + 3, y + 23, half - 40)
    cabeceraChecks(M + 3, y + 30, half - 3)
    let ya = y + 33; EXTINTOR_ABC_CHECKS.forEach(it => { ya = checkFila(it, c(it.key), M + 3, ya, half - 3) })
    // CO2 (der)
    txt('EXTINTOR DE CO₂', x03 + 3, y + 4, { size: 7.5, bold: true, color: AZUL })
    txt('ZONA COCINA', W - M - 3, y + 4, { size: 6, bold: true, color: NARANJA, align: 'right' })
    campo('Nº de extintor', datos.co2Numero, x03 + 3, y + 7, half - 40)
    campo('Eficacia mínima 34B', datos.co2Eficacia, x03 + 3, y + 15, half - 40)
    campo('Revisión en vigor · fecha', datos.co2Revision, x03 + 3, y + 23, half - 40)
    cabeceraChecks(x03 + 3, y + 30, half - 3)
    let yc = y + 33; EXTINTOR_CO2_CHECKS.forEach(it => { yc = checkFila(it, c(it.key), x03 + 3, yc, half - 3) })
    y += 43

    // 05 Gas
    y = seccion('05', 'Instalación de gas y zona de cocina', y, 'RD 919/2006 · ITC-ICG')
    rect(M, y, CW, 30, [255, 255, 255], GRIS_BORDE)
    cabeceraChecks(M + 3, y + 3, half - 3); cabeceraChecks(x03 + 3, y + 3, half - 3)
    let yg1 = y + 6; GAS_IZQ.forEach(it => { yg1 = checkFila(it, c(it.key), M + 3, yg1, half - 3) })
    let yg2 = y + 6; GAS_DER.forEach(it => { yg2 = checkFila(it, c(it.key), x03 + 3, yg2, half - 3) })
    y += 33

    // 06 Documentación
    y = seccion('06', 'Documentación aportada por el titular', y, 'Original o copia cotejada')
    rect(M, y, CW, 20, [255, 255, 255], GRIS_BORDE)
    cabeceraChecks(M + 3, y + 3, half - 3); cabeceraChecks(x03 + 3, y + 3, half - 3)
    let yd1 = y + 6; DOC_IZQ.forEach(it => { yd1 = checkFila(it, c(it.key), M + 3, yd1, half - 3) })
    let yd2 = y + 6; DOC_DER.forEach(it => { yd2 = checkFila(it, c(it.key), x03 + 3, yd2, half - 3) })
    pie()

    // ══════════════ PÁGINA 2 ══════════════
    doc.addPage(); cabecera(); y = 30
    txt('INSTALACIÓN ELÉCTRICA, EVACUACIÓN, RESULTADO Y FIRMAS', M, y, { size: 8, bold: true, color: AZUL })
    campo('Expediente Nº', datos.expediente, M + 118, y - 4, 35)
    campo('Caseta', datos.numeroCaseta, M + 158, y - 4, CW - 158)
    doc.setDrawColor(...NARANJA); doc.setLineWidth(0.5); doc.line(M, y + 2, W - M, y + 2); y += 6

    // 07 + 08
    const y07 = seccion('07', 'Instalación eléctrica', y, 'REBT')
    seccion('08', 'Evacuación y estructura', y)
    const h78 = 6 + ELECTRICA.length * 5.2
    rect(M, y07, half, h78, [255, 255, 255], GRIS_BORDE); rect(x03, y07, half, h78, [255, 255, 255], GRIS_BORDE)
    cabeceraChecks(M + 3, y07 + 3, half - 3); cabeceraChecks(x03 + 3, y07 + 3, half - 3)
    let ye1 = y07 + 6; ELECTRICA.forEach(it => { ye1 = checkFila(it, c(it.key), M + 3, ye1, half - 3) })
    let ye2 = y07 + 6; EVACUACION.forEach(it => { ye2 = checkFila(it, c(it.key), x03 + 3, ye2, half - 3) })
    y = y07 + h78 + 3

    // 09 Observaciones
    y = seccion('09', 'Observaciones', y)
    rect(M, y, half, 20, [255, 255, 255], GRIS_BORDE); rect(x03, y, half, 20, [255, 255, 255], GRIS_BORDE)
    txt('ZONA NOBLE', M + 3, y + 4, { size: 6, bold: true, color: GRIS_LABEL }); txt('ZONA COCINA', x03 + 3, y + 4, { size: 6, bold: true, color: GRIS_LABEL })
    doc.setFontSize(7.5); doc.setTextColor(...GRIS_TXT); doc.setFont('helvetica', 'normal')
    doc.text(doc.splitTextToSize(datos.obsZonaNoble || '', half - 6), M + 3, y + 8)
    doc.text(doc.splitTextToSize(datos.obsZonaCocina || '', half - 6), x03 + 3, y + 8)
    y += 23

    // 10 Reportaje
    y = seccion('10', 'Reportaje fotográfico', y, 'Anexo probatorio')
    const fw = (CW - 8) / 3
    ;[0, 1, 2].forEach(i => foto(fotos.reportaje[i], `Fotografía ${i + 1}`, M + i * (fw + 4), y + 1, fw, 26))
    y += 30

    // 11 Resultado
    y = seccion('11', 'Resultado de la revisión y requerimientos', y, undefined, NARANJA)
    rect(M, y, CW, 34, [255, 255, 255], GRIS_BORDE)
    const rw = (CW - 12) / 3
    const res: [string, string][] = [['apto', 'APTO'], ['apto_condiciones', 'APTO CON CONDICIONES'], ['no_apto', 'NO APTO']]
    res.forEach(([k, lbl], i) => {
        const rx = M + 3 + i * (rw + 3); const sel = datos.resultado === k; const col = k === 'no_apto' ? NARANJA : AZUL
        rect(rx, y + 3, rw, 8, [255, 255, 255], sel ? col : GRIS_BORDE)
        rect(rx + 2, y + 5, 4, 4, sel ? col : [255, 255, 255], GRIS_BORDE)
        txt(lbl, rx + 8, y + 7.8, { size: 7.5, bold: true, color: sel ? col : GRIS_TXT })
    })
    campo('Requerimientos de subsanación', datos.requerimientos, M + 3, y + 15, CW - 80)
    campo('Plazo límite', datos.plazoLimite, W - M - 74, y + 15, 35)
    campo('Reinspección prevista', datos.reinspeccion, W - M - 37, y + 15, 34)
    const adv = 'ADVERTENCIA. La calificación de NO APTO, o el incumplimiento de los requerimientos en el plazo señalado, será objeto de traslado a la Policía Local y al órgano municipal competente, que podrá acordar la suspensión de la actividad, el precinto de la instalación o la clausura de la caseta, conforme a la Ley 13/1999 y a la Ordenanza municipal aplicable. El presente parte tiene naturaleza de acta de comprobación técnica y no sustituye a las autorizaciones municipales exigibles.'
    rect(M + 3, y + 22, CW - 6, 10, [255, 243, 235])
    doc.setFontSize(5.6); doc.setTextColor(120, 80, 40); doc.setFont('helvetica', 'normal')
    doc.text(doc.splitTextToSize(adv, CW - 12), M + 5, y + 25)
    y += 38

    // Firmas
    const fwid = (CW - 9) / 4
    const firmasArr: [string, string | undefined][] = [['Indicativo que informa 1', firmas.informa1], ['Indicativo que informa 2', firmas.informa2], ['VºBº Jefe de Servicio', firmas.jefe], ['Tomador o representante', firmas.tomador]]
    firmasArr.forEach(([lbl, f], i) => {
        const fx = M + i * (fwid + 3)
        doc.setDrawColor(...GRIS_BORDE); doc.setLineWidth(0.3); doc.line(fx, y + 16, fx + fwid, y + 16)
        if (f) { try { doc.addImage(f, 'PNG', fx + 2, y + 2, fwid - 4, 13) } catch { /* */ } }
        txt(lbl.toUpperCase(), fx, y + 20, { size: 6, bold: true, color: AZUL })
    })
    pie()

    // ══════════════ PÁGINA 3 · Anexo gráfico ══════════════
    doc.addPage(); cabecera(); y = 30
    txt('ANEXO · MATERIAL GRÁFICO', M, y, { size: 8, bold: true, color: AZUL })
    campo('Expediente Nº', datos.expediente, M + 118, y - 4, 35)
    campo('Caseta', datos.numeroCaseta, M + 158, y - 4, CW - 158)
    doc.setDrawColor(...NARANJA); doc.setLineWidth(0.5); doc.line(M, y + 2, W - M, y + 2); y += 5

    y = seccion('', 'Zona noble', y)
    ;[0, 1].forEach(i => foto(fotos.zonaNoble[i], `Zona noble · Foto ${i + 1}`, M + i * (half + 4), y + 1, half, 58))
    y += 62
    y = seccion('', 'Zona cocina', y)
    ;[0, 1].forEach(i => foto(fotos.zonaCocina[i], `Zona cocina · Foto ${i + 1}`, M + i * (half + 4), y + 1, half, 58))
    y += 62
    const y3 = seccion('', 'Extintores de polvo ABC', y)
    seccion('', 'Extintores de CO₂', y)
    const tw = (half - 4) / 2
    foto(fotos.extintorAbc[0], 'Extintor ABC · Foto 1', M, y3 + 1, tw, 40)
    foto(fotos.extintorAbc[1], 'Extintor ABC · Foto 2', M + tw + 4, y3 + 1, tw, 40)
    foto(fotos.extintorCo2[0], 'Extintor CO₂ · Foto', x03, y3 + 1, half, 40)
    pie()

    return doc
}
