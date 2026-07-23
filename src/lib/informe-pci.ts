// Informe de mantenimientos correctivos de protección contra incendios.
// Sigue el modelo corporativo de informe ya empleado en Administración:
// cabecera con los dos logos, destinatario A/A, copia C/C, referencia
// invertida, cuerpo, tabla de actuaciones, firma y pie.

export interface ActuacionInforme {
  id: string
  edificio: string
  codigoCliente?: string | null
  descripcion: string
  prioridad: string
  importe?: number | null
  presupuesto?: string | null
  recurrente: boolean
  vecesDetectada?: number
  campanas?: string[]
  defectos?: string[]
}

export interface DatosInforme {
  destinatarioNombre: string
  destinatarioCargo: string
  copiaNombre: string
  copiaCargo: string
  firmanteNombre: string
  firmanteCargo: string
  asunto: string
  introduccion: string
  empresa: string
  actuaciones: ActuacionInforme[]
}

const esc = (t: any) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const eur = (n?: number | null) =>
  (n === null || n === undefined) ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

/** Referencia del documento con el mismo criterio que el resto de informes. */
export function referenciaInforme(fecha = new Date()): string {
  const d = fecha.getDate().toString().padStart(2, '0')
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const a = fecha.getFullYear().toString()
  return `${a}${m}${d}`.split('').reverse().join('')
}

