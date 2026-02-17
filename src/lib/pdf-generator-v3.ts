import jsPDF from 'jspdf'
import { PsiFormState } from '@/types/psi'
import { LOGO_BASE64 } from '@/lib/logo-data'
import { FOOTER_BASE64 } from '@/lib/footer-data'

// ─── Colores exactos del formulario web ───
const BLUE: [number, number, number] = [40, 54, 102]    // #283666 – exacto del logo
const ORANGE: [number, number, number] = [255, 122, 0]  // #ff7a00
const WHITE: [number, number, number] = [255, 255, 255]
const TEXT_DARK: [number, number, number] = [15, 23, 42]
const BORDER: [number, number, number] = [203, 213, 225]
const BG_LIGHT: [number, number, number] = [241, 245, 249]

// ─── Layout constants (mm) ───
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 8
const CONTENT_W = PAGE_W - MARGIN * 2

// ─── Helper: draw filled rect with optional border ───
function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill?: [number, number, number], border?: [number, number, number]) {
    if (fill) {
        doc.setFillColor(...fill)
        doc.rect(x, y, w, h, 'F')
    }
    if (border) {
        doc.setDrawColor(...border)
        doc.setLineWidth(0.3)
        doc.rect(x, y, w, h, 'S')
    }
}

// ─── Helper: draw text centered in a box ───
function textInBox(doc: jsPDF, text: string, x: number, y: number, w: number, h: number, opts?: {
    color?: [number, number, number], size?: number, bold?: boolean, align?: 'left' | 'center' | 'right'
}) {
    const { color = TEXT_DARK, size = 7, bold = false, align = 'left' } = opts || {}
    doc.setTextColor(...color)
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')

    const textY = y + h / 2 + size * 0.12
    let textX = x + 2
    if (align === 'center') textX = x + w / 2
    if (align === 'right') textX = x + w - 2

    doc.text(text || '', textX, textY, { align })
}

// ─── Helper: dark blue section bar ───
function sectionBar(doc: jsPDF, text: string, y: number): number {
    const h = 6
    drawRect(doc, MARGIN, y, CONTENT_W, h, BLUE)
    doc.setTextColor(...WHITE)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(text, MARGIN + 3, y + h / 2 + 1.5)
    return y + h
}

// ─── Helper: checkbox ───
function drawCheckbox(doc: jsPDF, x: number, y: number, checked: boolean, size = 3.5) {
    drawRect(doc, x, y, size, size, WHITE, BORDER)
    if (checked) {
        doc.setTextColor(...TEXT_DARK)
        doc.setFontSize(7)
        doc.text('✕', x + 0.5, y + size - 0.5)
    }
}

// ═══════════════════════════════════════════════════
//  HEADER (shared across pages)
// ═══════════════════════════════════════════════════
function drawHeader(doc: jsPDF): number {
    const headerH = 18  // taller header for logo integration
    drawRect(doc, 0, 0, PAGE_W, headerH, BLUE)

    // PSI – BOLD, no border, spans full height of the two text lines
    const psiX = MARGIN + 2
    const psiY = 2
    const psiW = 16
    const psiH = headerH - 4
    doc.setTextColor(...WHITE)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('PSI', psiX + psiW / 2, psiY + psiH / 2 + 2.5, { align: 'center' })

    // Title – larger font
    doc.setTextColor(...WHITE)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('PARTE DE', psiX + psiW + 4, 7)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('SERVICIO E INTERVENCIÓN', psiX + psiW + 4, 13)

    // Logo — imagen real embebida
    const logoW = 52
    const logoH = logoW * (333 / 1024)  // aspect ratio from original image (1024x333)
    const logoX = PAGE_W - MARGIN - logoW
    const logoY = (headerH - logoH) / 2  // vertically centered in header
    doc.addImage(LOGO_BASE64, 'PNG', logoX, logoY, logoW, logoH)

    return headerH + 2
}

// ═══════════════════════════════════════════════════
//  FOOTER – pixel-perfect image from user's template
// ═══════════════════════════════════════════════════
function drawFooter(doc: jsPDF) {
    const footerH = 10                     // height in mm for the footer image strip
    const footerY = PAGE_H - footerH
    const footerW = PAGE_W                 // full width
    doc.addImage(FOOTER_BASE64, 'PNG', 0, footerY, footerW, footerH)
}

