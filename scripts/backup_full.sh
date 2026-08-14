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
mkdir -p "$OUT"

# Registrar todo en un log dentro de la copia.
exec > >(tee -a "$OUT/backup.log") 2>&1
echo "==== Copia de seguridad completa  $TS ===="

# 1) BASE DE DATOS — export lógico de TODOS los modelos (auto).
echo "-- Base de datos"
node scripts/backup_db_full.mjs "$OUT/db" || echo "  AVISO: fallo al exportar la BD"

# 2) CÓDIGO — bundle git con TODAS las ramas e historia + estado actual.
echo "-- Código (git bundle --all)"
if git bundle create "$OUT/app-repo.bundle" --all >/dev/null 2>&1; then
  echo "  bundle OK ($(du -h "$OUT/app-repo.bundle" | cut -f1))"
else
  echo "  AVISO: git bundle falló"
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
  Los datos están en db/<modelo>.json (uno por tabla). Ver db/_resumen.json
  para el recuento. Reimportables con Prisma (createMany por modelo respetando
  el orden de dependencias).
EOF

# 6) Comprimir a un único .tar.gz y borrar la carpeta.
echo "-- Comprimiendo"
if tar -czf "$OUT.tar.gz" -C "$ROOT/backups" "full-$TS"; then
  rm -rf "$OUT"
  echo "Copia creada: $OUT.tar.gz  ($(du -h "$OUT.tar.gz" | cut -f1))"
else
  echo "AVISO: no se pudo comprimir; la copia queda sin comprimir en $OUT"
fi

# 7) Retención: conservar 30 días de copias completas.
find "$ROOT/backups" -maxdepth 1 -name 'full-*.tar.gz' -type f -mtime +30 -delete 2>/dev/null

echo "==== Fin  $(date +%H:%M:%S) ===="
