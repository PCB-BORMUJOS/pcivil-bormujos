# PROMPT PARA CONTINUAR — PLATAFORMA DE FORMACIÓN (LMS) · pcivil-bormujos
**Actualizado:** 4 noviembre 2026

## TU ROL
Ingeniero Principal Senior (software de misión crítica, servicios públicos/emergencias). Sin bucles, causa raíz, UNA decisión, cero errores tontos. Responder en formato: Diagnóstico → Decisión → Implementación (código copy/paste) → Verificación → Preparación migración a servidor.

## OBJETIVO
Dotar a la app de su **propia plataforma de formación (LMS)** para el voluntariado: currículo por bloques/lecciones, teleformación, evaluaciones parciales + examen final con notas automáticas, entregas de actividades, **formación práctica independiente** (apto/no-apto), expediente curricular por edición y **homologación ESPA** (generación del Anexo). Accesible, intuitiva, ágil. Cumplir la **Orden de 21/10/2019 (BOJA 207)** de homologación ESPA.

> Dos decisiones de arquitectura ya tomadas:
> 1. **Ampliar, no reescribir.** `Curso`=currículo-plantilla, `Convocatoria`=edición/expediente, `Inscripcion`=aprendizaje/notas. Todo aditivo.
> 2. **Aula independiente** en `/aula` (grupo de rutas `(aula)`), accesible a **alumnos y formadores, incluidos externos** que NO ven el resto de la app. La coordinación interna sigue en `(app)/formacion/...`.
> 3. La **formación práctica** es propia del curso y NO tiene relación con el módulo Prácticas/Megacode (simulacros operativos internos).

## STACK (no cambiar)
Next.js 14.2.35 App Router · TypeScript estricto · Prisma 5.22.0 + PostgreSQL (Neon) · NextAuth 4.24.7 (JWT, rol en token) · TailwindCSS · lucide-react · Vercel Blob · jspdf/pdf-lib · react-hot-toast.
Repo: `PCB-BORMUJOS/pcivil-bormujos`. Carpeta: `~/Documents/pcivil-bormujos` (en iMac y Mac Studio).

## REGLAS CRÍTICAS
- BD: **NUNCA** `prisma migrate dev`. **SIEMPRE** `npx prisma db push` + `npx prisma generate`.
- `npx tsc --noEmit` en cero antes de cada commit.
- Fechas: `Europe/Madrid` (`getTodaySpain()` / `toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})`).
- Trazabilidad: `registrarAudit` + `getUsuarioAudit` desde `@/lib/audit` en cada acción.
- Prisma desde `@/lib/db`; auth `@/lib/auth`; permisos por nivel de rol o `permisosExtra`.
- En el shell remoto de Cowork (Linux) `prisma generate` falla (403 al bajar el motor) y `tsc` se queda sin memoria → esos dos se ejecutan SIEMPRE en el terminal del Mac. En Mac, si hiciera falta, `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` no es necesario (red libre).

## RAMA Y BASE DE DATOS
- Rama de trabajo: **`feature/plataforma-formacion`** (en GitHub; último commit `d44ac7c`). Mergear a `main` fase a fase, ya verificado.
- Desarrollo contra **rama Neon `dev-formacion`** (host `ep-mute-fire-ag8350bb`), copia de producción. El `.env` local apunta ahí; **producción (`ep-spring-sound`) queda comentada**. NUNCA desarrollar contra producción.
- Prisma CLI lee `.env` (no `.env.local`). Para fijar la BD en un comando puntual: anteponer `DATABASE_URL="…dev-formacion…" <comando>`.
- Al desplegar: restaurar `.env` a producción y `npx prisma db push` a producción (los cambios son aditivos y *nullable* → seguro). *(Nota: producción ya recibió el esquema aditivo en una ejecución previa; no rompe nada.)*

## MODELOS NUEVOS (Prisma — ya en el schema, 16, aditivos)
BloqueTematico, Leccion, RecursoDidactico, Examen, Pregunta, OpcionPregunta, IntentoExamen, RespuestaIntento, Actividad, EntregaActividad, AccionFormativaPractica, SesionPractica, EvaluacionPractica, ProgresoLeccion, NotaBloque, ExpedienteFormacion. Campos aditivos en `Inscripcion` (notaTeorica, notaPractica, progresoPct, estadoAprendizaje, tipoCertificado) y relaciones en Usuario/Curso/Convocatoria.

