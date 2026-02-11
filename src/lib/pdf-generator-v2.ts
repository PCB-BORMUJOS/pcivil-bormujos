import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib'
import { PsiFormState } from '@/types/psi'

export async function generatePsiPdfV2(data: PsiFormState) {
    // 1. Cargar el PDF plantilla desde public
    const existingPdfBytes = await fetch('/parte_psi_template.pdf').then(res => res.arrayBuffer())

    // 2. Cargar documento
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()

    // Helper para dibujar texto
    const draw = (text: string | undefined | null, x: number, y: number, options: { size?: number, font?: PDFFont, maxWidth?: number } = {}) => {
        if (!text) return
        const size = options.size || 10
        const font = options.font || helveticaFont

        // Simple text wrapping if maxWidth provided (basic implementation)
        if (options.maxWidth) {
            // For now just draw, assuming it fits or manual wrap needed. 
            // pdf-lib doesn't have auto-wrap for drawText built-in simply.
        }

        firstPage.drawText(String(text), {
            x,
            y, // Note: y is from bottom in PDF-lib usually!
            size,
            font,
            color: rgb(0, 0, 0),
        })
    }

    // Dibujar checks (X)
    const drawCheck = (condition: boolean, x: number, y: number) => {
        if (condition) {
            firstPage.drawText('X', { x, y, size: 12, font: helveticaBold })
        }
    }

    // COORDENADAS ESTIMADAS (Y starts from bottom. Height is ~842 for A4)
    // Ajustar estos valores probando. Asumimos A4 Portrait.

    // HEADER
    // draw(data.numeroInforme, 400, 750, { size: 12, font: helveticaBold }) // Just decoration usually

    // FILA 1
    const Y_ROW1 = 720
    draw(data.fecha, 60, Y_ROW1)
    draw(data.hora, 180, Y_ROW1)
    draw(data.numeroInforme, 450, Y_ROW1 + 10, { size: 12, font: helveticaBold })

    const Y_ROW2 = 700
    draw(data.lugar, 60, Y_ROW2)

    const Y_ROW3 = 680
    draw(data.motivo, 60, Y_ROW3)

    const Y_ROW4 = 660
    draw(data.alertante, 60, Y_ROW4)

    // TABLAS (Right side)
    // Vehiculos
    let yTable = 630
    data.tabla1.forEach((row, i) => {
        draw(row.vehiculo, 300, yTable - (i * 15))
        draw(row.equipo, 400, yTable - (i * 15))
        draw(row.walkie, 500, yTable - (i * 15))
    })

    // PAUTAS TIEMPO
    const Y_TIME = 540
    draw(data.tiempos.llamada, 50, Y_TIME)
    draw(data.tiempos.salida, 150, Y_TIME)
    draw(data.tiempos.llegada, 250, Y_TIME)
    draw(data.tiempos.terminado, 350, Y_TIME)
    draw(data.tiempos.disponible, 450, Y_TIME)

    // TIPOLOGIA
    // Prevencion / Intervencion columns
    const Y_TYP = 480

    // Column 1
    drawCheck(data.prevencion.mantenimiento, 40, Y_TYP)
    drawCheck(data.prevencion.practicas, 40, Y_TYP - 15)
    // ... complete mapping later based on visual inspection

    // OBSERVACIONES
    draw(data.observaciones, 50, 200, { maxWidth: 500 })

    // FIRMAS
    // Embed images
    if (data.firmaJefe) {
        const img = await pdfDoc.embedPng(data.firmaJefe)
        firstPage.drawImage(img, { x: 400, y: 120, width: 100, height: 50 })
    }
    if (data.firmaInformante) {
        const img = await pdfDoc.embedPng(data.firmaInformante)
        firstPage.drawImage(img, { x: 50, y: 60, width: 100, height: 50 })
    }
    if (data.firmaResponsable) {
        const img = await pdfDoc.embedPng(data.firmaResponsable)
        firstPage.drawImage(img, { x: 300, y: 60, width: 100, height: 50 })
    }

    // 3. Serializar
    const pdfBytes = await pdfDoc.save()

    // 4. Descargar
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `PSI_${data.numeroInforme || 'preview'}.pdf`
    link.click()
}
