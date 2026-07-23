// Datos reales del contrato PCI del Ayuntamiento de Bormujos.
// Fuente: actas de revisión y presupuestos de Telson Sistemas de Seguridad, S.L.
// (Hércules Seguridad). Carpeta Drive "PCI Hercules Adjuntos".
// Cobertura: 4 ciclos — sep-2025 (anual), dic-2025, mar-2026, jul-2026 —
// más las campañas de presupuestos correctivos de feb-2026.

// Correspondencia entre el código de cliente de la mantenedora y el edificio
// que YA existe en la aplicación. Evita duplicar edificios: los datos PCI se
// enganchan al registro existente, conservando sus equipos, planos y DEA.
// Los códigos sin entrada aquí se crean como edificio nuevo.
export const MAPA_EDIFICIOS_APP = {
  '12810': '16. CEIP Clara Campoamor',
  '12816': '17. CEIP Santo Domingo de Silos',
  '12818': '15. CEIP Padre Manjón',
  '12821': '18. CEIP Manantial',
  '12825': '25. Sede de Protección Civil',
  '12829': '07. Escuela de Música y Danza',
  '12830': '02. CC La Atarazana',
  '12838': '03. Hacienda Belén',
  '12839': '05. Jefatura de Policía Local',
  '12840': '20. Caseta de Feria',
  '12847': '21. Nave de Obras',
  '12848': '13. Pabellón Cubierto',
  '12850': '01. Ayuntamiento',
  '12851': '22. Nave Medioambiente',
  '12852': '09. Centro de Asociaciones',
  '12853': '04. Centro de Formación',
  '12854': '10. Polideportivo Municipal',
  '12855': '12. Piscina Cubierta',
  '12856': '06. Tercera Edad José Pérez Vega',
  '12857': '23. Nave Cruzcampo',
  '13886': '14. Centro de SEPER',
  '12858': '24. Nave Policía Local',
  // Sin edificio equivalente en la aplicación: se crea nuevo.
  // '12859': Edificio Urbanismo
}

export const CAMPANAS = {
  'sep-2025': { fecha: '2025-09-30', tipo: 'ANUAL' },
  'dic-2025': { fecha: '2025-12-15', tipo: 'TRIMESTRAL' },
  'mar-2026': { fecha: '2026-03-15', tipo: 'TRIMESTRAL' },
  'jul-2026': { fecha: '2026-07-15', tipo: 'TRIMESTRAL' },
}
export const FECHA_CORRECTIVO_FEB = '2026-02-15'
export const TECNICO = 'Santiago Carracedo Cortés'

