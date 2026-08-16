#!/usr/bin/env bash
# Copia de seguridad COMPLETA del proyecto: base de datos + código (con toda su
# historia) + configuración local (.env). Pensado para ejecutarse a diario por
# launchd. Deja un único .tar.gz por copia y conserva 30 días.
set -uo pipefail

# launchd arranca sin el PATH del shell: lo fijamos para encontrar node/git/npx.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

cd "$(dirname "$0")/.." 2>/dev/null || exit 1
ROOT="$(pwd)"
TS="$(date +%Y-%m-%dT%H-%M-%S)"
OUT="$ROOT/backups/full-$TS"

# Cerrojo: hay dos disparadores (launchd a las 03:00 y el hook de sesión), y dos
# copias a la vez se estorbarían. mkdir es atómico, así que sirve de cerrojo.
LOCK="$ROOT/backups/.lock"
mkdir -p "$ROOT/backups"
if ! mkdir "$LOCK" 2>/dev/null; then
  # Cerrojo huérfano de una ejecución que murió a medias (más de 2 horas).
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +120 2>/dev/null)" ]; then
    rm -rf "$LOCK" && mkdir "$LOCK" 2>/dev/null || exit 0
    echo "Cerrojo antiguo liberado; continuando."
  else
    echo "Ya hay una copia en curso; esta ejecución se omite."
    exit 0
  fi
fi
trap 'rm -rf "$LOCK"' EXIT INT TERM

mkdir -p "$OUT"

# Registrar todo en un log dentro de la copia.
exec > >(tee -a "$OUT/backup.log") 2>&1
echo "==== Copia de seguridad completa  $TS ===="

# Contador de avisos: si algo falla, la copia se marca como INCOMPLETA al final.
AVISOS=0
aviso() { echo "  AVISO: $1"; AVISOS=$((AVISOS+1)); }

# 1) BASE DE DATOS — export lógico de TODOS los modelos (auto).
echo "-- Base de datos (export JSON)"
node scripts/backup_db_full.mjs "$OUT/db" || aviso "fallo al exportar la BD a JSON"

# 1b) BASE DE DATOS — volcado nativo de PostgreSQL, restaurable de una vez con
#     pg_restore (incluye índices y restricciones, que el JSON no lleva).
#     Debe usarse DIRECT_URL: pg_dump no funciona contra el pooler de Neon.
echo "-- Base de datos (volcado nativo pg_dump)"
# pg_dump se niega a volcar un servidor MÁS NUEVO que él. Neon va por delante de
# la versión que suele quedar primera en el PATH, así que se elige la más alta
# de las instaladas en lugar de la primera que aparezca.
PGDUMP=""; PGVER=0
for cand in \
    /opt/homebrew/opt/postgresql@1[6-9]/bin/pg_dump \
    /usr/local/opt/postgresql@1[6-9]/bin/pg_dump \
    /Applications/Postgres.app/Contents/Versions/*/bin/pg_dump \
    "$(command -v pg_dump 2>/dev/null)"; do
  [ -x "$cand" ] || continue
  v="$("$cand" --version 2>/dev/null | sed -E 's/.* ([0-9]+)\..*/\1/')"
  case "$v" in ''|*[!0-9]*) continue;; esac
  if [ "$v" -gt "$PGVER" ]; then PGVER="$v"; PGDUMP="$cand"; fi
done
[ -n "$PGDUMP" ] && echo "  usando pg_dump $PGVER ($PGDUMP)"
DIRURL="$(grep -E '^DIRECT_URL=' .env 2>/dev/null | head -1 | sed -E 's/^DIRECT_URL=//; s/^["'"'"']//; s/["'"'"']$//')"
[ -z "$DIRURL" ] && DIRURL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | head -1 | sed -E 's/^DATABASE_URL=//; s/^["'"'"']//; s/["'"'"']$//')"
if [ ! -x "$PGDUMP" ]; then
  aviso "pg_dump no encontrado; la copia va sin volcado nativo (instalar: brew install postgresql@17)"
