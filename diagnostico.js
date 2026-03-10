
const fs = require('fs');
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0,idx).trim();
    const v = line.slice(idx+1).trim().replace(/^\"|\"$/g,'').replace(/^'|'$/g,'');
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.dieta.count();
  const guardias = await prisma.guardia.count();
  const porMes = await prisma.dieta.groupBy({ by: ['mesAnio'], _count: { id: true } });
  console.log('Total dietas: ' + total);
  console.log('Total guardias: ' + guardias);
  porMes.forEach(m => console.log('  ' + m.mesAnio + ': ' + m._count.id + ' dietas'));
  await prisma.$disconnect();
}
main();
