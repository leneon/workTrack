#!/bin/bash
# ============================================================
# WorkTrack / Logistix - Script de Déploiement Automatique
# Serveur : 72.61.97.185 | Domaine : logitix.01supplies.com
# Structure : logistix/frontend (React) + logistix/backend (Express)
# ============================================================

set -e  # Arrêter si une commande échoue

# ─── Couleurs ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Variables ─────────────────────────────────────────────
PROJECT_DIR="/root/logistix"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
DOMAIN="logitix.01supplies.com"
APP_NAME="logistix"

echo ""
echo "=============================================="
echo "   🚀 Déploiement Logistix - $DOMAIN"
echo "=============================================="
echo ""

# ══════════════════════════════════════════════════════
# ÉTAPE 1 : Vérification du projet
# ══════════════════════════════════════════════════════
log_info "Étape 1/7 : Vérification du projet..."

[ -d "$PROJECT_DIR" ] || log_error "Dossier $PROJECT_DIR introuvable"
[ -d "$FRONTEND_DIR" ] || log_error "Dossier frontend/ introuvable dans $PROJECT_DIR"
[ -d "$BACKEND_DIR" ]  || log_error "Dossier backend/ introuvable dans $PROJECT_DIR"

# Détection du port Express
BACKEND_PORT=$(grep -r "listen(" "$BACKEND_DIR" --include="*.js" -h | grep -oP '\d{4,5}' | head -1)
if [ -z "$BACKEND_PORT" ]; then
    BACKEND_PORT=$(grep -r "PORT" "$BACKEND_DIR" --include="*.js" -h | grep -oP '\d{4,5}' | head -1)
fi
[ -z "$BACKEND_PORT" ] && BACKEND_PORT=5000
log_success "Port Express détecté : $BACKEND_PORT"

# ══════════════════════════════════════════════════════
# ÉTAPE 2 : Installation Node.js & outils
# ══════════════════════════════════════════════════════
log_info "Étape 2/7 : Installation Node.js, Nginx, PM2..."

# Node.js 20 LTS
if ! command -v node &> /dev/null; then
    log_info "Installation Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    log_success "Node.js $(node -v) installé"
else
    log_success "Node.js déjà installé : $(node -v)"
fi

# PM2 (process manager)
if ! command -v pm2 &> /dev/null; then
    log_info "Installation PM2..."
    npm install -g pm2 --silent
    log_success "PM2 installé"
else
    log_success "PM2 déjà installé : $(pm2 -v)"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    log_info "Installation Nginx..."
    apt-get update -q && apt-get install -y nginx > /dev/null 2>&1
    log_success "Nginx installé"
else
    log_success "Nginx déjà installé"
fi

# Certbot (SSL)
if ! command -v certbot &> /dev/null; then
    log_info "Installation Certbot (SSL)..."
    apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
    log_success "Certbot installé"
else
    log_success "Certbot déjà installé"
fi

# ══════════════════════════════════════════════════════
# ÉTAPE 3 : Build Backend Express
# ══════════════════════════════════════════════════════
log_info "Étape 3/7 : Installation dépendances backend..."

cd "$BACKEND_DIR"
npm install --omit=dev --silent 2>&1 | tail -3

# Copier .env si .env.example existe et .env n'existe pas
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    log_warn ".env créé depuis .env.example → Pensez à mettre à jour les valeurs !"
fi

log_success "Backend prêt"

# ══════════════════════════════════════════════════════
# ÉTAPE 4 : Build Frontend React
# ══════════════════════════════════════════════════════
log_info "Étape 4/7 : Build du frontend React..."

cd "$FRONTEND_DIR"
npm install --silent 2>&1 | tail -3

# Créer .env.production si absent
if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
    cat > .env.production << EOF
REACT_APP_API_URL=https://$DOMAIN/api
VITE_API_URL=https://$DOMAIN/api
EOF
    log_warn ".env.production créé avec l'URL API → Vérifiez si nécessaire"
fi

# Build (Vite ou CRA)
if grep -q '"vite"' package.json 2>/dev/null || grep -q '"build": "vite' package.json 2>/dev/null; then
    log_info "Build Vite détecté..."
    npm run build 2>&1 | tail -5
    BUILD_DIR="dist"
else
    log_info "Build Create React App détecté..."
    npm run build 2>&1 | tail -5
    BUILD_DIR="build"
fi

[ -d "$BUILD_DIR" ] || log_error "Build échoué : dossier $BUILD_DIR introuvable"
log_success "Frontend buildé dans $FRONTEND_DIR/$BUILD_DIR"

