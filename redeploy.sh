#!/bin/bash
# ============================================================
# Logistix - Script de Mise à Jour (après git pull)
# Usage : bash redeploy.sh
# ============================================================

set -e
GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}[UPDATE]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }

PROJECT_DIR="/root/logistix"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
APP_NAME="logistix"

log_info "Pull des dernières modifications..."
cd "$PROJECT_DIR" && git pull origin main 2>/dev/null || git pull origin master

log_info "Mise à jour backend..."
cd "$BACKEND_DIR" && npm install --omit=dev --silent
pm2 restart "$APP_NAME-api"
log_success "API redémarrée"

log_info "Rebuild frontend..."
cd "$FRONTEND_DIR"
npm install --silent

# Vite ou CRA
if grep -q '"vite"' package.json 2>/dev/null; then
    npm run build
    BUILD_DIR="dist"
else
    npm run build
    BUILD_DIR="build"
fi

log_success "Frontend rebuildé dans $BUILD_DIR"
systemctl reload nginx
log_success "Nginx rechargé"

echo ""
echo -e "${GREEN}✅ Mise à jour terminée !${NC}"
pm2 status