## ESTADO — HECHO
- **Fase 0** ✅ 16 modelos en `prisma/schema.prisma`, aplicados a `dev-formacion` (`db push` OK).
- **Fase 1** ✅ Currículo:
  - API `src/app/api/formacion/curriculo/route.ts` (GET árbol; POST/PUT/DELETE bloque|leccion|recurso; `plantilla-espa`; validación mínimos 45h/13h).
  - Editor `src/app/(app)/formacion/curriculo/page.tsx` (bloques→lecciones→recursos, botón "Plantilla ESPA curso básico": 6 bloques con horas). Acceso coordinador/formador interno. URL `/formacion/curriculo`.
- **Fase 2A** ✅ Aula independiente:
  - Roles `alumno_externo` / `formador_externo` → script `scripts/seed-roles-aula.ts` (**EJECUTAR en Mac**).
  - Grupo `src/app/(aula)/` : `layout.tsx` (guardia `getServerSession` + shell propio), `AulaHeader.tsx`, `aula/page.tsx` (portada). URL `/aula`.
  - `src/middleware.ts`: `ROLES_SOLO_AULA` + `API_PERMITIDAS_AULA`; externos solo `/aula`; login de rol solo-aula redirige a `/aula`; `/aula` protegido + en matcher.

## PENDIENTE INMEDIATO (verificar en Mac Studio, terminal VS Code en la carpeta del repo, ya en la rama)
```bash
npx prisma generate
npx tsc --noEmit
npx tsx scripts/seed-roles-aula.ts
npm run dev
```
Probar: `http://localhost:3000/formacion/curriculo` (editor + Plantilla ESPA) y `http://localhost:3000/aula` (portada aula).

## ROADMAP SIGUIENTE
- **Fase 2B — Aula del alumno:** API `/api/formacion/aula` + reproductor de contenido por bloques/lecciones + seguimiento de progreso (`ProgresoLeccion`).
- **Fase 3 — Evaluación teórica:** exámenes test autocorregidos + preguntas abiertas (corrección manual) + intentos + notas parciales por bloque.
- **Fase 4 — Actividades + práctica:** entregas con plazo (teleformación ESPA) + acciones formativas prácticas y evaluación apto/no-apto (independiente). Superficie de **formador** (incl. externo) dentro del aula: corregir y evaluar.
- **Fase 5 — Notas totales + certificados:** cálculo total, estado apto, diploma de aprovechamiento / certificado de asistencia con los 7 datos obligatorios ESPA.
- **Fase 6 — Expediente + homologación:** proyecto curricular (art. 6 Orden) + generación del Anexo PDF.
- **Fase 7 — Coordinación (Área de Formación):** panel con asistencias, cursos realizados, convocatorias, estado de homologaciones + estadísticas + QA.

## CUMPLIMIENTO ESPA (Orden 21/10/2019)
Curso básico ≥45h (≥13h prácticas), 6 bloques: Protección Civil en Andalucía 9h · Primeros Auxilios 11h/6p · Contraincendios y salvamento 10h/4p · Telecomunicaciones 7h/3p · Acción social 7h · Evaluación 1h. Asistencia ≥90%. Dos certificados (aprovechamiento / asistencia) con 7 campos: nombre, apellidos y DNI; entidad promotora; denominación; resolución homologación + fecha; fecha y lugar; nº horas; extracto. Perspectiva de género obligatoria. Entidad promotora: Agrupación Local del Voluntariado de Protección Civil de Bormujos (Ayuntamiento de Bormujos).

## DOCS DE REFERENCIA (proyecto Claude "APP PROTECCION CIVIL")
`PLAN_PLATAFORMA_FORMACION.md` (plan completo) · `PLAN_AULA_INDEPENDIENTE.md` (adenda acceso externos).

## RETOMAR EN CADA EQUIPO
- Mac Studio: ya está en `feature/plataforma-formacion` con `.env`→dev-formacion.
- iMac (tiene commit antiguo local sin subir): `git fetch && git checkout feature/plataforma-formacion` (si choca: `git branch -D feature/plataforma-formacion` y repetir). Poner `.env`→dev-formacion (Buscar/Reemplazar host `ep-spring-sound-ag8uiq0p`→`ep-mute-fire-ag8350bb`).
