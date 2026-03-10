
const fs = require('fs');
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^\"|\"$/g,'').replace(/^'|'$/g,'');
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.dieta.deleteMany({ where: { guardiaId: { not: null } } });
  console.log('Borradas: ' + result.count);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
