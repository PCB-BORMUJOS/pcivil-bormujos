import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import { PsiFormState } from '@/types/psi'

export async function generatePsiPdfV2(data: PsiFormState) {
    // Load template PDF from public folder
    const existingPdfBytes = await fetch('/parte_psi_template.pdf').then(res => res.arrayBuffer())

    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { height } = firstPage.getSize()

    // Text helper with proper wrapping
    const drawText = (
        page: PDFPage,
        text: string | undefined | null,
        x: number,
        y: number,
        options: { size?: number; font?: PDFFont; maxWidth?: number; align?: 'left' | 'center' } = {}
    ) => {
        if (!text) return
        const size = options.size || 10
        const font = options.font || helveticaFont
        const textStr = String(text)

        // Simple wrapping for long text
        if (options.maxWidth) {
            const words = textStr.split(' ')
            let line = ''
            let yOffset = 0

            for (const word of words) {
                const testLine = line + word + ' '
                const width = font.widthOfTextAtSize(testLine, size)

                if (width > options.maxWidth && line) {
                    page.drawText(line.trim(), { x, y: y - yOffset, size, font, color: rgb(0, 0, 0) })
                    line = word + ' '
                    yOffset += size + 2
                } else {
                    line = testLine
                }
            }
            if (line) {
                page.drawText(line.trim(), { x, y: y - yOffset, size, font, color: rgb(0, 0, 0) })
            }
        } else {
            page.drawText(textStr, { x, y, size, font, color: rgb(0, 0, 0) })
        }
    }

    // Checkbox helper
    const drawCheck = (page: PDFPage, condition: boolean, x: number, y: number) => {
        if (condition) {
            page.drawText('X', { x, y, size: 12, font: helveticaBold, color: rgb(0, 0, 0) })
        }
    }

    // PAGE 1: MAIN DATA
    // Coordinates are from bottom-left (pdf-lib standard). Adjust based on visual inspection

    // Header info
    drawText(firstPage, data.fecha, 80, height - 100, { size: 10 })
    drawText(firstPage, data.hora, 200, height - 100, { size: 10 })
    drawText(firstPage, data.numero, 450, height - 90, { size: 12, font: helveticaBold })

    // Main fields
    drawText(firstPage, data.lugar, 80, height - 140, { size: 10, maxWidth: 450 })
    drawText(firstPage, data.motivo, 80, height - 165, { size: 10, maxWidth: 450 })
    drawText(firstPage, data.alertante, 80, height - 190, { size: 10, maxWidth: 450 })

    // Vehicle/Equipment tables (right side)
    let yTable = height - 130
    data.tabla1.forEach((row, i) => {
        drawText(firstPage, row.vehiculo, 340, yTable - (i * 18), { size: 9 })
        drawText(firstPage, row.equipo, 420, yTable - (i * 18), { size: 9 })
        drawText(firstPage, row.walkie, 500, yTable - (i * 18), { size: 9 })
    })

    // Second table
    let yTable2 = height - 240
    data.tabla2.forEach((row, i) => {
        drawText(firstPage, row.equipo, 420, yTable2 - (i * 18), { size: 9 })
        drawText(firstPage, row.walkie, 500, yTable2 - (i * 18), { size: 9 })
    })

    // Circulation
    drawText(firstPage, data.circulacion, 80, height - 265, { size: 10 })
    drawText(firstPage, data.vbJefeServicio, 350, height - 265, { size: 9 })

    // Time markers
    const yTime = height - 310
    drawText(firstPage, data.tiempos.llamada, 60, yTime, { size: 10 })
    drawText(firstPage, data.tiempos.salida, 150, yTime, { size: 10 })
    drawText(firstPage, data.tiempos.llegada, 240, yTime, { size: 10 })
    drawText(firstPage, data.tiempos.terminado, 330, yTime, { size: 10 })
    drawText(firstPage, data.tiempos.disponible, 420, yTime, { size: 10 })

    // Typology checkboxes
    const yTyp = height - 370
    const colOffsets = [50, 220, 390]

    // Prevention column
    drawCheck(firstPage, data.prevencion.mantenimiento, colOffsets[0], yTyp)
    drawCheck(firstPage, data.prevencion.practicas, colOffsets[0], yTyp - 20)
    drawCheck(firstPage, data.prevencion.suministros, colOffsets[0], yTyp - 40)
    drawCheck(firstPage, data.prevencion.preventivo, colOffsets[0], yTyp - 60)
    drawCheck(firstPage, data.prevencion.otros, colOffsets[0], yTyp - 80)

    // Intervention column
    drawCheck(firstPage, data.intervencion.svb, colOffsets[1], yTyp)
    drawCheck(firstPage, data.intervencion.incendios, colOffsets[1], yTyp - 20)
    drawCheck(firstPage, data.intervencion.inundaciones, colOffsets[1], yTyp - 40)
    drawCheck(firstPage, data.intervencion.otros_riesgos_meteo, colOffsets[1], yTyp - 60)
    drawCheck(firstPage, data.intervencion.activacion_pem_bor, colOffsets[1], yTyp - 80)
    drawCheck(firstPage, data.intervencion.otros, colOffsets[1], yTyp - 100)

    // Others column
    drawCheck(firstPage, data.otros.reunion_coordinacion, colOffsets[2], yTyp)
    drawCheck(firstPage, data.otros.reunion_areas, colOffsets[2], yTyp - 20)
    drawCheck(firstPage, data.otros.limpieza, colOffsets[2], yTyp - 40)
    drawCheck(firstPage, data.otros.formacion, colOffsets[2], yTyp - 60)
    drawCheck(firstPage, data.otros.otros, colOffsets[2], yTyp - 80)

    // Descriptions
    drawText(firstPage, data.otrosDescripcion, 60, height - 490, { size: 9, maxWidth: 480 })
    drawText(firstPage, data.posiblesCausas, 60, height - 530, { size: 9, maxWidth: 480 })

    // Casualties
    const yCas = height - 570
    drawCheck(firstPage, data.heridosSi, 80, yCas)
    drawCheck(firstPage, data.heridosNo, 120, yCas)
    drawText(firstPage, data.heridosNum, 180, yCas, { size: 9 })

    drawCheck(firstPage, data.fallecidosSi, 280, yCas)
    drawCheck(firstPage, data.fallecidosNo, 320, yCas)
    drawText(firstPage, data.fallecidosNum, 380, yCas, { size: 9 })

    // Traffic accident data
    const yTraffic = height - 610
    data.matriculasImplicados.forEach((mat, i) => {
        drawText(firstPage, mat, 60 + (i * 120), yTraffic, { size: 9 })
    })

    drawText(firstPage, data.autoridadInterviene, 60, yTraffic - 25, { size: 9, maxWidth: 200 })
    drawText(firstPage, data.policiaLocalDe, 280, yTraffic - 25, { size: 9 })
    drawText(firstPage, data.guardiaCivilDe, 430, yTraffic - 25, { size: 9 })

    // Observations
    drawText(firstPage, data.observaciones, 60, height - 680, { size: 9, maxWidth: 500 })

    // Footer signatures
    drawText(firstPage, data.indicativosInforman, 60, 160, { size: 8, maxWidth: 200 })
    drawText(firstPage, data.indicativoCumplimenta, 60, 80, { size: 8 })
    drawText(firstPage, data.responsableTurno, 320, 80, { size: 8 })

    // Embed signature images
    if (data.firmaJefe) {
        try {
            const img = await pdfDoc.embedPng(data.firmaJefe)
            firstPage.drawImage(img, { x: 380, y: 140, width: 150, height: 60 })
        } catch (e) {
            console.warn('Could not embed Jefe signature:', e)
        }
    }
    if (data.firmaInformante) {
        try {
            const img = await pdfDoc.embedPng(data.firmaInformante)
            firstPage.drawImage(img, { x: 60, y: 50, width: 120, height: 50 })
        } catch (e) {
            console.warn('Could not embed Informante signature:', e)
        }
    }
    if (data.firmaResponsable) {
        try {
            const img = await pdfDoc.embedPng(data.firmaResponsable)
            firstPage.drawImage(img, { x: 320, y: 50, width: 120, height: 50 })
        } catch (e) {
            console.warn('Could not embed Responsable signature:', e)
        }
    }

    // Save and download
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `PSI_${data.numero || 'preview'}_${new Date().toISOString().split('T')[0]}.pdf`
    link.click()
}
