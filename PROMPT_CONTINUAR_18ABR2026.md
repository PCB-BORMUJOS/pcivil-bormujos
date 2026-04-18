# PROMPT PARA CONTINUAR - PROTECCIÓN CIVIL BORMUJOS
**Actualizado:** 18 Abril 2026 - 22:30h

## TU ROL
Ingeniero Principal Senior. 15+ años en software de misión crítica.

**NO NEGOCIABLE:**
- Sin bucles ni repeticiones
- Solución desde causa raíz
- UNA decisión clara
- Cero errores tontos
- Si falta dato → asume opción robusta

## STACK
- Next.js 14.2.5 App Router
- TypeScript estricto
- Prisma 5.22.0 + PostgreSQL (Neon)
- NextAuth 4.24.7 / TailwindCSS
- Leaflet 1.9.4 (dynamic imports obligatorios)
- Lucide React 0.395.0 + react-icons/tb para TbDrone
- Vercel Blob + Deploy automático desde main
- Repo: PCB-BORMUJOS/pcivil-bormujos
- Dev: iMac + Mac Studio — branch main
- Último commit: bd0bca2

## ESTADO PROYECTO (18 ABR 2026)

### MÓDULOS 100% (13)
1. Dashboard — Calendar, VIOGEN, clima, guardias, vehículos
2. Mi Área — Dietas, cambio pwd, vestuario
3. Incendios — Inventario + ECI + hidrantes + editor planos multi-planta
4. Socorrismo — Inventario + DEAs + botiquines SVB + revisiones
5. Vehículos — Flota + docs + mantenimiento + mapa
6. Logística — Vista consolidada 3x3
7. Administración — Usuarios + roles + trazabilidad
8. Manuales — PDFs + Vercel Blob
9. Transmisiones — Módulo completo
10. Formación — Cursos, convocatorias, inscripciones
11. Acción Social — VIOGEN + cuadrante semanal
12. Drones/RPAS — Flota, pilotos, vuelos, NOTAMs ENAIRE
13. Estadísticas — 6 tabs con gráficas y exportar PDF

### EN DESARROLLO
Partes (10%): PSI completo, 9 formularios pendientes

### PLACEHOLDER
Prácticas — estructura básica creada

## TRABAJO HOY (18 ABR 2026)

### Multi-planta en Editor de Planos ECI
- Nuevo modelo PlanoEdificio (planos_edificio) + planoId en PlanoMarcador
- API /api/incendios/plano: GET/POST/PUT/DELETE por planta
- API /api/incendios/marcadores: acepta planoId
- UI: tarjeta multi-planta con añadir/ver/editor/PDF/eliminar por planta
- EditorPlano recibe planoId, filtra marcadores por planta
- iconos-config.ts centralizado: extintor_co2 y salida_emergencia añadidos
- EditorPlano usa getIconoEquipoECI — iconos consistentes con tabla ECI

## COMMITS RECIENTES
## MODELOS PRISMA CLAVE
- Incendios: Edificio, EquipoECI, Hidrante, PlanoEdificio (NUEVO), PlanoMarcador
- Inventario: CategoriaInventario, FamiliaArticulo, Articulo, PeticionMaterial
- Drones: Drone, BateriaDrone, PilotoDrone, Vuelo, ChecklistVuelo
- Partes: PartePSI
- Personal: FichaVoluntario, Guardia, Dieta, AsignacionVestuario

## ICONOS ECI — src/lib/iconos-config.ts
SIEMPRE usar estas funciones, nunca hardcodear iconos ECI.

## APIS CLAVE

### /api/incendios/plano (NUEVO)
### /api/incendios/marcadores
### /api/logistica
## PATRONES OBLIGATORIOS

Leaflet: dynamic imports + modales z-[1000]
Fechas: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
Trazabilidad: registrarAudit + getUsuarioAudit desde @/lib/audit
Editar archivos: python3 con str.replace (nunca sed multilínea en macOS)
db push: usar npx prisma db push (no migrate dev — hay drift con historial)

## .ENV LOCAL NECESARIO
## PENDIENTES PRIORITARIOS
1. ALTA: 9 formularios Partes (PRV-FSV, PRV-VIR, PRD, PRH, PRMB, PAS-SVB, PCR, POT, RPAS)
2. MEDIA: Capas zonas-uas y aerodromes en mapa Drones
3. MEDIA: Google Drive Shared Drive para PDFs partes

## VEHÍCULOS EN BD
FSV-8142LNH Renault Master | PMA-PMA001 Remolque | UMJ-8263KVJ Peugeot 3008 | VIR-2875LMK Nissan Navara

## COORDENADAS BORMUJOS
Centro: [37.3710, -6.0719] | Zoom: 14

## INICIO SESIÓN
1. git pull origin main && git log --oneline -5
2. Pregunta qué desarrollamos
3. Ejecuta sin repetir contexto