elif [ -z "$DIRURL" ]; then
  aviso "no se pudo leer DIRECT_URL/DATABASE_URL del .env; sin volcado nativo"
elif ERR="$("$PGDUMP" "$DIRURL" --format=custom --no-owner --no-acl --file="$OUT/base-de-datos.dump" 2>&1)"; then
  echo "  volcado OK ($(du -h "$OUT/base-de-datos.dump" | cut -f1))"
else
  # Sin credenciales en el log, que este fichero acaba dentro de la copia.
  aviso "pg_dump falló: $(printf '%s' "$ERR" | sed -E 's#postgres(ql)?://[^ ]*#<oculto>#g' | head -2 | tr '\n' ' ')"
fi

# 1c) FICHEROS EXTERNOS — lo que vive en Vercel Blob y NO está en la base de
#     datos (fotos de partes, manuales, hidrantes...). Espejo incremental: solo
#     se descarga lo nuevo, y luego se incluye entero en la copia.
echo "-- Ficheros subidos (Vercel Blob)"
ESPEJO="$ROOT/backups/blob-mirror"
mkdir -p "$ESPEJO"
node scripts/backup_blobs.mjs "$ESPEJO" || aviso "algún fichero de Blob no se pudo descargar"
if command -v rsync >/dev/null 2>&1; then
  rsync -a "$ESPEJO/" "$OUT/ficheros-vercel-blob/" || aviso "fallo al copiar el espejo de ficheros"
else
  cp -R "$ESPEJO" "$OUT/ficheros-vercel-blob" || aviso "fallo al copiar el espejo de ficheros"
fi

# 2) CÓDIGO — bundle git con TODAS las ramas e historia + estado actual.
echo "-- Código (git bundle --all)"
if git bundle create "$OUT/app-repo.bundle" --all >/dev/null 2>&1; then
  echo "  bundle OK ($(du -h "$OUT/app-repo.bundle" | cut -f1))"
else
  aviso "git bundle falló: la copia va SIN el código"
fi
git rev-parse HEAD           > "$OUT/git-HEAD.txt"   2>/dev/null
git status --porcelain       > "$OUT/git-status.txt" 2>/dev/null
git log --oneline -30        > "$OUT/git-log.txt"    2>/dev/null

# 3) CONFIGURACIÓN LOCAL — .env* (no están en git; hacen falta para restaurar).
echo "-- Configuración local (.env*)"
mkdir -p "$OUT/env"
for f in .env .env.local .env.production .env.development; do
  [ -f "$f" ] && cp "$f" "$OUT/env/" && echo "  $f"
done

# 4) Copias sueltas de referencia rápida.
cp prisma/schema.prisma "$OUT/schema.prisma"     2>/dev/null
cp package.json         "$OUT/package.json"      2>/dev/null
cp package-lock.json    "$OUT/package-lock.json" 2>/dev/null

# 5) MANIFIESTO con instrucciones de restauración.
cat > "$OUT/MANIFEST.txt" <<EOF
COPIA DE SEGURIDAD COMPLETA — $TS
Proyecto: pcivil-bormujos
Git HEAD: $(cat "$OUT/git-HEAD.txt" 2>/dev/null)

CONTENIDO
  db/               Export JSON de TODOS los modelos de la base de datos (Neon)
  app-repo.bundle   Repositorio git completo (todas las ramas e historia)
  env/              .env / .env.local (credenciales locales)
  schema.prisma, package.json, package-lock.json
  git-HEAD.txt, git-status.txt, git-log.txt, backup.log

RESTAURAR EL CÓDIGO
  git clone app-repo.bundle pcivil-bormujos
  cp env/.env* pcivil-bormujos/     # devolver credenciales
  cd pcivil-bormujos && npm install && npx prisma generate

RESTAURAR LA BASE DE DATOS
  Opción A (rápida, lo restaura todo con índices y restricciones):
      pg_restore --clean --if-exists --no-owner --no-acl \\
                 --dbname="<DIRECT_URL>" base-de-datos.dump
      OJO: --clean borra las tablas antes de recrearlas.
      Usar la URL DIRECTA, no la del pooler (la que NO lleva "-pooler").
  Opción B (manual, tabla a tabla):
      Los datos están en db/<modelo>.json (uno por tabla). Ver db/_resumen.json
      para el recuento. Reimportables con Prisma (createMany por modelo
      respetando el orden de dependencias).

