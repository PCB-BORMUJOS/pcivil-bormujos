// Genera el informe en Node para comprobar dónde cae el párrafo nuevo.
// jsPDF no puede usar doc.save() fuera del navegador, así que se intercepta.
import { writeFileSync } from 'fs'
import jsPDF from 'jspdf'
;(jsPDF as any).API.save = function (nombre: string) {
    writeFileSync(`/tmp/${nombre}`, Buffer.from(this.output('arraybuffer')))
    return this
}
async function main() {
    const { generarInformeDietasPDF } = await import('../src/lib/informe-dietas')
    await generarInformeDietasPDF({
        titulo: 'Informe de liquidacion de dietas',
        periodoTexto: 'Agosto 2026',
        mesAnio: '2026-08',
        intro: ['Texto de introduccion de prueba.'],
        columnas: [
            { label: 'Indicativo', align: 'left', width: 30 },
            { label: 'Nombre', align: 'left', width: 90 },
            { label: 'Total', align: 'right', width: 40 },
        ],
        filas: [['B-21', 'Natalia Torres Cordero', '120.00 EUR']],
        totales: ['TOTALES', '', '120.00 EUR'],
        resumenImporte: '120.00 EUR',
        resumenMeta: '1 efectivo(s)',
        firmanteNombre: 'Diego Gavino Rodriguez',
        firmanteCargo: 'Subinspector Jefe de Policia Local de Bormujos',
        nombreArchivo: 'prueba-dietas.pdf',
    })
    console.log('PDF generado en /tmp/prueba-dietas.pdf')
}
main().catch(e => { console.error(e); process.exit(1) })
