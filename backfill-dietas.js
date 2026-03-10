const fs = require('fs');
try {
  fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k && !process.env[k]) process.env[k] = v.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  });
} catch(e) {}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BAREMO_DEFAULT = [
  { horasMin: 4, importe: 29 },
  { horasMin: 8, importe: 45 },
  { horasMin: 12, importe: 65 }
];
const PRECIO_KM_DEFAULT = 0.19;
const HORAS_TURNO = { 'mañana': 5.5, 'tarde': 5, 'noche': 9 };

async function main() {
  const [configBaremo, configKm] = await Promise.all([
    prisma.configuracion.findUnique({ where: { clave: 'baremo_dietas' } }),
    prisma.configuracion.findUnique({ where: { clave: 'precio_km' } })
  ]);
  const rawBaremo = configBaremo?.valor;
  const baremo = rawBaremo
    ? (typeof rawBaremo === 'string' ? JSON.parse(rawBaremo) : rawBaremo)
    : BAREMO_DEFAULT;
  const rawKm = configKm?.valor;
  const precioKm = rawKm
    ? ((typeof rawKm === 'string' ? JSON.parse(rawKm) : rawKm)?.precio ?? PRECIO_KM_DEFAULT)
    : PRECIO_KM_DEFAULT;

  console.log('Baremo:', JSON.stringify(baremo));
  console.log('Precio km:', precioKm);

  const dietasExistentes = await prisma.dieta.findMany({
    where: { guardiaId: { not: null } },
    select: { guardiaId: true }
  });
  const guardiaIdsConDieta = new Set(dietasExistentes.map(d => d.guardiaId));

  const guardias = await prisma.guardia.findMany({
    include: { usuario: { include: { fichaVoluntario: true } } },
    orderBy: { fecha: 'asc' }
  });

  const sinDieta = guardias.filter(g => !guardiaIdsConDieta.has(g.id));
  console.log('Total guardias: ' + guardias.length + ' | Sin dieta: ' + sinDieta.length);

  let creadas = 0;
  let errores = 0;

  for (const guardia of sinDieta) {
    try {
      const horasTrabajadas = HORAS_TURNO[guardia.turno.toLowerCase()] ?? 5;
      const tramo = [...baremo].reverse().find(t => horasTrabajadas >= (t.horasMin ?? t.minHours ?? 0));
      const importeDia = tramo?.importe ?? tramo?.amount ?? 0;
      const kmIda = Number(guardia.usuario?.fichaVoluntario?.kmDesplazamiento ?? 0);
      const kilometros = kmIda * 2;
      const subtotalKm = parseFloat((kilometros * precioKm).toFixed(2));
      const totalDieta = parseFloat((importeDia + subtotalKm).toFixed(2));
      const mesAnio = guardia.fecha.toISOString().slice(0, 7);

      await prisma.dieta.create({
        data: {
          usuarioId: guardia.usuarioId,
          guardiaId: guardia.id,
          fecha: guardia.fecha,
          turno: guardia.turno,
          horasTrabajadas,
          importeDia,
          subtotalDietas: importeDia,
          kilometros,
          importeKm: precioKm,
          subtotalKm,
          totalDieta,
          mesAnio,
          estado: 'pendiente'
        }
      });
      creadas++;
      console.log('  OK ' + guardia.fecha.toISOString().slice(0,10) + ' ' + guardia.turno + ' - ' + guardia.usuario.nombre + ' ' + guardia.usuario.apellidos + ' - ' + totalDieta + 'EUR');
    } catch(e) {
      errores++;
      console.error('  ERR ' + guardia.id + ': ' + e.message);
    }
  }

  console.log('\nRESULTADO: ' + creadas + ' dietas creadas, ' + errores + ' errores');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