# ══════════════════════════════════════════════════════
# ÉTAPE 5 : Configuration PM2
# ══════════════════════════════════════════════════════
log_info "Étape 5/7 : Configuration PM2..."

# Détecter le fichier d'entrée Express
ENTRY_FILE=""
for f in server.js app.js index.js src/server.js src/app.js src/index.js; do
    if [ -f "$BACKEND_DIR/$f" ]; then
        ENTRY_FILE="$f"
        break
    fi
done
[ -z "$ENTRY_FILE" ] && log_error "Impossible de trouver le fichier d'entrée Express (server.js / app.js / index.js)"
log_success "Fichier d'entrée Express : $ENTRY_FILE"

# Créer l'ecosystem PM2
cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME-api',
      script: '$ENTRY_FILE',
      cwd: '$BACKEND_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT,
      },
      error_file: '/var/log/pm2/$APP_NAME-error.log',
      out_file:   '/var/log/pm2/$APP_NAME-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
EOF

mkdir -p /var/log/pm2

# Arrêter l'ancienne instance si elle tourne
pm2 delete "$APP_NAME-api" 2>/dev/null || true

# Démarrer
pm2 start "$PROJECT_DIR/ecosystem.config.js"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash 2>/dev/null || true

log_success "PM2 configuré et démarré"

# ══════════════════════════════════════════════════════
# ÉTAPE 6 : Configuration Nginx
# ══════════════════════════════════════════════════════
log_info "Étape 6/7 : Configuration Nginx..."

STATIC_PATH="$FRONTEND_DIR/$BUILD_DIR"

cat > "/etc/nginx/sites-available/$APP_NAME" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # ─── Logs ─────────────────────────────────────────
    access_log /var/log/nginx/${APP_NAME}-access.log;
    error_log  /var/log/nginx/${APP_NAME}-error.log;

    # ─── Compression Gzip ─────────────────────────────
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1024;

    # ─── Frontend React (fichiers statiques) ──────────
    root $STATIC_PATH;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        # Cache HTML court (SPA routing)
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Cache long pour assets hashés (JS/CSS/images)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ─── API Express (proxy) ──────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        client_max_body_size 50M;
    }

    # ─── Sécurité : masquer la version Nginx ──────────
    server_tokens off;
}
EOF

# Activer le site
ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"

# Désactiver le site par défaut
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Tester la config Nginx
nginx -t && log_success "Config Nginx valide" || log_error "Erreur dans la config Nginx"

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx
log_success "Nginx redémarré et activé au démarrage"

# ══════════════════════════════════════════════════════
# ÉTAPE 7 : SSL Let's Encrypt (HTTPS)
# ══════════════════════════════════════════════════════
log_info "Étape 7/7 : Certificat SSL Let's Encrypt..."

# Vérifier que le domaine pointe bien sur ce serveur
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
log_info "IP publique du serveur : $SERVER_IP"

certbot --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "admin@01supplies.com" \
    --redirect \
    2>&1 | tail -10

if [ $? -eq 0 ]; then
    log_success "SSL activé ! Site accessible en HTTPS"
    # Renouvellement auto
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
    log_success "Renouvellement SSL automatique configuré (cron 3h du matin)"
else
    log_warn "SSL échoué (le domaine ne pointe peut-être pas encore sur ce serveur)"
    log_warn "Relancez manuellement : certbot --nginx -d $DOMAIN"
fi

# ══════════════════════════════════════════════════════
# RÉSUMÉ
# ══════════════════════════════════════════════════════
echo ""
echo "=============================================="
echo -e "   ${GREEN}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo "=============================================="
echo ""
echo -e "  🌐 Site       : https://$DOMAIN"
echo -e "  🔌 API        : https://$DOMAIN/api/"
echo -e "  ⚙️  Express   : port $BACKEND_PORT (via PM2)"
echo -e "  📁 Frontend   : $STATIC_PATH"
echo ""
echo "  Commandes utiles :"
echo -e "  ${BLUE}pm2 status${NC}              → état des processus"
echo -e "  ${BLUE}pm2 logs $APP_NAME-api${NC}  → logs temps réel"
echo -e "  ${BLUE}pm2 restart $APP_NAME-api${NC}→ redémarrer l'API"
echo -e "  ${BLUE}nginx -t${NC}                → tester la config Nginx"
echo -e "  ${BLUE}systemctl status nginx${NC}  → état de Nginx"
echo ""
echo -e "  ${YELLOW}⚠️  Pensez à changer votre mot de passe root !${NC}"
echo "  passwd"
echo ""
