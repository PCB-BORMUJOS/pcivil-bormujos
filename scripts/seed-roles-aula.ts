/**
 * Crea los roles del aula de formación independiente:
 *  - alumno_externo:   acceso exclusivo al aula para cursar.
 *  - formador_externo: acceso exclusivo al aula para impartir/evaluar.
 *
 * Uso (apuntando a la rama dev-formacion de Neon):
 *   DATABASE_URL="<cadena dev-formacion>" npx tsx scripts/seed-roles-aula.ts
 *
 * Es idempotente (upsert): se puede ejecutar varias veces sin duplicar.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const roles = [
        { nombre: 'alumno_externo', descripcion: 'Alumno externo — acceso exclusivo al aula de formación' },
        { nombre: 'formador_externo', descripcion: 'Formador externo — imparte y evalúa en el aula de formación' },
    ]
    for (const r of roles) {
        const rol = await prisma.rol.upsert({
            where: { nombre: r.nombre },
            update: { descripcion: r.descripcion },
            create: { nombre: r.nombre, descripcion: r.descripcion, permisos: [] },
        })
        console.log('✓ Rol listo:', rol.nombre)
    }
}

main()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