export function construirInformePCI(datos: DatosInforme): { html: string; referencia: string; total: number } {
  const hoy = new Date()
  const fechaHoy = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  const referencia = referenciaInforme(hoy)
  const total = datos.actuaciones.reduce((s, a) => s + (a.importe || 0), 0)

  // Las actuaciones se agrupan por edificio: cada centro es un apartado.
  const porEdificio: Record<string, ActuacionInforme[]> = {}
  datos.actuaciones.forEach(a => { (porEdificio[a.edificio] ||= []).push(a) })

  const filas = Object.entries(porEdificio).map(([edificio, lista]) => {
    const subtotal = lista.reduce((s, a) => s + (a.importe || 0), 0)
    const cuerpo = lista.map(a => `
      <tr>
        <td>${esc(a.descripcion)}${a.recurrente ? `<div class="recu">Defecto recurrente: detectado en ${a.vecesDetectada || 2} revisiones consecutivas sin subsanar</div>` : ''}${a.defectos?.length ? `<ul class="defectos">${a.defectos.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}</td>
        <td class="c">${esc((a.prioridad || '').toUpperCase())}</td>
        <td class="c">${esc(a.presupuesto || '—')}</td>
        <td class="r">${eur(a.importe)}</td>
      </tr>`).join('')
    return `
      <tr class="edificio"><td colspan="4">${esc(edificio)}${lista[0]?.codigoCliente ? ` <span class="cod">(código ${esc(lista[0].codigoCliente)})</span>` : ''}</td></tr>
      ${cuerpo}
      <tr class="subtotal"><td colspan="3">Subtotal ${esc(edificio)}</td><td class="r">${eur(subtotal)}</td></tr>`
  }).join('')

  const nCentros = Object.keys(porEdificio).length
  const nActuaciones = datos.actuaciones.length

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe de mantenimientos correctivos PCI</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9.5pt; color: #000; }
  .page { width:210mm; min-height:297mm; padding:15mm 20mm 20mm 20mm; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #003366; padding-bottom:10px; margin-bottom:14px; }
  .header img { height:52px; object-fit:contain; }
  .header-right { text-align:right; }
  .header-right img { height:52px; }
  .header-right .sub { font-size:7pt; color:#555; margin-top:3px; }
  .dest { margin-bottom:14px; line-height:1.8; text-align:right; }
  .dest .nombre { font-weight:bold; }
  .ref { margin-bottom:10px; line-height:1.8; font-weight:bold; font-size:9pt; }
  hr { border:none; border-top:1px solid #bbb; margin:10px 0; }
  p { margin-bottom:8px; line-height:1.6; text-align:justify; }
  table { width:100%; border-collapse:collapse; margin:10px 0 14px; font-size:8.5pt; }
  thead tr { background:#003366; color:#fff; }
  thead th { padding:5px 8px; text-align:left; text-transform:uppercase; font-size:8pt; }
  tbody td { padding:5px 8px; border-bottom:1px solid #e0e0e0; vertical-align:top; }
  tr.edificio td { background:#e8eef5; font-weight:bold; color:#003366; text-transform:uppercase; font-size:8pt; letter-spacing:.3px; }
  tr.edificio .cod { font-weight:normal; text-transform:none; color:#666; }
  tr.subtotal td { background:#f5f5f5; font-weight:bold; font-size:8pt; }
  tr.total td { background:#003366; color:#fff; font-weight:bold; font-size:9.5pt; padding:7px 8px; }
  td.c { text-align:center; }
  td.r { text-align:right; white-space:nowrap; }
  .recu { color:#b91c1c; font-size:7.5pt; font-style:italic; margin-top:3px; }
  .defectos { margin:4px 0 0 14px; font-size:7.5pt; color:#555; }
  .defectos li { margin-bottom:1px; }
  .firma { margin-top:20px; line-height:1.8; }
  .firma .nombre { font-weight:bold; font-size:10pt; }
  .footer { margin-top:20px; border-top:1px solid #ddd; padding-top:5px; text-align:center; font-size:7pt; color:#888; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } tr { page-break-inside:avoid; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="/images/logo-ayuntamiento-bormujos.png" alt="Ayuntamiento de Bormujos" />
    <div class="header-right">
      <img src="/images/logo-proteccion-civil-bormujos.png" alt="Protección Civil Bormujos" />
      <div class="sub">Servicio Local de Protección Civil<br>Excmo. Ayto. De Bormujos (Sevilla)</div>
    </div>
  </div>

  <div class="dest">
    <div><span class="nombre">A/A: ${esc(datos.destinatarioNombre)}</span></div>
    <div>${esc(datos.destinatarioCargo)}</div>
    ${datos.copiaNombre ? `<br><div><span class="nombre">C/C: ${esc(datos.copiaNombre)}</span></div><div>${esc(datos.copiaCargo)}</div>` : ''}
  </div>

  <div class="ref">
    <div>REF: ${referencia} Informe de mantenimientos correctivos PCI</div>
    <div>ASUNTO: ${esc(datos.asunto)}</div>
  </div>

  <hr>

  <p>Por medio del presente ${esc(datos.firmanteNombre)} en calidad de ${esc(datos.firmanteCargo)} del Ayuntamiento de Bormujos informa para que surta los efectos oportunos.</p>

  ${datos.introduccion.split('\n').filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('')}

  <p>De las revisiones reglamentarias de las instalaciones de protección contra incendios realizadas por la empresa mantenedora <strong>${esc(datos.empresa)}</strong> se desprenden las siguientes anomalías, cuya subsanación se considera necesaria. Se relacionan a continuación las actuaciones a acometer, con el importe presupuestado por la empresa para cada una de ellas:</p>

  <table>
    <thead><tr><th>ACTUACIÓN</th><th style="text-align:center">PRIORIDAD</th><th style="text-align:center">PRESUPUESTO</th><th style="text-align:right">IMPORTE</th></tr></thead>
    <tbody>
      ${filas}
      <tr class="total"><td colspan="3">TOTAL DE LAS ACTUACIONES AUTORIZADAS (IVA incluido)</td><td class="r">${eur(total)}</td></tr>
    </tbody>
  </table>

  <p>El importe total asciende a <strong>${eur(total)}</strong>, correspondiente a ${nActuaciones} actuación${nActuaciones === 1 ? '' : 'es'} en ${nCentros} centro${nCentros === 1 ? '' : 's'} municipal${nCentros === 1 ? '' : 'es'}.</p>

  <p>Las actuaciones señaladas como <strong>recurrentes</strong> corresponden a deficiencias detectadas en dos o más revisiones consecutivas que, pese a haber sido presupuestadas en su momento, no han sido ejecutadas, por lo que persiste la deficiencia en la instalación.</p>

  <p>Se solicita autorización para que la empresa mantenedora proceda a la ejecución de los trabajos relacionados a la mayor brevedad posible, dada su incidencia sobre la seguridad de las personas y de los edificios municipales.</p>

  <div class="firma">
    <p>Sin más que añadir se firma el presente para que surta los efectos que proceda.</p>
    <p>En Bormujos a ${fechaHoy}</p>
    <br>
    <div class="nombre">${esc(datos.firmanteNombre)}</div>
    <div>${esc(datos.firmanteCargo)}</div>
    <div>Ayuntamiento de Bormujos</div>
  </div>

  <div class="footer">
    Calle Maestro D. Francisco Rodríguez esq. Avda. Universidad de Salamanca &nbsp;|&nbsp;
    www.proteccioncivilbormujos.es | info.pcivil@bormujos.net
  </div>
</div>
<script>window.onload = () => { window.print() }</script>
</body>
</html>`

  return { html, referencia, total }
}
