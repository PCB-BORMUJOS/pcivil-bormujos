# CLAUDE.md — Protección Civil Bormujos

## Contexto del proyecto
Aplicación web de gestión integral para el servicio de Protección Civil de Bormujos (Sevilla, España).
URL producción: https://pcivil-bormujos.vercel.app
Repositorio: PCB-BORMUJOS/pcivil-bormujos
Deploy: Vercel (auto-deploy desde branch main)

## Stack técnico
- Next.js 14.2.5 App Router
- TypeScript estricto (sin any salvo justificación)
- Prisma 5.22.0 + PostgreSQL Neon
- NextAuth 4.24.7
- TailwindCSS
- Leaflet 1.9.4 con react-leaflet (SIEMPRE dynamic imports)
- Lucide React 0.395.0
- Vercel Blob
- pdfjs-dist 3.11.174 (NO actualizar a v4)
- Dev: macOS, VS Code, zsh

## REGLAS CRÍTICAS

### Base de datos
- NUNCA usar prisma migrate dev
- SIEMPRE npx prisma db push
- Ejecutar npx prisma generate después de cada db push

### TypeScript
- npx tsc --noEmit antes de cada commit
- Cero errores antes de push

### Git
- Commits frecuentes tras cada funcionalidad verificada
- git add . && git commit -m "feat/fix/chore: desc" && git push origin main

### Fechas
- SIEMPRE timezone Europe/Madrid
- Correcto: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
- Incorrecto: new Date().toISOString().split('T')[0]
- Usar utilidad getTodaySpain() del proyecto

### Edición de archivos largos
- Usar Python str.replace() para archivos grandes
- Verificar texto exacto con grep -n antes de reemplazar
- Para archivos complejos: git checkout HEAD -- archivo y reescribir completo

## SCHEMA PRISMA - CAMPOS CRÍTICOS

### FichaVoluntario (tabla: fichas_voluntario)
- indicativo2 (NO indicativo)
- dniNie (NO dni)
- telefonoFijo (NO telefono)
- areaAsignada

### Usuario
- numeroVoluntario (NO indicativo)
- Turno mañana se almacena con ñ en BD

## REGLAS DE NEGOCIO

### B-12
- Personal administrativo, esOperativo: false
- EXCLUIR de conteos operativos y listas de turnos
- Filtro: fichaVoluntario: { indicativo2: { not: 'B-12' } }

### Cuadrante
- Modelo SemanaPublicada controla visibilidad
- Sin publicar: usuarios solo ven conteo numérico
- Publicado: todos ven indicativos y nombres
- Admins: siempre ven todo

## MAPAS LEAFLET
- SIEMPRE dynamic imports con ssr: false
- Modales sobre mapa: z-[1000]
- Coordenadas Bormujos: [37.3710, -6.0719] zoom 14

## MÓDULOS COMPLETADOS (NO reescribir)
Dashboard, Mi Área, Incendios, Socorrismo, Vehículos, Logística,
Administración, Manuales, Transmisiones, Formación, Acción Social,
Drones/RPAS, Estadísticas, CECOPAL, Prácticas, Megacode, Cuadrantes, Partes PSI

## MÓDULOS PENDIENTES
- Partes: PAS-SVB, PCR, POT, PRD, PRH, PRMB, PRV-FSV, PRV-VIR, RPAS
- Google OAuth login (NextAuth Google provider)

## TRAZABILIDAD
import { registrarAudit, getUsuarioAudit } from '@/lib/audit'
const { usuarioId, usuarioNombre } = getUsuarioAudit(session)
await registrarAudit({ accion: 'CREATE', entidad: 'X', entidadId: id, descripcion: '...', usuarioId, usuarioNombre, modulo: 'X' })

## VEHÍCULOS EN BD
FSV 8142LNH furgoneta Renault Master
PMA PMA-001 remolque Remolque Ligero
UMJ 8263KVJ turismo Peugeot 3008
VIR 2875LMK pickup Nissan Navara 4x4

## COMANDOS ÚTILES
npx tsc --noEmit
npx prisma db push && npx prisma generate
node scripts/backup_db.mjs
grep -n "texto" src/app/(app)/modulo/page.tsx
sed -n '100,150p' src/app/(app)/modulo/page.tsx
