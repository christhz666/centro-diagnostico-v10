#!/bin/bash
# ============================================================
# Centro Diagnóstico — Script de Actualización
# Uso: bash update.sh
# ============================================================

set -e

VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${VERDE}✅ $1${NC}"; }
info() { echo -e "${AZUL}ℹ️  $1${NC}"; }
warn() { echo -e "${AMARILLO}⚠️  $1${NC}"; }

APP_DIR="/opt/centro-diagnostico"
BACKUP_DIR="/opt/backups/centro-$(date +%Y%m%d_%H%M%S)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "=================================================="
echo "   CENTRO DIAGNÓSTICO — Actualizador             "
echo "=================================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Ejecute como root: sudo bash update.sh"
  exit 1
fi

# ── Backup previo ──────────────────────────────────────────
info "Creando backup en $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp "$APP_DIR/.env" "$BACKUP_DIR/.env.bak" 2>/dev/null || warn "No se encontró .env"
rsync -av "$APP_DIR/uploads/" "$BACKUP_DIR/uploads/" 2>/dev/null || true
ok "Backup creado en $BACKUP_DIR"

# ── Copiar archivos nuevos ─────────────────────────────────
info "Copiando nuevos archivos..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='frontend/node_modules' \
  --exclude='frontend/build' --exclude='.env' --exclude='uploads' \
  "$SCRIPT_DIR/" "$APP_DIR/"
ok "Archivos actualizados"

# ── Restaurar .env ─────────────────────────────────────────
if [ -f "$BACKUP_DIR/.env.bak" ]; then
  cp "$BACKUP_DIR/.env.bak" "$APP_DIR/.env"
  ok ".env restaurado"
fi

cd "$APP_DIR"

# ── Actualizar dependencias backend ────────────────────────
info "Actualizando dependencias del backend..."
npm install --production --silent
ok "Dependencias actualizadas"

# ── Recompilar frontend ────────────────────────────────────
if [ -d "$APP_DIR/frontend" ]; then
  info "Recompilando frontend..."
  cd "$APP_DIR/frontend"
  npm install --silent
  npm run build
  ok "Frontend recompilado"
  cd "$APP_DIR"
fi

# ── Reiniciar servidor ─────────────────────────────────────
info "Reiniciando servidor..."
pm2 restart centro-diagnostico
ok "Servidor reiniciado"

echo ""
echo "================================"
echo -e "${VERDE}  ✅ ACTUALIZACIÓN COMPLETADA   ${NC}"
echo "================================"
echo "  Backup guardado en: $BACKUP_DIR"
echo "  En caso de problemas: pm2 logs centro-diagnostico"
echo ""
