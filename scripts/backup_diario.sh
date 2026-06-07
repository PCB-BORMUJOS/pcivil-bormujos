#!/bin/bash
# =============================================================
# Backup diario PCivil Bormujos → SSD 2TB EXTERNO
# Ejecutado por LaunchAgent a las 03:00 cada día
# =============================================================

PROJECT_DIR="/Users/emsigo/Documents/pcivil-bormujos"
DISCO_EXTERNO="/Volumes/SSD 2TB EXTERNO"
DESTINO="$DISCO_EXTERNO/pcivil-backups"
DIAS_A_CONSERVAR=7
LOG="$PROJECT_DIR/backups/backup.log"
FECHA=$(date '+%Y-%m-%d_%H-%M')

log() { echo "[$FECHA] $1" >> "$LOG"; }

log "--- Iniciando backup ---"

# Verificar disco externo
if [ ! -d "$DISCO_EXTERNO" ]; then
    log "ERROR: Disco '$DISCO_EXTERNO' no conectado. Backup cancelado."
    exit 1
fi

mkdir -p "$DESTINO"
mkdir -p "$PROJECT_DIR/backups"

# Ejecutar backup de la base de datos
cd "$PROJECT_DIR" || exit 1
/usr/local/bin/node scripts/backup_db.mjs >> "$LOG" 2>&1

# Localizar la carpeta de backup recién creada
ULTIMO=$(ls -td "$PROJECT_DIR/backups"/backup-* 2>/dev/null | head -1)

if [ -z "$ULTIMO" ]; then
    log "ERROR: No se encontró carpeta de backup tras ejecutar el script."
    exit 1
fi

# Comprimir en zip
ZIP_NAME="pcivil-backup-$FECHA.zip"
ZIP_LOCAL="$PROJECT_DIR/backups/$ZIP_NAME"
zip -r "$ZIP_LOCAL" "$ULTIMO" >> "$LOG" 2>&1

# Copiar al disco externo
if cp "$ZIP_LOCAL" "$DESTINO/"; then
    log "Backup copiado → $DESTINO/$ZIP_NAME"
else
    log "ERROR: No se pudo copiar al disco externo."
fi

# Limpiar backups locales con más de 7 días
find "$PROJECT_DIR/backups" -maxdepth 1 -name "backup-*" -type d -mtime +$DIAS_A_CONSERVAR -exec rm -rf {} + 2>/dev/null
find "$PROJECT_DIR/backups" -maxdepth 1 -name "pcivil-backup-*.zip" -mtime +$DIAS_A_CONSERVAR -delete 2>/dev/null

# Limpiar backups en disco externo con más de 7 días
find "$DESTINO" -name "pcivil-backup-*.zip" -mtime +$DIAS_A_CONSERVAR -delete 2>/dev/null

log "--- Backup finalizado ---"
