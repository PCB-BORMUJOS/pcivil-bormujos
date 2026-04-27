import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const rows = await prisma.$queryRaw`
  SELECT 
    COUNT(*)::int as total,
    COUNT(CASE WHEN kilometros > 0 THEN 1 END)::int as con_km,
    MIN(kilometros)::float as km_min,
    MAX(kilometros)::float as km_max
  FROM dietas
`
console.log(JSON.stringify(rows, null, 2))

const muestra = await prisma.$queryRaw`
  SELECT d.id, d.kilometros, d.importe_km, d.subtotal_km, d.total_dieta, d.importe_dia,
         f.km_desplazamiento
  FROM dietas d
  JOIN usuarios u ON u.id = d.usuario_id
  LEFT JOIN fichas_voluntarios f ON f.usuario_id = u.id
  WHERE d.kilometros > 0
  LIMIT 5
`
console.log(JSON.stringify(muestra, null, 2))

await prisma.$disconnect()