RESTAURAR LOS FICHEROS SUBIDOS
  ficheros-vercel-blob/ contiene lo que NO vive en la base de datos: fotos de
  partes, manuales, fotos de hidrantes. La BD solo guarda su URL, así que sin
  esta carpeta la restauración deja enlaces rotos.
  _INDICE.csv relaciona cada fichero con el registro del que cuelga y su URL.
  Si se restaura sobre el mismo proyecto de Vercel y el almacenamiento sigue
  vivo, las URLs originales siguen valiendo y no hay que hacer nada.

LO QUE ESTA COPIA NO PUEDE INCLUIR
  Las variables de entorno que solo existen en el panel de Vercel (claves de
  Google, AEMET, Anthropic, tokens de tracking y cron). El .env de aquí es el
  del ordenador de desarrollo. Para que las copias futuras las incluyan:
      npm i -g vercel && vercel login && vercel link
      vercel env pull .env.produccion

COMPROBAR INTEGRIDAD
  shasum -a 256 -c CHECKSUMS.txt      (debe decir OK en todas las líneas)
EOF

# 5b) HUELLAS SHA-256 de todo el contenido, para detectar corrupción.
#     Se excluye backup.log porque se sigue escribiendo después de este punto
#     (las líneas de compresión y el veredicto final), así que su huella
#     quedaría obsoleta y daría un FAILED falso al verificar.
echo "-- Huellas SHA-256"
( cd "$OUT" && find . -type f ! -name CHECKSUMS.txt ! -name backup.log ! -name .DS_Store -print0 \
    | sort -z | xargs -0 shasum -a 256 > CHECKSUMS.txt ) \
  && echo "  $(wc -l < "$OUT/CHECKSUMS.txt" | tr -d ' ') ficheros con huella (backup.log excluido a propósito)" \
  || aviso "no se pudieron generar las huellas"

# 6) Comprimir a un único .tar.gz y borrar la carpeta.
echo "-- Comprimiendo"
if tar -czf "$OUT.tar.gz" -C "$ROOT/backups" "full-$TS"; then
  rm -rf "$OUT"
  echo "Copia creada: $OUT.tar.gz  ($(du -h "$OUT.tar.gz" | cut -f1))"
else
  aviso "no se pudo comprimir; la copia queda sin comprimir en $OUT"
fi

# 7) Retención: conservar 30 días de copias completas.
BORRADAS=$(find "$ROOT/backups" -maxdepth 1 -name 'full-*.tar.gz' -type f -mtime +30 | wc -l | tr -d ' ')
find "$ROOT/backups" -maxdepth 1 -name 'full-*.tar.gz' -type f -mtime +30 -delete 2>/dev/null
[ "$BORRADAS" -gt 0 ] && echo "-- Retención: ${BORRADAS} copia(s) de más de 30 días eliminada(s)"

# 8) Veredicto. Se escribe también en un fichero de estado fácil de consultar,
#    para saber de un vistazo si la última copia salió bien.
COPIAS=$(ls -1 "$ROOT/backups"/full-*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$AVISOS" -eq 0 ]; then
  RESULTADO="OK"
  echo "==== Copia COMPLETA y correcta  ·  $COPIAS copia(s) guardada(s) ===="
else
  RESULTADO="INCOMPLETA ($AVISOS aviso/s)"
  echo "==== ATENCIÓN: copia INCOMPLETA — $AVISOS aviso(s). Revisa el log ===="
fi
printf '%s\n' \
  "ultima_ejecucion=$TS" \
  "resultado=$RESULTADO" \
  "fichero=$OUT.tar.gz" \
  "avisos=$AVISOS" \
  "copias_guardadas=$COPIAS" > "$ROOT/backups/ULTIMO-ESTADO.txt"

echo "==== Fin  $(date +%H:%M:%S) ===="
exit 0