// ═══════════════════════════════════════════════════
//  PÁGINA 1: Datos del Servicio
// ═══════════════════════════════════════════════════
function drawPage1(doc: jsPDF, data: PsiFormState) {
    let y = drawHeader(doc)

    // ── Info fields (left side) + Resource tables (right side) ──
    const leftW = CONTENT_W * 0.48
    const rightW = CONTENT_W * 0.50
    const rightX = MARGIN + leftW + CONTENT_W * 0.02
    const fieldH = 7
    const labelW = 22

    // Left column: FECHA, Nº INFORME, HORA
    const startY = y

    // Row 1: FECHA + Nº INFORME
    textInBox(doc, 'FECHA', MARGIN, y, labelW, fieldH, { bold: true, size: 8 })
    drawRect(doc, MARGIN + labelW, y, 30, fieldH, undefined, BORDER)
    textInBox(doc, data.fecha || '', MARGIN + labelW, y, 30, fieldH, { size: 8 })

    textInBox(doc, 'Nº INFORME', MARGIN + labelW + 32, y, 22, fieldH, { bold: true, size: 8 })
    drawRect(doc, MARGIN + labelW + 54, y, leftW - labelW - 54, fieldH, undefined, BORDER)
    textInBox(doc, data.numero || 'Auto-generado', MARGIN + labelW + 54, y, leftW - labelW - 54, fieldH, { size: 8 })
    y += fieldH + 1

    // Row 2: HORA
    textInBox(doc, 'HORA', MARGIN, y, labelW, fieldH, { bold: true, size: 8 })
    drawRect(doc, MARGIN + labelW, y, 30, fieldH, undefined, BORDER)
    textInBox(doc, data.hora || '', MARGIN + labelW, y, 30, fieldH, { size: 8 })
    y += fieldH + 1

    // Row 3: LUGAR
    textInBox(doc, 'LUGAR', MARGIN, y, labelW, fieldH, { bold: true, size: 8 })
    drawRect(doc, MARGIN + labelW, y, leftW - labelW, fieldH, undefined, BORDER)
    textInBox(doc, data.lugar || '', MARGIN + labelW, y, leftW - labelW, fieldH, { size: 8 })
    y += fieldH + 1

    // Row 4: MOTIVO
    textInBox(doc, 'MOTIVO', MARGIN, y, labelW, fieldH, { bold: true, size: 8 })
    drawRect(doc, MARGIN + labelW, y, leftW - labelW, fieldH, undefined, BORDER)
    textInBox(doc, data.motivo || '', MARGIN + labelW, y, leftW - labelW, fieldH, { size: 8 })
    y += fieldH + 1

    // Row 5: ALERTANTE
    textInBox(doc, 'ALERTANTE', MARGIN, y, labelW, fieldH, { bold: true, size: 8 })
    drawRect(doc, MARGIN + labelW, y, leftW - labelW, fieldH, undefined, BORDER)
    textInBox(doc, data.alertante || '', MARGIN + labelW, y, leftW - labelW, fieldH, { size: 8 })
    y += fieldH + 2

    // ── RIGHT COLUMN: Resource tables ──
    const tableStartY = startY
    // 3 tables side by side
    const t1W = rightW * 0.28  // VEHÍCULOS
    const t2W = rightW * 0.36  // EQUIPO + WALKIES (tabla1)
    const t3W = rightW * 0.36  // EQUIPO + WALKIES (tabla2)
    const t1X = rightX
    const t2X = rightX + t1W
    const t3X = rightX + t1W + t2W
    const rowH = 5.5
    const headerRowH = 6

    // Table 1 header: VEHÍCULOS
    drawRect(doc, t1X, tableStartY, t1W, headerRowH, BLUE)
    textInBox(doc, 'VEHÍCULOS', t1X, tableStartY, t1W, headerRowH, { color: WHITE, bold: true, size: 7, align: 'center' })

    // Table 2 header: EQUIPO | WALKIES
    drawRect(doc, t2X, tableStartY, t2W / 2, headerRowH, BLUE)
    textInBox(doc, 'EQUIPO', t2X, tableStartY, t2W / 2, headerRowH, { color: WHITE, bold: true, size: 7, align: 'center' })
    drawRect(doc, t2X + t2W / 2, tableStartY, t2W / 2, headerRowH, BLUE)
    textInBox(doc, 'WALKIES', t2X + t2W / 2, tableStartY, t2W / 2, headerRowH, { color: WHITE, bold: true, size: 7, align: 'center' })

    // Table 3 header: EQUIPO | WALKIES
    drawRect(doc, t3X, tableStartY, t3W / 2, headerRowH, BLUE)
    textInBox(doc, 'EQUIPO', t3X, tableStartY, t3W / 2, headerRowH, { color: WHITE, bold: true, size: 7, align: 'center' })
    drawRect(doc, t3X + t3W / 2, tableStartY, t3W / 2, headerRowH, BLUE)
    textInBox(doc, 'WALKIES', t3X + t3W / 2, tableStartY, t3W / 2, headerRowH, { color: WHITE, bold: true, size: 7, align: 'center' })

    // Table rows
    const maxRows = 6
    for (let i = 0; i < maxRows; i++) {
        const rY = tableStartY + headerRowH + i * rowH

        // Vehículos (only 4 rows)
        if (i < 4) {
            drawRect(doc, t1X, rY, t1W, rowH, undefined, BORDER)
            textInBox(doc, data.tabla1[i]?.vehiculo || '', t1X, rY, t1W, rowH, { size: 6, align: 'center' })
        }

        // Tabla 1 equipo/walkies
        drawRect(doc, t2X, rY, t2W / 2, rowH, undefined, BORDER)
        textInBox(doc, data.tabla1[i]?.equipo || '', t2X, rY, t2W / 2, rowH, { size: 6, align: 'center' })
        drawRect(doc, t2X + t2W / 2, rY, t2W / 2, rowH, undefined, BORDER)
        textInBox(doc, data.tabla1[i]?.walkie || '', t2X + t2W / 2, rY, t2W / 2, rowH, { size: 6, align: 'center' })

        // Tabla 2 equipo/walkies
        drawRect(doc, t3X, rY, t3W / 2, rowH, undefined, BORDER)
        textInBox(doc, data.tabla2[i]?.equipo || '', t3X, rY, t3W / 2, rowH, { size: 6, align: 'center' })
        drawRect(doc, t3X + t3W / 2, rY, t3W / 2, rowH, undefined, BORDER)
        textInBox(doc, data.tabla2[i]?.walkie || '', t3X + t3W / 2, rY, t3W / 2, rowH, { size: 6, align: 'center' })
    }

    // ── PAUTAS DE TIEMPO ──
    y = sectionBar(doc, 'PAUTAS DE TIEMPO', y)
    y += 1

    const timeKeys: Array<{ key: keyof PsiFormState['tiempos']; label: string }> = [
        { key: 'llamada', label: 'LLAMADA' },
        { key: 'salida', label: 'SALIDA' },
        { key: 'llegada', label: 'LLEGADA' },
        { key: 'terminado', label: 'TERMINADO' },
        { key: 'disponible', label: 'DISPONIBLE' }
    ]

    const timeBoxW = CONTENT_W / 5
    const timeBoxH = 12
    for (let i = 0; i < timeKeys.length; i++) {
        const tx = MARGIN + i * timeBoxW
        // Input box
        drawRect(doc, tx + 4, y, timeBoxW - 8, 7, undefined, BORDER)
        // Format value as HH:MM or show empty colons
        const rawVal = data.tiempos[timeKeys[i].key] || ''
        const displayVal = rawVal || ':'
        textInBox(doc, displayVal, tx + 4, y, timeBoxW - 8, 7, { align: 'center', size: 9, bold: true })
        // Label
        textInBox(doc, timeKeys[i].label, tx, y + 7, timeBoxW, 5, { align: 'center', size: 6, bold: true })
    }
    y += timeBoxH + 1

    // ── TIPOLOGÍA DE SERVICIO ──
    y = sectionBar(doc, 'TIPOLOGÍA DE SERVICIO', y)
    y += 1

    const tipColW = CONTENT_W / 3
    const tipHeaderH = 5.5
    const tipRowH = 4.5

    // Headers
    const tipHeaders = ['PREVENCIÓN', 'INTERVENCIÓN', 'OTROS']
    for (let c = 0; c < 3; c++) {
        drawRect(doc, MARGIN + c * tipColW, y, tipColW, tipHeaderH, BLUE)
        textInBox(doc, tipHeaders[c], MARGIN + c * tipColW, y, tipColW, tipHeaderH, { color: WHITE, bold: true, size: 6, align: 'center' })
    }
    y += tipHeaderH

    // Draw border for the tipology grid
    const prevencionItems = [
        { label: 'MANTENIMIENTO', key: 'mantenimiento' },
        { label: 'PRÁCTICAS', key: 'practicas' },
        { label: 'SUMINISTROS', key: 'suministros' },
        { label: 'PREVENTIVO', key: 'preventivo' },
        { label: 'OTROS', key: 'otros' }
    ]
    const intervencionItems = [
        { label: 'SOPORTE VITAL', key: 'svb' },
        { label: 'INCENDIOS', key: 'incendios' },
        { label: 'INUNDACIONES', key: 'inundaciones' },
        { label: 'OTROS RIESGOS METEO', key: 'otros_riesgos_meteo' },
        { label: 'ACTIVACIÓN PEM- BOR', key: 'activacion_pem_bor' },
        { label: 'OTROS', key: 'otros' }
    ]
    const otrosItems = [
        { label: 'REUNIÓN COORDINACIÓN', key: 'reunion_coordinacion' },
        { label: 'REUNIÓN ÁREAS', key: 'reunion_areas' },
        { label: 'LIMPIEZA', key: 'limpieza' },
        { label: 'FORMACIÓN', key: 'formacion' },
        { label: 'OTROS', key: 'otros' }
    ]

    const maxTipRows = Math.max(prevencionItems.length, intervencionItems.length, otrosItems.length)
    const tipGridH = maxTipRows * tipRowH + 2

    // Draw outer borders
    drawRect(doc, MARGIN, y, tipColW, tipGridH, undefined, BORDER)
    drawRect(doc, MARGIN + tipColW, y, tipColW, tipGridH, undefined, BORDER)
    drawRect(doc, MARGIN + tipColW * 2, y, tipColW, tipGridH, undefined, BORDER)

    // Prevención items
    const cbX = tipColW - 6 // checkbox position relative to column
    for (let i = 0; i < prevencionItems.length; i++) {
        const ry = y + 1 + i * tipRowH
        textInBox(doc, `${i + 1}  ${prevencionItems[i].label}`, MARGIN + 2, ry, tipColW - 8, tipRowH, { size: 5.5 })
        drawCheckbox(doc, MARGIN + cbX, ry + 0.5, data.prevencion[prevencionItems[i].key as keyof typeof data.prevencion])
    }

    // Intervención items
    for (let i = 0; i < intervencionItems.length; i++) {
        const ry = y + 1 + i * tipRowH
        textInBox(doc, `${i + 1}  ${intervencionItems[i].label}`, MARGIN + tipColW + 2, ry, tipColW - 8, tipRowH, { size: 5.5 })
        drawCheckbox(doc, MARGIN + tipColW + cbX, ry + 0.5, data.intervencion[intervencionItems[i].key as keyof typeof data.intervencion])
    }

    // Otros items
    for (let i = 0; i < otrosItems.length; i++) {
        const ry = y + 1 + i * tipRowH
        textInBox(doc, `${i + 1}  ${otrosItems[i].label}`, MARGIN + tipColW * 2 + 2, ry, tipColW - 8, tipRowH, { size: 5.5 })
        drawCheckbox(doc, MARGIN + tipColW * 2 + cbX, ry + 0.5, data.otros[otrosItems[i].key as keyof typeof data.otros])
    }

    y += tipGridH + 1

    // ── OTROS DESCRIPCIÓN ──
    y = sectionBar(doc, 'OTROS DESCRIPCIÓN', y)
    y += 1
    const descH = 14
    drawRect(doc, MARGIN, y, CONTENT_W, descH, undefined, BORDER)
    doc.setTextColor(...TEXT_DARK)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(data.otrosDescripcion || '', MARGIN + 2, y + 4, { maxWidth: CONTENT_W - 4 })
    y += descH + 1

    // ── POSIBLES CAUSAS ──
    y = sectionBar(doc, 'POSIBLES CAUSAS', y)
    y += 1
    const causasH = 14
    drawRect(doc, MARGIN, y, CONTENT_W, causasH, undefined, BORDER)
    doc.setTextColor(...TEXT_DARK)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(data.posiblesCausas || '', MARGIN + 2, y + 4, { maxWidth: CONTENT_W - 4 })
    y += causasH + 1

    // ── HERIDOS / FALLECIDOS ──
    const halfW = CONTENT_W / 2
    // HERIDOS
    drawRect(doc, MARGIN, y, halfW, 6, BLUE)
    textInBox(doc, 'HERIDOS', MARGIN, y, halfW, 6, { color: WHITE, bold: true, size: 7 })
    // FALLECIDOS
    drawRect(doc, MARGIN + halfW, y, halfW, 6, BLUE)
    textInBox(doc, 'FALLECIDOS', MARGIN + halfW, y, halfW, 6, { color: WHITE, bold: true, size: 7 })
    y += 6

    const casualtyH = 6
    // Heridos row
    drawRect(doc, MARGIN, y, halfW, casualtyH, undefined, BORDER)
    textInBox(doc, 'SI', MARGIN + 2, y, 6, casualtyH, { size: 6 })
    drawCheckbox(doc, MARGIN + 9, y + 1.2, data.heridosSi)
    textInBox(doc, 'NO', MARGIN + 16, y, 6, casualtyH, { size: 6 })
    drawCheckbox(doc, MARGIN + 23, y + 1.2, data.heridosNo)
    textInBox(doc, 'Nº', MARGIN + 30, y, 6, casualtyH, { size: 6 })
    drawRect(doc, MARGIN + 36, y + 0.5, 16, casualtyH - 1, undefined, BORDER)
    textInBox(doc, data.heridosNum || '', MARGIN + 36, y, 16, casualtyH, { size: 7 })

    // Fallecidos row
    drawRect(doc, MARGIN + halfW, y, halfW, casualtyH, undefined, BORDER)
    textInBox(doc, 'SI', MARGIN + halfW + 2, y, 6, casualtyH, { size: 6 })
    drawCheckbox(doc, MARGIN + halfW + 9, y + 1.2, data.fallecidosSi)
    textInBox(doc, 'NO', MARGIN + halfW + 16, y, 6, casualtyH, { size: 6 })
    drawCheckbox(doc, MARGIN + halfW + 23, y + 1.2, data.fallecidosNo)
    textInBox(doc, 'Nº', MARGIN + halfW + 30, y, 6, casualtyH, { size: 6 })
    drawRect(doc, MARGIN + halfW + 36, y + 0.5, 16, casualtyH - 1, undefined, BORDER)
    textInBox(doc, data.fallecidosNum || '', MARGIN + halfW + 36, y, 16, casualtyH, { size: 7 })
    y += casualtyH + 1

    // ── EN ACCIDENTES DE TRÁFICO ──
    y = sectionBar(doc, 'EN ACCIDENTES DE TRÁFICO', y)
    y += 1

    // MATRÍCULA VEHÍCULOS IMPLICADOS
    const trafficRowH = 6
    textInBox(doc, 'MATRÍCULA VEHÍCULOS IMPLICADOS', MARGIN, y, 52, trafficRowH, { bold: true, size: 6 })
    const matW = (CONTENT_W - 54) / 3
    for (let i = 0; i < 3; i++) {
        drawRect(doc, MARGIN + 54 + i * matW, y, matW - 2, trafficRowH, undefined, BORDER)
        textInBox(doc, data.matriculasImplicados[i] || '', MARGIN + 54 + i * matW, y, matW - 2, trafficRowH, { size: 6 })
    }
    y += trafficRowH + 1

    // AUTORIDAD / POLICÍA LOCAL / GUARDIA CIVIL
    textInBox(doc, 'AUTORIDAD QUE INTERVIENEN', MARGIN, y, 48, trafficRowH, { bold: true, size: 5.5 })
    textInBox(doc, 'POLICÍA LOCAL DE', MARGIN + 50, y, 30, trafficRowH, { bold: true, size: 5.5 })
    drawRect(doc, MARGIN + 80, y, 30, trafficRowH, undefined, BORDER)
    textInBox(doc, data.policiaLocalDe || '', MARGIN + 80, y, 30, trafficRowH, { size: 6 })
    textInBox(doc, 'GUARDIA CIVIL DE', MARGIN + 114, y, 30, trafficRowH, { bold: true, size: 5.5 })
    drawRect(doc, MARGIN + 144, y, CONTENT_W - 144 + MARGIN, trafficRowH, undefined, BORDER)
    textInBox(doc, data.guardiaCivilDe || '', MARGIN + 144, y, CONTENT_W - 144 + MARGIN, trafficRowH, { size: 6 })
    y += trafficRowH + 1

    // ── OBSERVACIONES ──
    y = sectionBar(doc, 'OBSERVACIONES', y)
    y += 1
    const obsH = 28
    drawRect(doc, MARGIN, y, CONTENT_W, obsH, undefined, BORDER)
    doc.setTextColor(...TEXT_DARK)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(data.observaciones || '', MARGIN + 2, y + 4, { maxWidth: CONTENT_W - 4 })
    y += obsH + 1

    // ── FIRMAS (3 columnas) ──
    const sigColW = CONTENT_W / 3
    const sigHeaderH = 6
    const sigBodyH = 38

    // Headers – corrected labels: INDICATIVO, RESPONSABLE DE TURNO, JEFE DE SERVICIO
    const sigHeaders = ['INDICATIVO QUE INFORMA', 'RESPONSABLE DE TURNO', 'VB JEFE DE SERVICIO']
    for (let c = 0; c < 3; c++) {
        drawRect(doc, MARGIN + c * sigColW, y, sigColW, sigHeaderH, BLUE)
        textInBox(doc, sigHeaders[c], MARGIN + c * sigColW, y, sigColW, sigHeaderH, { color: WHITE, bold: true, size: 6, align: 'center' })
    }
    y += sigHeaderH

    // Signature bodies – corrected labels
    const sigLabels = ['INDICATIVO', 'RESPONSABLE DE TURNO', 'JEFE DE SERVICIO']
    const sigValues = [data.indicativosInforman || '', data.responsableTurno || '', data.vbJefeServicio || '']
    const sigFootLabels = ['Firma Informante', 'Firma Responsable', 'Firma Jefe Servicio']
    const sigImages = [data.firmaInformante, data.firmaResponsable, data.firmaJefe]

    for (let c = 0; c < 3; c++) {
        const sx = MARGIN + c * sigColW
        drawRect(doc, sx, y, sigColW, sigBodyH, undefined, BORDER)

        // Label
        textInBox(doc, sigLabels[c], sx + 2, y + 1, sigColW - 4, 5, { bold: true, size: 6 })
        // Value box – larger font
        drawRect(doc, sx + 2, y + 6, sigColW - 4, 7, undefined, BORDER)
        textInBox(doc, sigValues[c], sx + 2, y + 6, sigColW - 4, 7, { size: 8, align: 'center' })

        // Sign label
        textInBox(doc, sigFootLabels[c], sx + 2, y + 14, sigColW - 4, 5, { size: 5 })

        // Signature image or empty box
        const sigBoxY = y + 19
        const sigBoxH = sigBodyH - 21
        drawRect(doc, sx + 2, sigBoxY, sigColW - 4, sigBoxH, BG_LIGHT, BORDER)

        if (sigImages[c]) {
            try {
                doc.addImage(sigImages[c]!, 'PNG', sx + 3, sigBoxY + 1, sigColW - 6, sigBoxH - 2)
            } catch { /* signature image failed */ }
        }
    }

    drawFooter(doc)
}

