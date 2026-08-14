#!/usr/bin/env bash
# Sincroniza el entorno al iniciar una sesión de desarrollo (hook SessionStart).
# Es SEGURO: nunca descarta trabajo sin guardar. Usa git pull --ff-only, que
# aborta limpiamente si hay divergencia (commits locales sin subir) o si tocaría
# archivos modificados; en ese caso no cambia nada y avisa.
set -uo pipefail

# Situarse en la raíz del repo (este script vive en scripts/).
cd "$(dirname "$0")/.." 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

msg=""

if git remote get-url origin >/dev/null 2>&1; then
  before=$(git rev-parse HEAD 2>/dev/null)
  git fetch --quiet origin 2>/dev/null
  if git pull --ff-only --quiet 2>/dev/null; then
    after=$(git rev-parse HEAD 2>/dev/null)
    if [ "$before" != "$after" ]; then
      n=$(git rev-list --count "$before".."$after" 2>/dev/null)
      msg="Repo sincronizado: ${n} commit(s) nuevos."
      changed=$(git diff --name-only "$before" "$after" 2>/dev/null)
      if printf '%s\n' "$changed" | grep -q '^prisma/schema.prisma$'; then
        npx prisma generate >/dev/null 2>&1 && msg="${msg} prisma generate OK."
      fi
      if printf '%s\n' "$changed" | grep -qE '^package(-lock)?\.json$'; then
        npm install >/dev/null 2>&1 && msg="${msg} npm install OK."
      fi
    else
      msg="Repo ya al dia."
    fi
  else
    msg="No se pudo hacer git pull --ff-only (divergencia o sin conexion). Trabajo local intacto: sincroniza a mano cuando puedas."
  fi
else
  msg="Sin remoto configurado; nada que sincronizar."
fi

# --- Copia de seguridad diaria (respaldo del launchd, que en ~/Documents queda
# bloqueado por la privacidad de macOS salvo con Acceso a disco completo). Aquí
# se ejecuta desde el contexto de la terminal, que SÍ tiene acceso. Máx. 1/día. ---
STAMP="backups/.last-backup-date"
today="$(date +%Y-%m-%d)"
if [ "$(cat "$STAMP" 2>/dev/null)" != "$today" ]; then
  mkdir -p backups
  # En segundo plano para no demorar el arranque; marca la fecha si termina bien.
  ( bash scripts/backup_full.sh >/dev/null 2>&1 && echo "$today" > "$STAMP" ) &
  msg="${msg} Copia de seguridad diaria en marcha."
fi

# Salida JSON para Claude Code (msg no contiene comillas ni barras).
printf '{"systemMessage":"%s"}\n' "$msg"
