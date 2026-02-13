import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PsiFormState } from '@/types/psi'

export async function generatePsiPdf(data: PsiFormState) {
    const doc = new jsPDF()

    // Configuración inicial
    const pageWidth = doc.internal.pageSize.width
    const margin = 15
    let y = 15

    // --- CABECERA ---
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('PROTECCIÓN CIVIL BORMUJOS', pageWidth / 2, y, { align: 'center' })

    y += 10
    doc.setFontSize(12)
    doc.text('PARTE DE SERVICIO E INTERVENCIÓN', pageWidth / 2, y, { align: 'center' })

    y += 15

    // --- DATOS PRINCIPALES ---
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Fila 1: Fecha, Hora, Nº Informe
    const dateStr = data.fecha ? new Date(data.fecha).toLocaleDateString() : ''
    doc.text(`Fecha: ${dateStr}`, margin, y)
    doc.text(`Hora: ${data.hora}`, margin + 60, y)
    doc.text(`Nº Informe: ${data.numero || '---'}`, margin + 120, y)

    y += 8
    doc.text(`Lugar: ${data.lugar}`, margin, y)
    y += 8
    doc.text(`Motivo: ${data.motivo}`, margin, y)
    y += 8
    doc.text(`Alertante: ${data.alertante}`, margin, y)

    y += 12

    // --- TABLAS DE RECURSOS ---
    doc.setFont('helvetica', 'bold')
    doc.text('RECURSOS Y PERSONAL', margin, y)
    y += 4

    // Tabla 1: Vehículos / Equipo / Walkies
    const body1 = data.tabla1
        .filter(row => row.vehiculo || row.equipo || row.walkie)
        .map(row => [row.vehiculo, row.equipo, row.walkie])

    if (body1.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['Vehículos', 'Equipo', 'Walkies']],
            body: body1,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            margin: { left: margin, right: margin }
        })
        // @ts-ignore
        y = doc.lastAutoTable.finalY + 10
    }

    // Tabla 2: Equipo / Walkies (si hay datos)
    const body2 = data.tabla2
        .filter(row => row.equipo || row.walkie)
        .map(row => [row.equipo, row.walkie])

    if (body2.length > 0) {
        doc.text('EQUIPOS ADICIONALES', margin, y)
        y += 4
        autoTable(doc, {
            startY: y,
            head: [['Equipo', 'Walkies']],
            body: body2,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            margin: { left: margin, right: margin }
        })
        // @ts-ignore
        y = doc.lastAutoTable.finalY + 10
    }

    // --- PAUTAS DE TIEMPO ---
    doc.setFont('helvetica', 'bold')
    doc.text('PAUTAS DE TIEMPO', margin, y)
    y += 6

    const tiemposHead = [['Llamada', 'Salida', 'Llegada', 'Terminado', 'Disponible']]
    const tiemposBody = [[
        data.tiempos.llamada,
        data.tiempos.salida,
        data.tiempos.llegada,
        data.tiempos.terminado,
        data.tiempos.disponible
    ]]

    autoTable(doc, {
        startY: y,
        head: tiemposHead,
        body: tiemposBody,
        theme: 'plain',
        styles: { halign: 'center' },
        margin: { left: margin, right: margin }
    })
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10

    // --- TIPOLOGÍA ---
    // Simplificamos mostrando solo lo marcado
    doc.text('TIPOLOGÍA DEL SERVICIO', margin, y)
    y += 6

    const selectedTypes: string[] = []

    // Prevención
    if (data.prevencion.mantenimiento) selectedTypes.push('Prevención: Mantenimiento')
    if (data.prevencion.practicas) selectedTypes.push('Prevención: Prácticas')
    if (data.prevencion.suministros) selectedTypes.push('Prevención: Suministros')
    if (data.prevencion.preventivo) selectedTypes.push('Prevención: Preventivo')
    if (data.prevencion.otros) selectedTypes.push('Prevención: Otros')

    // Intervención
    if (data.intervencion.svb) selectedTypes.push('Intervención: SVB')
    if (data.intervencion.incendios) selectedTypes.push('Intervención: Incendios')
    if (data.intervencion.inundaciones) selectedTypes.push('Intervención: Inundaciones')
    if (data.intervencion.otros_riesgos_meteo) selectedTypes.push('Intervención: Riesgos Meteo')
    if (data.intervencion.activacion_pem_bor) selectedTypes.push('Intervención: PEM BOR')
    if (data.intervencion.otros) selectedTypes.push('Intervención: Otros')

    // Otros
    if (data.otros.reunion_coordinacion) selectedTypes.push('Otros: Reunión Coord.')
    if (data.otros.reunion_areas) selectedTypes.push('Otros: Reunión Áreas')
    if (data.otros.limpieza) selectedTypes.push('Otros: Limpieza')
    if (data.otros.formacion) selectedTypes.push('Otros: Formación')
    if (data.otros.otros) selectedTypes.push('Otros: Otros')

    if (selectedTypes.length > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const splitTypes = doc.splitTextToSize(selectedTypes.join(', '), pageWidth - 2 * margin)
        doc.text(splitTypes, margin, y)
        y += (splitTypes.length * 5) + 5
    }

    // --- DESCRIPCIONES ---
    if (data.otrosDescripcion || data.posiblesCausas) {
        y += 5
        if (data.otrosDescripcion) {
            doc.setFont('helvetica', 'bold')
            doc.text('Otros Descripción:', margin, y)
            y += 5
            doc.setFont('helvetica', 'normal')
            const desc = doc.splitTextToSize(data.otrosDescripcion, pageWidth - 2 * margin)
            doc.text(desc, margin, y)
            y += (desc.length * 5) + 5
        }

        if (data.posiblesCausas) {
            doc.setFont('helvetica', 'bold')
            doc.text('Posibles Causas:', margin, y)
            y += 5
            doc.setFont('helvetica', 'normal')
            const causas = doc.splitTextToSize(data.posiblesCausas, pageWidth - 2 * margin)
            doc.text(causas, margin, y)
            y += (causas.length * 5) + 5
        }
    }

    // --- RESULTADO / CASUALTIES ---
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('RESULTADO', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')

    let resultadoText = ''
    if (data.heridosSi) resultadoText += `Heridos: SI (${data.heridosNum || 0})  `
    else if (data.heridosNo) resultadoText += `Heridos: NO  `

    if (data.fallecidosSi) resultadoText += `Fallecidos: SI (${data.fallecidosNum || 0})`
    else if (data.fallecidosNo) resultadoText += `Fallecidos: NO`

    if (resultadoText) {
        doc.text(resultadoText, margin, y)
        y += 8
    }

    // --- TRÁFICO ---
    const matriculas = data.matriculasImplicados.filter(m => m).join(', ')
    if (matriculas || data.autoridadInterviene) {
        y += 5
        doc.setFont('helvetica', 'bold')
        doc.text('ACCIDENTES DE TRÁFICO', margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        if (matriculas) {
            doc.text(`Matrículas Implicadas: ${matriculas}`, margin, y)
            y += 5
        }
        if (data.autoridadInterviene) {
            doc.text(`Autoridad: ${data.autoridadInterviene}`, margin, y)
            y += 5
        }
        if (data.policiaLocalDe) {
            doc.text(`Policía Local: ${data.policiaLocalDe}`, margin, y)
            y += 5
        }
        if (data.guardiaCivilDe) {
            doc.text(`Guardia Civil: ${data.guardiaCivilDe}`, margin, y)
            y += 5
        }
    }

    // --- OBSERVACIONES ---
    if (data.observaciones) {
        y += 5
        doc.setFont('helvetica', 'bold')
        doc.text('OBSERVACIONES', margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        const obs = doc.splitTextToSize(data.observaciones, pageWidth - 2 * margin)

        // Check page break
        if (y + (obs.length * 5) > doc.internal.pageSize.height - 20) {
            doc.addPage()
            y = 20
        }

        doc.text(obs, margin, y)
        y += (obs.length * 5) + 10
    }

    // --- FIRMAS / PIE ---
    // Check space for signatures (need ~40 units)
    if (y + 40 > doc.internal.pageSize.height - 20) {
        doc.addPage()
        y = 20
    }

    y += 10
    doc.setFontSize(8)
    doc.text('Indicativo Informa:', margin, y)
    doc.text(data.indicativosInforman || '.......................', margin, y + 5)

    doc.text('VB Jefe Servicio:', pageWidth / 2, y)
    doc.text(data.vbJefeServicio || '.......................', pageWidth / 2, y + 5)

    y += 15
    doc.text('Indicativo Cumplimenta:', margin, y)
    doc.text(data.indicativoCumplimenta || '.......................', margin, y + 5)

    doc.text('Responsable Turno:', pageWidth / 2, y)
    doc.text(data.responsableTurno || '.......................', pageWidth / 2, y + 5)


    // Save
    doc.save(`PSI_${data.numero || 'borrador'}.pdf`)
}