// ═══════════════════════════════════════════════════
//  PÁGINA 2: Desarrollo Detallado – texto continuo
// ═══════════════════════════════════════════════════
function drawPage2(doc: jsPDF, data: PsiFormState) {
    let y = drawHeader(doc)

    // No section title, no headers. Just continuous text.
    const rawText = data.desarrolloDetallado || ''

    // Strip section headers (INTRODUCCIÓN, DESARROLLO DETALLADO, CONCLUSIÓN) if present
    const cleanText = rawText
        .replace(/INTRODUCCIÓN[:\s]*/gi, '')
        .replace(/DESARROLLO\s*DETALLADO[:\s]*/gi, '')
        .replace(/CONCLUSIÓN[:\s]*/gi, '')
        .trim()

    if (cleanText) {
        // Draw text box with border
        const maxTextH = PAGE_H - y - 14  // leave room for footer
        drawRect(doc, MARGIN, y, CONTENT_W, maxTextH, undefined, BORDER)
        doc.setTextColor(...TEXT_DARK)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(cleanText, MARGIN + 3, y + 5, { maxWidth: CONTENT_W - 6 })
    } else {
        // Empty box
        const emptyH = PAGE_H - y - 14
        drawRect(doc, MARGIN, y, CONTENT_W, emptyH, undefined, BORDER)
    }

    drawFooter(doc)
}

