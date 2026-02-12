import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PsiFormState } from '@/types/psi'

const COLORS = {
    primary: [44, 62, 80] as [number, number, number],
    orange: [230, 126, 34] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    black: [0, 0, 0] as [number, number, number],
    lightGray: [240, 240, 240] as [number, number, number]
}

export async function generatePsiPdfV3(data: PsiFormState) {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ==================== PÁGINA 1 ====================
    createPage1Header(doc, pageWidth)

    // Top section: Fecha, Hora, Nº Informe
    let yPos = 45
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('FECHA', 15, yPos)
    doc.text('HORA', 55, yPos)

    doc.setFont('helvetica', 'normal')
    doc.rect(28, yPos - 4, 20, 6)
    doc.text(data.fecha || '', 29, yPos)
    doc.rect(68, yPos - 4, 15, 6)
    doc.text(data.hora || '', 69, yPos)

    // Nº Informe (right side with checkbox)
    doc.setFont('helvetica', 'bold')
    doc.text('Nº INFORME', 130, yPos)
    doc.rect(153, yPos - 4, 35, 6)
    doc.text(data.numeroInforme || 'Auto-generado', 154, yPos)
    doc.rect(189, yPos - 4, 5, 6)

    // Tables section (right side)
    createResourceTables(doc, data, 110, yPos + 5)

    yPos += 10

    // LUGAR, MOTIVO, ALERTANTE
    doc.setFont('helvetica', 'bold')
    doc.text('LUGAR', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.rect(15, yPos + 1, 90, 6)
    doc.text(data.lugar || '', 16, yPos + 5)

    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.text('MOTIVO', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.rect(15, yPos + 1, 90, 6)
    doc.text(data.motivo || '', 16, yPos + 5)

    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.text('ALERTANTE', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.rect(15, yPos + 1, 90, 6)
    doc.text(data.alertante || '', 16, yPos + 5)

    yPos += 15

    // PAUTAS DE TIEMPO
    createTimeSection(doc, data, yPos)
    yPos += 20

    // TIPOLOGÍA DE SERVICIO
    createTypologySection(doc, data, yPos)
    yPos += 50

    // OTROS DESCRIPCIÓN
    createSectionHeader(doc, 'OTROS DESCRIPCIÓN', 15, yPos, pageWidth - 30)
    yPos += 5
    doc.rect(15, yPos, pageWidth - 30, 12)
    doc.setFontSize(8)
    doc.text(data.otrosDescripcion || '', 16, yPos + 4, { maxWidth: pageWidth - 32 })
    yPos += 15

    // POSIBLES CAUSAS
    createSectionHeader(doc, 'POSIBLES CAUSAS', 15, yPos, pageWidth - 30)
    yPos += 5
    doc.rect(15, yPos, pageWidth - 30, 12)
    doc.text(data.posiblesCausas || '', 16, yPos + 4, { maxWidth: pageWidth - 32 })
    yPos += 15

    // HERIDOS / FALLECIDOS
    createCasualtySection(doc, data, yPos)
    yPos += 12

    // EN ACCIDENTES DE TRÁFICO
    createTrafficSection(doc, data, yPos)
    yPos += 20

    // OBSERVACIONES
    createSectionHeader(doc, 'OBSERVACIONES', 15, yPos, pageWidth - 30)
    yPos += 5
    const obsHeight = 35
    doc.rect(15, yPos, pageWidth - 30, obsHeight)
    doc.setFontSize(8)
    doc.text(data.observaciones || '', 16, yPos + 4, { maxWidth: pageWidth - 32 })
    yPos += obsHeight + 5

    // FOOTER: INDICATIVOS Y FIRMAS
    createFooterSignatures(doc, data, yPos, pageWidth, pageHeight, 25)

    // Page 1 Footer
    createPageFooter(doc, pageWidth, pageHeight, 25)

    // ==================== PÁGINA 2 ====================
    doc.addPage()
    createPage1Header(doc, pageWidth)
    createPageFooter(doc, pageWidth, pageHeight, 25)

    yPos = 50
    createSectionHeader(doc, 'DESARROLLO DETALLADO', 15, yPos, pageWidth - 30)
    yPos += 5
    const detailHeight = pageHeight - yPos - 40
    doc.rect(15, yPos, pageWidth - 30, detailHeight)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (data.desarrolloDetallado) {
        // Strip headers for PDF output as requested
        const cleanText = data.desarrolloDetallado
            .replace(/INTRODUCCIÓN:\s*/g, '')
            .replace(/DESARROLLO:\s*/g, '\n')
            .replace(/CONCLUSIÓN:\s*/g, '\n')
            .trim()

        doc.text(cleanText, 17, yPos + 5, { maxWidth: pageWidth - 34 })
    }

    // ==================== PÁGINA 3 ====================
    doc.addPage()
    createPage1Header(doc, pageWidth)

    yPos = 50
    createSectionHeader(doc, 'FOTOGRAFÍAS', 15, yPos, pageWidth - 30)
    yPos += 10

    // 3 image slots
    const imgHeight = 60
    const imgWidth = pageWidth - 30

    // Preload images to base64
    const loadedImages: (string | null)[] = [null, null, null]
    if (data.fotos && data.fotos.length > 0) {
        for (let i = 0; i < 3; i++) {
            if (data.fotos[i]) {
                const photoUrl = data.fotos[i]
                // Check if already base64 (from immediate upload) or URL (from DB)
                if (photoUrl.startsWith('data:image')) {
                    loadedImages[i] = photoUrl
                } else {
                    // Try to fetch URL
                    loadedImages[i] = await getBase64ImageFromUrl(photoUrl)
                }
            }
        }
    }

    for (let i = 0; i < 3; i++) {
        doc.rect(15, yPos, imgWidth, imgHeight)

        const imgData = loadedImages[i]

        if (imgData) {
            try {
                // Determine format if possible, otherwise assume JPEG or PNG
                // jsPDF checks the data URI header
                doc.addImage(imgData, 'JPEG', 16, yPos + 1, imgWidth - 2, imgHeight - 2, undefined, 'FAST')
            } catch (e) {
                console.warn(`Could not add photo ${i + 1}`, e)
                doc.setFontSize(8)
                doc.setTextColor(150, 150, 150)
                doc.text(`Error al cargar imagen ${i + 1}`, pageWidth / 2, yPos + imgHeight / 2, { align: 'center' })
            }
        } else {
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text(`Fotografía ${i + 1}`, pageWidth / 2, yPos + imgHeight / 2, { align: 'center' })
        }

        doc.setTextColor(0, 0, 0)
        yPos += imgHeight + 5
    }

    createPageFooter(doc, pageWidth, pageHeight, 25)

    // Save PDF
    doc.save(`PSI_${data.numeroInforme || 'preview'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

// Helper to fetch image and convert to Base64 to avoid CORS issues in jsPDF
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
    try {
        const res = await fetch(imageUrl)
        const blob = await res.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                resolve(base64)
            }
            reader.onerror = () => {
                console.error('Error reading blob as base64')
                resolve(null)
            }
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        console.error('Error fetching image for PDF:', e)
        return null
    }
}

function createPage1Header(doc: jsPDF, pageWidth: number) {
    // Blue header background
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(0, 0, pageWidth, 35, 'F')

    // PSI box (white text on darker blue)
    doc.setFillColor(35, 50, 65)
    doc.rect(15, 10, 25, 18, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('PSI', 27.5, 22, { align: 'center' })

    // Title
    doc.setFontSize(16)
    doc.text('PARTE DE', 45, 18)
    doc.setFontSize(14)
    doc.text('SERVICIO E INTERVENCIÓN', 45, 25)

    // Orange squares logo (right side)
    const logoX = pageWidth - 50
    doc.setFillColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2])
    doc.rect(logoX, 12, 8, 8, 'F')
    doc.rect(logoX + 10, 12, 8, 8, 'F')

    // Organization name
    doc.setFontSize(11)
    doc.text('PROTECCIÓN CIVIL', logoX + 20, 18)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('BORMUJOS', logoX + 20, 24)

    // Reset text color
    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
}

function createSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number) {
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(x, y, width, 5, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x + 2, y + 3.5)
    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFont('helvetica', 'normal')
}

function createResourceTables(doc: jsPDF, data: PsiFormState, x: number, y: number) {
    const colWidth = 25

    // Table 1 headers
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(x, y, colWidth, 5, 'F')
    doc.rect(x + colWidth, y, colWidth, 5, 'F')
    doc.rect(x + colWidth * 2, y, colWidth, 5, 'F')

    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('VEHÍCULOS', x + colWidth / 2, y + 3.5, { align: 'center' })
    doc.text('EQUIPO', x + colWidth * 1.5, y + 3.5, { align: 'center' })
    doc.text('WALKIES', x + colWidth * 2.5, y + 3.5, { align: 'center' })

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    // Table 1 rows
    let rowY = y + 5
    data.tabla1.slice(0, 6).forEach((row, i) => {
        doc.rect(x, rowY, colWidth, 5)
        doc.rect(x + colWidth, rowY, colWidth, 5)
        doc.rect(x + colWidth * 2, rowY, colWidth, 5)
        doc.text(row.vehiculo || '', x + 1, rowY + 3.5)
        doc.text(row.equipo || '', x + colWidth + 1, rowY + 3.5)
        doc.text(row.walkie || '', x + colWidth * 2 + 1, rowY + 3.5)
        rowY += 5
    })

    rowY += 3

    // Table 2 headers
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(x + colWidth, rowY, colWidth, 5, 'F')
    doc.rect(x + colWidth * 2, rowY, colWidth, 5, 'F')

    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text('EQUIPO', x + colWidth * 1.5, rowY + 3.5, { align: 'center' })
    doc.text('WALKIES', x + colWidth * 2.5, rowY + 3.5, { align: 'center' })

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])

    // Table 2 rows
    rowY += 5
    data.tabla2.slice(0, 3).forEach((row, i) => {
        doc.rect(x + colWidth, rowY, colWidth, 5)
        doc.rect(x + colWidth * 2, rowY, colWidth, 5)
        doc.text(row.equipo || '', x + colWidth + 1, rowY + 3.5)
        doc.text(row.walkie || '', x + colWidth * 2 + 1, rowY + 3.5)
        rowY += 5
    })
}

function createTimeSection(doc: jsPDF, data: PsiFormState, y: number) {
    const pageWidth = doc.internal.pageSize.getWidth()
    createSectionHeader(doc, 'PAUTAS DE TIEMPO', 15, y, pageWidth - 30)

    y += 7
    const boxWidth = (pageWidth - 50) / 5
    const times = [
        { label: 'LLAMADA', value: data.tiempos.llamada },
        { label: 'SALIDA', value: data.tiempos.salida },
        { label: 'LLEGADA', value: data.tiempos.llegada },
        { label: 'TERMINADO', value: data.tiempos.terminado },
        { label: 'DISPONIBLE', value: data.tiempos.disponible }
    ]

    doc.setFontSize(7)
    times.forEach((time, i) => {
        const x = 20 + (i * boxWidth)
        doc.rect(x, y, boxWidth - 5, 8)
        doc.setFont('helvetica', 'bold')
        doc.text(time.label, x + (boxWidth - 5) / 2, y + 11, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.text(time.value || '', x + (boxWidth - 5) / 2, y + 5, { align: 'center' })
    })
}

function createTypologySection(doc: jsPDF, data: PsiFormState, y: number) {
    const pageWidth = doc.internal.pageSize.getWidth()
    createSectionHeader(doc, 'TIPOLOGÍA DE SERVICIO', 15, y, pageWidth - 30)

    y += 7
    const colWidth = (pageWidth - 40) / 3

    // Column headers
    const columns = [
        { title: 'PREVENCIÓN', x: 17 },
        { title: 'INTERVENCIÓN', x: 17 + colWidth },
        { title: 'OTROS', x: 17 + colWidth * 2 }
    ]

    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    columns.forEach(col => {
        doc.rect(col.x, y, colWidth - 4, 5, 'F')
        doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(col.title, col.x + (colWidth - 4) / 2, y + 3.5, { align: 'center' })
    })

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    y += 7

    // Prevención items
    const prevItems = [
        { label: 'MANTENIMIENTO', checked: data.prevencion.mantenimiento },
        { label: 'PRÁCTICAS', checked: data.prevencion.practicas },
        { label: 'SUMINISTROS', checked: data.prevencion.suministros },
        { label: 'PREVENTIVO', checked: data.prevencion.preventivo },
        { label: 'OTROS', checked: data.prevencion.otros }
    ]

    prevItems.forEach((item, i) => {
        drawCheckboxItem(doc, item.label, item.checked, columns[0].x + 2, y + (i * 5), i + 1)
    })

    // Intervención items
    const intItems = [
        { label: 'SOPORTE VITAL', checked: data.intervencion.svb },
        { label: 'INCENDIOS', checked: data.intervencion.incendios },
        { label: 'INUNDACIONES', checked: data.intervencion.inundaciones },
        { label: 'OTROS RIESGOS METEO', checked: data.intervencion.otros_riesgos_meteo },
        { label: 'ACTIVACIÓN PEM-BOR', checked: data.intervencion.activacion_pem_bor },
        { label: 'OTROS', checked: data.intervencion.otros }
    ]

    intItems.forEach((item, i) => {
        drawCheckboxItem(doc, item.label, item.checked, columns[1].x + 2, y + (i * 5), i + 1)
    })

    // Otros items
    const otherItems = [
        { label: 'REUNIÓN COORDINACIÓN', checked: data.otros.reunion_coordinacion },
        { label: 'REUNIÓN ÁREAS', checked: data.otros.reunion_areas },
        { label: 'LIMPIEZA', checked: data.otros.limpieza },
        { label: 'FORMACIÓN', checked: data.otros.formacion },
        { label: 'OTROS', checked: data.otros.otros }
    ]

    otherItems.forEach((item, i) => {
        drawCheckboxItem(doc, item.label, item.checked, columns[2].x + 2, y + (i * 5), i + 1)
    })
}

function drawCheckboxItem(doc: jsPDF, label: string, checked: boolean, x: number, y: number, num: number) {
    doc.setFontSize(7)
    doc.text(`${num}`, x, y + 3)
    doc.text(label, x + 5, y + 3)
    doc.rect(x + 45, y, 4, 4)
    if (checked) {
        doc.setFont('helvetica', 'bold')
        doc.text('X', x + 46, y + 3)
        doc.setFont('helvetica', 'normal')
    }
}

function createCasualtySection(doc: jsPDF, data: PsiFormState, y: number) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')

    // HERIDOS
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(15, y, 85, 5, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text('HERIDOS', 17, y + 3.5)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('SI', 105, y + 3.5)
    doc.rect(110, y + 1, 3, 3)
    if (data.heridosSi) doc.text('X', 110.5, y + 3.5)

    doc.text('NO', 117, y + 3.5)
    doc.rect(123, y + 1, 3, 3)
    if (data.heridosNo) doc.text('X', 123.5, y + 3.5)

    doc.text('Nº', 130, y + 3.5)
    doc.rect(135, y + 1, 10, 3)
    doc.text(data.heridosNum || '', 136, y + 3.5)

    // FALLECIDOS
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(150, y, 45, 5, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFont('helvetica', 'bold')
    doc.text('FALLECIDOS', 152, y + 3.5)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const pageWidth = doc.internal.pageSize.getWidth()
    const offset = pageWidth - 45
    doc.text('SI', offset, y + 3.5)
    doc.rect(offset + 5, y + 1, 3, 3)
    if (data.fallecidosSi) doc.text('X', offset + 5.5, y + 3.5)

    doc.text('NO', offset + 12, y + 3.5)
    doc.rect(offset + 18, y + 1, 3, 3)
    if (data.fallecidosNo) doc.text('X', offset + 18.5, y + 3.5)

    doc.text('Nº', offset + 25, y + 3.5)
    doc.rect(offset + 30, y + 1, 10, 3)
    doc.text(data.fallecidosNum || '', offset + 31, y + 3.5)
}

function createTrafficSection(doc: jsPDF, data: PsiFormState, y: number) {
    const pageWidth = doc.internal.pageSize.getWidth()
    createSectionHeader(doc, 'EN ACCIDENTES DE TRÁFICO', 15, y, pageWidth - 30)

    y += 7
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('MATRÍCULA VEHÍCULOS IMPLICADOS', 17, y)

    doc.setFont('helvetica', 'normal')
    y += 3
    const matWidth = 20
    data.matriculasImplicados.forEach((mat, i) => {
        doc.rect(17 + (i * (matWidth + 2)), y, matWidth, 5)
        doc.text(mat || '', 18 + (i * (matWidth + 2)), y + 3.5)
    })

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('AUTORIDAD QUE INTERVIENEN', 17, y)
    doc.setFont('helvetica', 'normal')
    doc.rect(17, y + 2, 40, 5)
    doc.text(data.autoridadInterviene || '', 18, y + 5.5)

    doc.setFont('helvetica', 'bold')
    doc.text('POLICÍA LOCAL DE', 110, y)
    doc.setFont('helvetica', 'normal')
    doc.rect(138, y + 2, 25, 5)
    doc.text(data.policiaLocalDe || '', 139, y + 5.5)

    doc.setFont('helvetica', 'bold')
    doc.text('GUARDIA CIVIL DE', pageWidth - 60, y)
    doc.setFont('helvetica', 'normal')
    doc.rect(pageWidth - 30, y + 2, 25, 5)
    doc.text(data.guardiaCivilDe || '', pageWidth - 29, y + 5.5)
}



function createFooterSignatures(doc: jsPDF, data: PsiFormState, y: number, pageWidth: number, pageHeight: number, footerMargin: number) {
    // Calculate available specific position
    const sigHeight = 45
    const footerY = pageHeight - footerMargin - sigHeight - 5 // 5mm padding

    const leftWidth = (pageWidth - 30) / 2
    const rightWidth = leftWidth

    // INDICATIVOS QUE INFORMAN
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(15, footerY, leftWidth - 2, 5, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('INDICATIVOS QUE INFORMAN', 17, footerY + 3.5)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.rect(15, footerY + 5, leftWidth - 2, 15)
    doc.text(data.indicativosInforman || '', 16, footerY + 9, { maxWidth: leftWidth - 5 })

    // VB JEFE DE SERVICIO
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(15 + leftWidth, footerY, rightWidth, 5, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFont('helvetica', 'bold')
    doc.text('VB JEFE DE SERVICIO', 17 + leftWidth, footerY + 3.5)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.rect(15 + leftWidth, footerY + 5, rightWidth, 15)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text('FIRMA JEFE SERVICIO', 17 + leftWidth, footerY + 8)

    // Add signature image if available
    if (data.firmaJefe) {
        try {
            doc.addImage(data.firmaJefe, 'PNG', 17 + leftWidth, footerY + 9, 40, 10)
        } catch (e) {
            console.warn('Could not add Jefe signature')
        }
    }

    // Bottom row: INDICATIVO CUMPLIMENTA and RESPONSABLE DEL TURNO
    const bottomY = footerY + 22
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(15, bottomY, leftWidth - 2, 4, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(7)
    doc.text('INDICATIVO QUE CUMPLIMENTA', 17, bottomY + 2.8)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFontSize(6)
    doc.rect(15, bottomY + 4, leftWidth - 2, 3)
    doc.text(data.indicativoCumplimenta || '', 16, bottomY + 6.5)

    doc.setFont('helvetica', 'normal')
    doc.rect(15, bottomY + 7, leftWidth - 2, 13)
    doc.text('FIRMA INFORMANTE', 17, bottomY + 10)
    if (data.firmaInformante) {
        try {
            doc.addImage(data.firmaInformante, 'PNG', 17, bottomY + 11, 35, 8)
        } catch (e) {
            console.warn('Could not add Informante signature')
        }
    }

    // RESPONSABLE DEL TURNO
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(15 + leftWidth, bottomY, rightWidth, 4, 'F')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('RESPONSABLE DEL TURNO', 17 + leftWidth, bottomY + 2.8)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
    doc.setFontSize(6)
    doc.rect(15 + leftWidth, bottomY + 4, rightWidth, 3)
    doc.setFont('helvetica', 'normal')
    doc.text(data.responsableTurno || '', 16 + leftWidth, bottomY + 6.5)

    doc.rect(15 + leftWidth, bottomY + 7, rightWidth, 13)
    doc.text('FIRMA RESPONSABLE', 17 + leftWidth, bottomY + 10)
    if (data.firmaResponsable) {
        try {
            doc.addImage(data.firmaResponsable, 'PNG', 17 + leftWidth, bottomY + 11, 35, 8)
        } catch (e) {
            console.warn('Could not add Responsable signature')
        }
    }
}

function createPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, footerHeight: number) {
    const y = pageHeight - footerHeight

    // Background
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.rect(0, y, pageWidth, footerHeight, 'F')

    // Center: Address
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Servicio de Protección Civil', pageWidth / 2, y + 6, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Ayuntamiento de Bormujos (Sevilla)', pageWidth / 2, y + 10, { align: 'center' })
    doc.text('Calle Maestro Francisco Rodriguez | Avda Universidad de Salamanca', pageWidth / 2, y + 14, { align: 'center' })
    doc.text('info.pcivil@bormujos.net | www.proteccioncivilbormujos.es', pageWidth / 2, y + 18, { align: 'center' })

    // Left: Ayuntamiento de Bormujos Text/Logo
    // Using text as placeholder for logo
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Ayuntamiento de', 15, y + 10)
    doc.text('Bormujos', 15, y + 15)
    // Draw a small coat of arms shape placeholder
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.5)
    // doc.circle(25, y + 8, 4) // Simplified crown/shield

    // Right: Logo PC (Orange Squares + Text)
    const logoX = pageWidth - 60
    doc.setFillColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2])
    // 3 squares logo: 2 top, 1 bottom-left (or inverted U shape?)
    // Based on screenshot in brain: Looks like Top-Left, Top-Right, Bottom-Left
    doc.rect(logoX, y + 6, 6, 6, 'F') // Top Left
    doc.rect(logoX + 7, y + 6, 6, 6, 'F') // Top Right
    doc.rect(logoX, y + 13, 6, 6, 'F') // Bottom Left

    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('PROTECCIÓN CIVIL', logoX + 16, y + 10)
    doc.setFont('helvetica', 'bold')
    doc.text('BORMUJOS', logoX + 16, y + 15)

    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2])
}