// Cada edificio: código de cliente, nombre, equipos de la última revisión,
// campañas con sus defectos y presupuesto, correctivos de feb-2026 y la acción
// correctiva consolidada del pipeline.
export const EDIFICIOS = [
  {
    codigo: '12810', nombre: 'Colegio Público Clara Campoamor', alias: 'Clara Campoamor',
    equipos: '17 EXT ABC 6kg, 1 CO2 5kg, 3 CO2 2kg, 9 BIE 25mm, ABA (abastecimiento + bomba eléctrica), central convencional 2 zonas (8 pulsadores / 8 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['4 extintores ABC y 1 CO2 caducados', '9 mangueras BIE en mal estado y 1 cristal roto', 'Central mal instalada — 80 m de cable', 'Boya del aljibe no funciona'], ppto: { numero: '6233', total: 2481.32 } },
      { c: 'dic-2025', defectos: ['4 extintores ABC y 1 CO2 caducados', '9 mangueras BIE en mal estado y 1 cristal roto', 'Central mal instalada — 80 m de cable', 'Boya del aljibe no funciona'] },
      { c: 'mar-2026', defectos: ['4 extintores ABC y 1 CO2 caducados', '9 mangueras BIE en mal estado y 1 cristal roto', 'Central mal instalada — 80 m de cable', 'Boya del aljibe no funciona'], ppto: { numero: '7295', total: 2741.38 } },
      { c: 'jul-2026', defectos: ['4 extintores ABC y 1 CO2 caducados', '9 mangueras BIE en mal estado y 1 cristal roto', 'Central mal instalada — 80 m de cable', 'Boya del aljibe no funciona'], ppto: { numero: '7890', total: 2741.38 } },
    ],
    correctivos: [{ numero: 'P-26/7093', total: 2527.06, concepto: 'Subsanación de anomalías: extintores, mangueras BIE, cristal, boya y 80 m de cable' }],
    accion: { descripcion: 'Reconfigurar central de detección, sustituir boya del aljibe y mangueras BIE', prioridad: 'alta', importe: 2741.38, recurrente: true, ppto: '7890' },
  },
  {
    codigo: '12816', nombre: 'Colegio Público Santo Domingo de Silos', alias: 'Santo Domingo de Silos',
    equipos: '21 EXT ABC 6kg, 2 CO2 5kg, 1 CO2 2kg, 9 BIE 25mm, central convencional 2 zonas (8 pulsadores / 4 sirenas), ABA (abastecimiento + bomba eléctrica + bomba diésel)',
    campanas: [
      { c: 'sep-2025', defectos: ['1 extintor pendiente de recarga', '9 mangueras BIE en mal estado', '5 pulsadores y 1 sirena averiados', 'GRUPO DE PRESIÓN no funciona'], ppto: { numero: '6234', total: 11300.07 } },
      { c: 'dic-2025', defectos: ['1 extintor pendiente de recarga', '9 mangueras BIE en mal estado', '5 pulsadores y 1 sirena averiados', 'GRUPO DE PRESIÓN no funciona'] },
      { c: 'mar-2026', defectos: ['1 extintor pendiente de recarga', '9 mangueras BIE en mal estado', '5 pulsadores y 1 sirena averiados', 'GRUPO DE PRESIÓN no funciona'], ppto: { numero: '7296', total: 11597.37 } },
      { c: 'jul-2026', defectos: ['1 extintor pendiente de recarga', '9 mangueras BIE en mal estado', '5 pulsadores y 1 sirena averiados', 'GRUPO DE PRESIÓN no funciona (sustitución 9.084,60 €)'], ppto: { numero: '7891', total: 11597.37 } },
    ],
    correctivos: [
      { numero: 'P-26/7095', total: 10992.37, concepto: 'Sustitución del grupo de presión contra incendios' },
      { numero: 'P-26/7094', total: 646.76, concepto: 'Subsanación de anomalías' },
    ],
    accion: { descripcion: 'Sustituir grupo de presión contra incendios', prioridad: 'alta', importe: 11597.37, recurrente: true, ppto: '7891', notas: 'Mayor importe abierto del contrato.' },
  },
  {
    codigo: '12818', nombre: 'Colegio Público Padre Manjón', alias: 'Padre Manjón',
    equipos: '26 EXT ABC 6kg, 2 CO2 2kg, 1 CO2 5kg, central convencional 2 zonas (9 pulsadores / 7 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['Extintores pendientes de retimbrado y caducados', 'Señalización deficiente', '4 mangueras BIE 45mm en mal estado', 'Central en obra'], ppto: { numero: '6235', total: 881.17 } },
      { c: 'dic-2025', defectos: ['Extintores pendientes de retimbrado y caducados', 'Señalización deficiente', 'Central con avería de placa', '11 extintores a altura incorrecta'] },
      { c: 'mar-2026', defectos: ['Extintores pendientes de retimbrado y caducados', 'Señalización deficiente', 'Extintores a altura incorrecta'], ppto: { numero: '7301', total: 225.01 } },
      { c: 'jul-2026', defectos: ['5 señalizaciones incorrectas, 3 caducadas y 5 equipos sin señalizar', '7 extintores a altura incorrecta', 'Extintores pendientes de retimbrado y caducados'], ppto: { numero: '7893', total: 231.79 } },
    ],
    correctivos: [
      { numero: 'P-26/7096', total: 211.02, concepto: 'Extintores y señalización' },
      { numero: 'P-26/7113', total: 533.42, concepto: 'Sustitución de central de incendios' },
    ],
    accion: { descripcion: 'Corregir señalización y altura de extintores, y sustituir la central de incendios', prioridad: 'media', importe: 231.79, recurrente: true, ppto: '7893', notas: 'Sustitución de central presupuestada aparte en P-26/7113 (533,42 €).' },
  },
  {
    codigo: '12821', nombre: 'Colegio Público El Manantial', alias: 'El Manantial',
    equipos: '7 EXT ABC 6kg, 11 CO2 2kg, 5 BIE 25mm, 1 columna seca, ABA bomba diésel, central convencional 4 zonas (15 pulsadores / 4 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['9 extintores ABC y 1 CO2 caducados', '5 mangueras BIE en mal estado', 'Baterías y 4 pulsadores averiados', 'GRUPO DIÉSEL no funciona'], ppto: { numero: '6237', total: 8039.68 } },
      { c: 'dic-2025', defectos: ['9 extintores ABC y 1 CO2 caducados', '5 mangueras BIE en mal estado', 'Baterías y 4 pulsadores averiados', 'GRUPO DIÉSEL no funciona'] },
      { c: 'mar-2026', defectos: ['9 extintores ABC y 1 CO2 caducados', '5 mangueras BIE en mal estado', 'Baterías y 4 pulsadores averiados', 'GRUPO DIÉSEL no funciona'], ppto: { numero: '7305', total: 8290.99 } },
      { c: 'jul-2026', defectos: ['9 extintores ABC y 1 CO2 caducados', '5 mangueras BIE en mal estado', 'Baterías y 4 pulsadores averiados', 'GRUPO DIÉSEL no funciona — motor no arranca, cuadro en el suelo (grupo de presión 5.922,50 €)'], ppto: { numero: '7895', total: 8290.99 } },
    ],
    correctivos: [
      { numero: 'P-26/7098', total: 7166.23, concepto: 'Sustitución del grupo de presión' },
      { numero: 'P-26/7097', total: 1089.36, concepto: 'Subsanación de anomalías' },
    ],
    accion: { descripcion: 'Sustituir grupo de presión de bomba diésel', prioridad: 'alta', importe: 8290.99, recurrente: true, ppto: '7895', notas: 'Presupuesto también referenciado como 7839. Motor no arranca y cuadro en el suelo.' },
  },
  {
    codigo: '12825', nombre: 'Protección Civil', alias: 'Protección Civil',
    equipos: 'Extintores portátiles',
    campanas: [
      { c: 'sep-2025', defectos: ['1 extintor pendiente de retimbrado (nº 05)'], ppto: { numero: '6238', total: 19.84 } },
      { c: 'dic-2025', defectos: ['1 extintor pendiente de retimbrado (nº 05)', '1 extintor pendiente de recarga (nº 11)'] },
    ],
    correctivos: [{ numero: 'P-26/7102', total: 19.84, concepto: 'Retimbrado de 1 extintor' }],
    accion: { descripcion: 'Retimbrado de extintor', prioridad: 'baja', importe: 19.84, recurrente: true, ppto: 'P-26/7102' },
    nota: 'No aparece en las campañas trimestrales de mar-2026 ni jul-2026 en la documentación disponible.',
  },
  {
    codigo: '12829', nombre: 'Conservatorio / Escuela Municipal de Música y Danza', alias: 'Conservatorio',
    equipos: '13 EXT ABC 6kg, 3 CO2 5kg, 2 CO2 2kg, central convencional 4 zonas (26 detectores térmicos, 3 pulsadores / 3 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['3 extintores a altura incorrecta', '3 pulsadores no funcionan', 'Cableado de 3 zonas cortado — 40 m', 'Colgar 3 extintores'], ppto: { numero: '6239', total: 3469.07 } },
      { c: 'dic-2025', defectos: ['3 extintores a altura incorrecta', '3 pulsadores no funcionan', 'Cableado de 3 zonas cortado — 40 m', 'Colgar 3 extintores'] },
      { c: 'mar-2026', defectos: ['3 extintores a altura incorrecta', '3 pulsadores no funcionan', 'Cableado de 3 zonas cortado — 40 m', 'Colgar 3 extintores'], ppto: { numero: '7311', total: 1657.70 } },
      { c: 'jul-2026', defectos: ['3 extintores a altura incorrecta', '3 pulsadores no funcionan', 'Cableado de 3 zonas cortado — 40 m', 'Colgar 3 extintores'], ppto: { numero: '7897', total: 1657.70 } },
    ],
    correctivos: [{ numero: 'P-26/7103', total: 1549.77, concepto: '40 m de cable e instalación' }],
    accion: { descripcion: 'Reparar cableado de 3 zonas cortado y sustituir pulsadores', prioridad: 'alta', importe: 1657.70, recurrente: true, ppto: '7897' },
  },
  {
    codigo: '12830', nombre: 'Centro Cultural Atarazana', alias: 'Atarazana',
    equipos: '22 EXT ABC 6kg, 6 CO2 5kg, 1 CO2 2kg, central convencional 6 zonas (57 detectores iónicos, 12 pulsadores / 7 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['Extintores caducados', 'Detectores iónicos caducados que provocan falsos fuegos', 'Sirena exterior rota', '18 pilotos averiados'], ppto: { numero: '6241', total: 3133.85 } },
      { c: 'dic-2025', defectos: ['Extintores caducados', 'Detectores iónicos caducados que provocan falsos fuegos', 'Sirena exterior rota', '18 pilotos averiados'] },
      { c: 'mar-2026', defectos: ['20 extintores pendientes de retimbrado y 5 caducados', 'Detectores iónicos caducados que provocan falsos fuegos', 'Sirena exterior rota', '18 pilotos averiados'], ppto: { numero: '7313', total: 3783.79 } },
      { c: 'jul-2026', defectos: ['20 extintores pendientes de retimbrado y 5 caducados', 'Detectores iónicos caducados que provocan falsos fuegos', 'Sirena exterior rota', '18 pilotos averiados'], ppto: { numero: '7898', total: 3783.79 } },
    ],
    correctivos: [{ numero: 'P-26/7104', total: 3224.67, concepto: '57 detectores ópticos, sirena, 18 pilotos, desplazamientos y altura' }],
    accion: { descripcion: 'Sustituir 57 detectores iónicos caducados y la sirena exterior', prioridad: 'alta', importe: 3783.79, recurrente: true, ppto: '7898', notas: 'Los detectores caducados provocan falsos fuegos.' },
  },
  {
    codigo: '12838', nombre: 'Hacienda Belén', alias: 'Hacienda Belén',
    equipos: '12 EXT ABC 6kg, 4 CO2 5kg, central convencional 2 zonas (22 pulsadores / 4 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['1 extintor pendiente de recarga (nº 03)', '2 extintores caducados (nº 06 y 09)', '5 extintores a altura incorrecta', 'Falta 1 sirena — 30 m de cable'], ppto: { numero: '6242', total: 348.00 } },
      { c: 'dic-2025', defectos: ['1 extintor pendiente de recarga (nº 03)', '2 extintores caducados (nº 06 y 09)', '5 extintores a altura incorrecta', 'Falta 1 sirena — 30 m de cable'] },
      { c: 'mar-2026', defectos: ['1 extintor pendiente de recarga (nº 03)', '2 extintores caducados (nº 06 y 09)', '5 extintores a altura incorrecta', 'Falta 1 sirena — 30 m de cable'], ppto: { numero: '7312', total: 281.20 } },
      { c: 'jul-2026', defectos: ['1 extintor pendiente de recarga (nº 03)', '2 extintores caducados (nº 06 y 09)', '5 extintores a altura incorrecta', 'Falta 1 sirena — 30 m de cable'], ppto: { numero: '7899', total: 281.20 } },
    ],
    correctivos: [{ numero: 'P-26/7106', total: 355.98, concepto: 'Recarga, 2 extintores, altura, 1 sirena interior y 30 m de cable' }],
    accion: { descripcion: 'Recarga y sustitución de extintores, corrección de altura e instalación de sirena', prioridad: 'media', importe: 281.20, recurrente: true, ppto: '7899' },
  },
  {
    codigo: '12839', nombre: 'Policía Local', alias: 'Policía Local',
    equipos: '5 EXT ABC 6kg, 2 CO2 5kg (sin central de detección)',
    campanas: [
      { c: 'sep-2025', defectos: ['1 extintor DESAPARECIDO (nº 01)', '2 extintores caducados', '1 extintor pendiente de recarga (nº 11)', '3 extintores a altura incorrecta'], ppto: { numero: '6253', total: 154.40 } },
      { c: 'dic-2025', defectos: ['1 extintor DESAPARECIDO (nº 01)', '2 extintores caducados', '2 extintores pendientes de recarga (nº 08 y 11)', '3 extintores a altura incorrecta'] },
      { c: 'mar-2026', defectos: ['1 extintor DESAPARECIDO (nº 01)', '5 extintores caducados', 'Retimbrado y recarga pendientes', '3 extintores a altura incorrecta'], ppto: { numero: '7310', total: 201.83 } },
      { c: 'jul-2026', defectos: ['1 extintor DESAPARECIDO (nº 01) — persiste', '5 extintores caducados', 'Retimbrado y recarga pendientes', '3 extintores a altura incorrecta'], ppto: { numero: '7900', total: 201.83 } },
    ],
    correctivos: [
      { numero: 'P-26/7108', total: 156.57, concepto: '2 extintores, altura y recarga' },
      { numero: 'P-26/7091', total: 15643.96, concepto: 'Cámaras IP LPR, alimentación solar, router y mantenimiento', categoria: 'CCTV' },
      { numero: 'P-26/7092', total: 8960.34, concepto: 'Grabador NVR 256CH y 10 discos de 8 TB', categoria: 'CCTV' },
      { numero: 'P-26/7112', total: 452.06, concepto: 'Renovación de cableado UTP CAT6 exterior — recinto ferial', categoria: 'CCTV' },
    ],
    accion: { descripcion: 'Reponer extintor desaparecido, sustituir caducados y corregir alturas', prioridad: 'media', importe: 201.83, recurrente: true, ppto: '7900', notas: 'El extintor nº 01 lleva desaparecido desde sep-2025.' },
    accionesExtra: [
      { descripcion: 'Instalación de cámaras IP LPR con alimentación solar y router', prioridad: 'media', importe: 15643.96, categoria: 'CCTV', ppto: 'P-26/7091' },
      { descripcion: 'Grabador NVR 256CH y 10 discos de 8 TB', prioridad: 'media', importe: 8960.34, categoria: 'CCTV', ppto: 'P-26/7092' },
      { descripcion: 'Renovación de cableado UTP CAT6 exterior del recinto ferial', prioridad: 'baja', importe: 452.06, categoria: 'CCTV', ppto: 'P-26/7112' },
    ],
  },
  {
    codigo: '12840', nombre: 'Caseta Municipal', alias: 'Caseta Municipal',
    equipos: '8 EXT ABC 6kg, 2 CO2 5kg, central convencional 2 zonas (24 detectores ópticos, 3 pulsadores / 2 sirenas)',
    campanas: [
      { c: 'sep-2025', defectos: ['2 extintores a altura incorrecta', 'La central no resetea (zona 2)', 'Baterías agotadas', 'Detectores inadecuados', 'Sirenas sin señal acústica'], ppto: { numero: '6244', total: 2006.18 } },
      { c: 'dic-2025', defectos: ['2 extintores a altura incorrecta', 'La central no resetea (zona 2)', 'Baterías agotadas', 'Detectores inadecuados', 'Sirenas sin señal acústica'] },
      { c: 'mar-2026', defectos: ['2 extintores a altura incorrecta', 'La central no resetea (zona 2)', 'Baterías agotadas', 'Detectores inadecuados', 'Sirenas sin señal acústica'], ppto: { numero: '7307', total: 2041.20 } },
      { c: 'jul-2026', defectos: ['2 extintores a altura incorrecta', 'La central no resetea (zona 2)', 'Baterías agotadas', 'Detectores inadecuados', 'Sirenas sin señal acústica'], ppto: { numero: '7901', total: 2041.20 } },
    ],
    correctivos: [{ numero: 'P-26/7107', total: 2115.98, concepto: 'Central 2 zonas, 2 baterías, 2 sirenas, 24 detectores térmicos, plataforma y altura' }],
    accion: { descripcion: 'Sustituir central (avería en zona 2) y cambiar detectores a térmicos', prioridad: 'alta', importe: 2041.20, recurrente: true, ppto: '7901' },
  },
  {
    codigo: '12847', nombre: 'Obras y Servicios', alias: 'Obras y Servicios',
    equipos: '2 EXT ABC 6kg, 1 CO2 5kg, 1 CO2 2kg, 3 espuma AFFF 6kg, central convencional 2 zonas (13 detectores térmicos, 1 pulsador / 1 sirena)',
    campanas: [
      { c: 'sep-2025', defectos: ['Extintores caducados', 'La central no funciona — sustituir', '280 m de cable', 'Falta sirena', 'Falta pulsador'], ppto: { numero: '6275', total: 3046.78 } },
      { c: 'dic-2025', defectos: ['Extintores caducados', 'La central no funciona — sustituir', '280 m de cable', 'Falta sirena', 'Falta pulsador'] },
      { c: 'mar-2026', defectos: ['Extintores caducados', 'La central no funciona — sustituir', '280 m de cable', 'Falta sirena', 'Falta pulsador'], ppto: { numero: '7306', total: 3169.60 } },
      { c: 'jul-2026', defectos: ['Extintores caducados', 'La central no funciona — sustituir', '280 m de cable', 'Falta sirena', 'Falta pulsador'], ppto: { numero: '7902', total: 3169.60 } },
    ],
    correctivos: [{ numero: 'P-26/7111', total: 3063.16, concepto: 'Central, 2 baterías, pulsador, 2 sirenas, 13 detectores térmicos, plataforma y 280 m de cable' }],
    accion: { descripcion: 'Sustituir central de detección y 280 m de cableado', prioridad: 'alta', importe: 3169.60, recurrente: true, ppto: '7902' },
  },
  {
    codigo: '12848', nombre: 'Pabellón Cubierto', alias: 'Pabellón Cubierto',
    equipos: 'Central convencional 2 zonas (recepción). Discrepancia en el nº de extintores: certificado 2 / detalle 16, de ellos 14 caducados',
    campanas: [
      { c: 'sep-2025', defectos: ['1 extintor caducado (nº 15)', '1 extintor a altura incorrecta'], ppto: { numero: '6254', total: 33.40 } },
      { c: 'dic-2025', defectos: ['1 extintor caducado (nº 15)', '1 extintor a altura incorrecta'] },
      { c: 'mar-2026', defectos: ['11 extintores ABC y 3 CO2 caducados', '1 extintor a altura incorrecta'], ppto: { numero: '7304', total: 586.46 } },
      { c: 'jul-2026', defectos: ['3 CO2 y 11 ABC caducados', '1 extintor a altura incorrecta'], ppto: { numero: '7903', total: 586.46 } },
    ],
    correctivos: [{ numero: 'P-26/7109', total: 33.40, concepto: '1 extintor ABC' }],
    accion: { descripcion: 'Sustituir 14 extintores caducados', prioridad: 'media', importe: 586.46, recurrente: true, ppto: '7903', notas: 'Fuerte aumento de caducados entre sep-2025 (1) y mar/jul-2026 (14). Revisar discrepancia entre certificado y detalle.' },
  },
  {
    codigo: '12851', nombre: 'Nave Medioambiente', alias: 'Nave Medioambiente',
    equipos: '3 EXT ABC 6kg, 1 CO2 2kg, 1 CO2 5kg, central convencional 2 zonas (Aguilera, 9 detectores ópticos, 4 pulsadores / 1 sirena)',
    campanas: [
      { c: 'sep-2025', defectos: ['Detectores caducados', 'Faltan 2 detectores térmicos'], ppto: { numero: '6256', total: 465.85 } },
      { c: 'dic-2025', defectos: ['Detectores caducados', 'Faltan 2 detectores térmicos', 'Batería agotada'] },
      { c: 'mar-2026', defectos: ['1 extintor caducado', 'Detectores caducados'], ppto: { numero: '7303', total: 936.72 } },
      { c: 'jul-2026', defectos: ['1 extintor caducado', 'Detectores caducados'], ppto: { numero: '7904', total: 936.72 } },
    ],
    correctivos: [{ numero: 'P-26/7100', total: 903.33, concepto: '11 detectores térmicos y plataforma' }],
    accion: { descripcion: 'Sustituir detectores caducados por térmicos y cambiar batería', prioridad: 'media', importe: 936.72, recurrente: true, ppto: '7904' },
  },
  {
    codigo: '12852', nombre: 'Centro de Recursos de Asociaciones', alias: 'Centro de Asociaciones',
    equipos: 'Extintores portátiles',
    campanas: [
      { c: 'sep-2025', defectos: ['2 extintores a altura incorrecta'] },
      { c: 'dic-2025', defectos: ['2 extintores a altura incorrecta'] },
      { c: 'mar-2026', defectos: ['2 extintores a altura incorrecta'] },
      { c: 'jul-2026', defectos: ['2 extintores a altura incorrecta (id02 cuadro, id03 salón)'] },
    ],
    correctivos: [],
    accion: { descripcion: 'Corregir la altura de 2 extintores', prioridad: 'baja', importe: null, recurrente: true },
  },
  {
    codigo: '12853', nombre: 'Centro de Formación', alias: 'Centro de Formación',
    equipos: '17 EXT ABC 6kg, 1 CO2 2kg',
    campanas: [
      { c: 'sep-2025', defectos: [] }, { c: 'dic-2025', defectos: [] },
      { c: 'mar-2026', defectos: [] }, { c: 'jul-2026', defectos: [] },
    ],
    correctivos: [],
  },
  {
    codigo: '12854', nombre: 'Polideportivo', alias: 'Polideportivo',
    equipos: '7 EXT ABC 6kg, 7 CO2 5kg',
    campanas: [
      { c: 'sep-2025', defectos: ['Retimbrados facturados — factura B2515231/25'] },
      { c: 'dic-2025', defectos: ['2 extintores ABC y 1 CO2 caducados', 'Señalización deficiente', '1 extintor a altura incorrecta'] },
      { c: 'mar-2026', defectos: ['2 extintores ABC y 1 CO2 caducados', 'Señalización deficiente', '1 extintor a altura incorrecta'], ppto: { numero: '7300', total: 177.10 } },
      { c: 'jul-2026', defectos: ['2 extintores ABC y 1 CO2 caducados', 'Señalización deficiente', '1 extintor a altura incorrecta'], ppto: { numero: '7905', total: 177.10 } },
    ],
    correctivos: [{ numero: 'P-26/7110', total: 177.10, concepto: '2 extintores ABC, 1 CO2 y 11 señales' }],
    accion: { descripcion: 'Sustituir 3 extintores y reponer señalización', prioridad: 'media', importe: 177.10, recurrente: true, ppto: '7905' },
  },
  {
    codigo: '12855', nombre: 'Piscina Cubierta', alias: 'Piscina Cubierta',
    equipos: 'Extintores portátiles',
    campanas: [
      { c: 'sep-2025', defectos: ['1 extintor caducado (nº 12)', 'Resto sin revisar por obras'], ppto: { numero: '6258', total: 54.21 } },
      { c: 'dic-2025', defectos: ['1 extintor caducado (nº 12)'] },
      { c: 'mar-2026', tipo: 'ANUAL', defectos: ['1 extintor caducado'], ppto: { numero: '7299', total: 33.40 } },
      { c: 'jul-2026', defectos: ['1 extintor pendiente de retimbrado (nº 11)', '1 extintor caducado (nº 04)'], ppto: { numero: '7906', total: 53.24 } },
    ],
    correctivos: [],
    accion: { descripcion: 'Sustituir 1 extintor y retimbrar otro', prioridad: 'baja', importe: 53.24, recurrente: true, ppto: '7906', notas: 'La instalación estuvo en obras, lo que limitó las revisiones de 2025.' },
  },
  {
    codigo: '12856', nombre: 'Centro de la Tercera Edad Dr. José Pérez Vega', alias: 'Tercera Edad',
    equipos: '4 extintores',
    campanas: [
      { c: 'mar-2026', defectos: [] }, { c: 'jul-2026', defectos: [] },
    ],
    correctivos: [],
    nota: 'No consta en las campañas de sep-2025 ni dic-2025 en la documentación disponible.',
  },
  {
    codigo: '12857', nombre: 'Nave de la Cruzcampo', alias: 'Nave Cruzcampo',
    equipos: '10 EXT ABC 6kg, 2 CO2 5kg, 1 BIE 25mm, ABA (abastecimiento + bomba eléctrica)',
    campanas: [
      { c: 'sep-2025', defectos: [] },
      { c: 'dic-2025', defectos: ['1 extintor pendiente de retimbrado y carga (nº 14)'] },
      { c: 'mar-2026', defectos: ['1 extintor pendiente de retimbrado y recarga', '3 extintores caducados'], ppto: { numero: '7298', total: 135.04 } },
      { c: 'jul-2026', defectos: ['1 extintor pendiente de retimbrado y recarga', '3 extintores caducados', 'Cristal de la BIE en mal estado (no presupuestado)'], ppto: { numero: '7907', total: 135.04 } },
    ],
    correctivos: [],
    accion: { descripcion: 'Retimbrado, recarga y sustitución de 3 extintores', prioridad: 'media', importe: 135.04, recurrente: true, ppto: '7907', notas: 'El cristal de la BIE no está presupuestado.' },
  },
  {
    codigo: '12858', nombre: 'Depósito de Vehículos', alias: 'Depósito de Vehículos',
    equipos: '2 EXT ABC 6kg, 1 CO2 2kg, 1 ABC 3kg, central convencional 2 zonas (Guardal, de 1997; 6 detectores térmicos, 1 pulsador / 1 sirena)',
    campanas: [
      { c: 'sep-2025', defectos: ['Central totalmente inoperativa', '200 m de cable', 'Plataforma necesaria'], ppto: { numero: '6260', total: 2363.13 } },
      { c: 'dic-2025', defectos: ['Central totalmente inoperativa', '200 m de cable'] },
      { c: 'mar-2026', defectos: ['Central totalmente inoperativa', '120 m de cable'], ppto: { numero: '7297', total: 1960.19 } },
      { c: 'jul-2026', defectos: ['Central totalmente inoperativa (equipo de 1997)', '120 m de cable'], ppto: { numero: '7908', total: 1960.19 } },
    ],
    correctivos: [{ numero: 'P-26/7101', total: 1960.19, concepto: 'Central 2 zonas, 2 baterías, 6 detectores, pulsador, 2 sirenas, 120 m de cable y plataforma' }],
    accion: { descripcion: 'Sustituir central de detección de 1997, totalmente inoperativa', prioridad: 'alta', importe: 1960.19, recurrente: true, ppto: '7908' },
  },
  {
    codigo: '12859', nombre: 'Edificio Urbanismo', alias: 'Urbanismo',
    equipos: '6 EXT ABC 6kg',
    campanas: [{ c: 'jul-2026', defectos: [] }],
    correctivos: [],
    nota: 'No consta en campañas anteriores en la documentación disponible.',
  },
  {
    codigo: '13886', nombre: 'Centro Seper — Instituto de Adultos', alias: 'Centro Seper',
    equipos: 'Extintores ABC y CO2, mangueras 45 mm, columna seca',
    campanas: [
      { c: 'jul-2026', defectos: ['3 extintores ABC y 1 CO2 a sustituir', '2 mangueras de 45 mm', 'Válvula siamesa de columna seca', '13 señales'], ppto: { numero: '7909', total: 871.58 } },
    ],
    correctivos: [{ numero: 'P-26/7099', total: 871.58, concepto: 'Extintores, mangueras, válvula de columna seca y señalización' }],
    accion: { descripcion: 'Sustituir extintores, mangueras, válvula siamesa de columna seca y señalización', prioridad: 'media', importe: 871.58, recurrente: false, ppto: '7909' },
  },
  {
    codigo: '12850', nombre: 'Sede Ayuntamiento de Bormujos', alias: 'Sede Ayuntamiento',
    equipos: 'Instalación de protección contra incendios de la sede',
    campanas: [],
    correctivos: [{ numero: 'P-26/7090', total: 8960.34, concepto: 'Grabador NVR 256CH y 10 discos de 8 TB', categoria: 'CCTV' }],
    accionesExtra: [
      { descripcion: 'Grabador NVR 256CH y 10 discos de 8 TB', prioridad: 'media', importe: 8960.34, categoria: 'CCTV', ppto: 'P-26/7090' },
    ],
    nota: 'Edificio de facturación de la cuota mensual de mantenimiento.',
  },
]

export const FACTURAS = [
  { numero: 'B2604804', fecha: '2026-03-02', concepto: 'Cuota de mantenimiento', edificio: '12850' },
  { numero: 'B2606901', fecha: '2026-04-01', concepto: 'Cuota de mantenimiento', edificio: '12850' },
  { numero: 'B2608808', fecha: '2026-05-04', concepto: 'Cuota de mantenimiento', edificio: '12850' },
  { numero: 'B2610828', fecha: '2026-06-01', concepto: 'Cuota de mantenimiento', edificio: '12850' },
  { numero: 'B2515231/25', fecha: '2025-09-30', concepto: 'Recargas y retimbrados (albaranes 102680 + 102700)', importe: 114.71, edificio: '12854' },
  { numero: 'B2418086', fecha: '2024-12-31', concepto: 'Pendiente de leer importe', edificio: '12850' },
  { numero: 'B2501360', fecha: '2025-01-31', concepto: 'Pendiente de leer importe', edificio: '12850' },
  { numero: 'B2502830', fecha: '2025-02-28', concepto: 'Pendiente de leer importe', edificio: '12850' },
]