// ═══════════════════════════════════════════════════
//  PÁGINA 3: Fotos – 3 images per page, maximizing space
// ═══════════════════════════════════════════════════
function drawPage3(doc: jsPDF, data: PsiFormState) {
    let y = drawHeader(doc)

    // No title – just images

    const fotos = data.fotos || []
    const footerMargin = 12  // space for footer
    const availableH = PAGE_H - y - footerMargin
    const gap = 3
    const photoW = CONTENT_W  // full width

    if (fotos.length === 0) {
        drawRect(doc, MARGIN, y, CONTENT_W, 40, BG_LIGHT, BORDER)
        doc.setTextColor(148, 163, 184) // #94a3b8
        doc.setFontSize(9)
        doc.text('No hay fotografías adjuntas', PAGE_W / 2, y + 20, { align: 'center' })
    } else {
        // Fit 3 images per page, stacked vertically, full width
        const maxPerPage = 3
        const photoH = (availableH - gap * (maxPerPage - 1)) / maxPerPage

        for (let i = 0; i < fotos.length; i++) {
            // If we've filled a page, add a new one
            if (i > 0 && i % maxPerPage === 0) {
                drawFooter(doc)
                doc.addPage()
                y = drawHeader(doc)
            }

            const indexInPage = i % maxPerPage
            const py = y + indexInPage * (photoH + gap)

            drawRect(doc, MARGIN, py, photoW, photoH, BG_LIGHT, BORDER)

            if (fotos[i]) {
                try {
                    doc.addImage(fotos[i], 'JPEG', MARGIN + 1, py + 1, photoW - 2, photoH - 2)
                } catch {
                    doc.setTextColor(148, 163, 184)
                    doc.setFontSize(6)
                    doc.text('Error al cargar imagen', MARGIN + photoW / 2, py + photoH / 2, { align: 'center' })
                }
            }
        }
    }

    drawFooter(doc)
}

// ═══════════════════════════════════════════════════
//  MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════
export async function generatePsiPdfV3(data: PsiFormState): Promise<jsPDF> {
    console.log('[PDF Generator] Starting PDF generation...')

    try {
        const doc = new jsPDF('p', 'mm', 'a4')

        // Page 1: Datos del servicio
        console.log('[PDF Generator] Drawing page 1...')
        drawPage1(doc, data)

        // Page 2: Desarrollo detallado
        console.log('[PDF Generator] Drawing page 2...')
        doc.addPage()
        drawPage2(doc, data)

        // Page 3: Fotos (only if there are photos)
        const hasPhotos = data.fotos && data.fotos.length > 0 && data.fotos.some(f => f && f.length > 0)
        if (hasPhotos) {
            console.log('[PDF Generator] Drawing page 3 (photos)...')
            doc.addPage()
            drawPage3(doc, data)
        }

        console.log('[PDF Generator] PDF generation complete!')
        return doc
    } catch (error) {
        console.error('[PDF Generator] Error during generation:', error)
        throw error
    }
}
