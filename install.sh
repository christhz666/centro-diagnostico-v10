#!/bin/bash
# ============================================================
# Centro Diagnóstico Mi Esperanza — Instalador Automático
# Soporta: Ubuntu 20+, Debian 11+, CentOS 8+
# Uso: bash install.sh
# ============================================================

set -e

VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
NC='\033[0m'

ok()    { echo -e "${VERDE}✅ $1${NC}"; }
info()  { echo -e "${AZUL}ℹ️  $1${NC}"; }
warn()  { echo -e "${AMARILLO}⚠️  $1${NC}"; }
error() { echo -e "${ROJO}❌ $1${NC}"; exit 1; }

echo ""
echo "=================================================="
echo "   CENTRO DIAGNÓSTICO — Instalador Automático     "
echo "=================================================="
echo ""

# ── Verificar root ─────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  error "Ejecute como root: sudo bash install.sh"
fi

# ── Detectar OS ────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  VER=$VERSION_ID
else
  error "Sistema operativo no soportado"
fi
info "Sistema detectado: $PRETTY_NAME"

# ── Recopilar configuración ────────────────────────────────
echo ""
echo "📋 Configuración del sistema:"
echo "────────────────────────────"

# IP pública del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
read -p "IP/dominio del servidor [$SERVER_IP]: " INPUT_IP
SERVER_IP=${INPUT_IP:-$SERVER_IP}

# Puerto de la aplicación
read -p "Puerto de la aplicación [5000]: " APP_PORT
APP_PORT=${APP_PORT:-5000}

# Nombre de la empresa
read -p "Nombre del centro médico [Centro Diagnóstico Mi Esperanza]: " EMPRESA
EMPRESA=${EMPRESA:-"Centro Diagnóstico Mi Esperanza"}

# MongoDB
read -p "URI de MongoDB [mongodb://localhost:27017/centro_diagnostico]: " MONGO_URI
MONGO_URI=${MONGO_URI:-"mongodb://localhost:27017/centro_diagnostico"}

# JWT Secret (generar aleatorio)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 64)
info "JWT Secret generado automáticamente"

# ── Instalar Node.js 20 LTS ────────────────────────────────
info "Instalando Node.js 20 LTS..."
if command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d'.' -f1)
  if [ "$NODE_VER" -ge 18 ]; then
    ok "Node.js $(node -v) ya instalado"
  else
    warn "Node.js muy antiguo, actualizando..."
    install_node=true
  fi
else
  install_node=true
fi

if [ "$install_node" = true ]; then
  if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "fedora" ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  else
    error "Instale Node.js 20 manualmente desde https://nodejs.org"
  fi
  ok "Node.js $(node -v) instalado"
fi

# ── Instalar PM2 ───────────────────────────────────────────
info "Instalando PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
ok "PM2 $(pm2 -v) instalado"

# ── Instalar MongoDB ───────────────────────────────────────
if [[ "$MONGO_URI" == *"localhost"* ]]; then
  info "Instalando MongoDB 7..."
  if ! command -v mongod &>/dev/null; then
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
      apt-get install -y gnupg curl
      curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
      if [[ "$OS" == "ubuntu" ]]; then
        CODENAME=$(lsb_release -cs)
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
          https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/7.0 multiverse" \
          | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
      else
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
          https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
          | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
      fi
      apt-get update -qq
      apt-get install -y mongodb-org
    elif [[ "$OS" == "centos" || "$OS" == "rhel" ]]; then
      cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'MONGOEOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
MONGOEOF
      yum install -y mongodb-org
    fi
    systemctl start mongod
    systemctl enable mongod
    ok "MongoDB instalado y activo"
  else
    ok "MongoDB ya instalado: $(mongod --version | head -1)"
  fi
fi

# ── Instalar nginx ─────────────────────────────────────────
info "Instalando nginx..."
if ! command -v nginx &>/dev/null; then
  if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    apt-get install -y nginx
  elif [[ "$OS" == "centos" || "$OS" == "rhel" ]]; then
    yum install -y nginx
  fi
fi
ok "nginx instalado"

# ── Directorio de instalación ──────────────────────────────
APP_DIR="/opt/centro-diagnostico"
info "Instalando aplicación en $APP_DIR..."
mkdir -p "$APP_DIR"

# Copiar archivos del proyecto al directorio destino
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$SCRIPT_DIR" != "$APP_DIR" ]; then
  info "Copiando archivos del proyecto..."
  rsync -av --exclude='.git' --exclude='node_modules' --exclude='frontend/node_modules' \
    --exclude='frontend/build' "$SCRIPT_DIR/" "$APP_DIR/"
  ok "Archivos copiados a $APP_DIR"
fi

cd "$APP_DIR"

# ── Crear archivo .env ─────────────────────────────────────
info "Creando archivo .env..."
cat > "$APP_DIR/.env" << ENVEOF
NODE_ENV=production
PORT=$APP_PORT
HOST=0.0.0.0

MONGODB_URI=$MONGO_URI

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

CORS_ORIGINS=http://$SERVER_IP,http://$SERVER_IP:$APP_PORT,http://localhost:3000
FRONTEND_URL=http://$SERVER_IP
PUBLIC_API_URL=http://$SERVER_IP/api

RATE_LIMIT_MAX=500
RATE_LIMIT_LOGIN_MAX=20

EMPRESA_NOMBRE=$EMPRESA
ENVEOF
ok "Archivo .env creado"

# ── Instalar dependencias del backend ──────────────────────
info "Instalando dependencias del backend..."
npm install --production --silent
ok "Dependencias del backend instaladas"

# ── Compilar el frontend ───────────────────────────────────
if [ -d "$APP_DIR/frontend" ]; then
  info "Instalando dependencias del frontend..."
  cd "$APP_DIR/frontend"
  npm install --silent
  info "Compilando frontend (esto puede tardar 2-4 minutos)..."
  npm run build
  ok "Frontend compilado"
  cd "$APP_DIR"
fi

# ── Configurar nginx ───────────────────────────────────────
info "Configurando nginx..."
cat > /etc/nginx/sites-available/centro-diagnostico << NGINXEOF
server {
    listen 80;
    server_name $SERVER_IP _;

    # Archivos del frontend compilado
    root $APP_DIR/frontend/build;
    index index.html;

    # Gzip para mejor rendimiento
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend (React SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # API backend
    location /api/ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # Archivos estáticos / uploads
    location /uploads/ {
        alias $APP_DIR/uploads/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
NGINXEOF

# Habilitar el sitio
ln -sf /etc/nginx/sites-available/centro-diagnostico /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "nginx configurado"

# ── Iniciar con PM2 ────────────────────────────────────────
info "Configurando PM2..."
pm2 delete centro-diagnostico 2>/dev/null || true
pm2 start "$APP_DIR/server.js" \
  --name "centro-diagnostico" \
  --cwd "$APP_DIR" \
  --instances 1 \
  --max-memory-restart 500M \
  --env production \
  --log "/var/log/centro-diagnostico.log" \
  --error "/var/log/centro-diagnostico-error.log"

pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true
ok "PM2 configurado como servicio del sistema"

# ── Crear usuario admin inicial ────────────────────────────
info "Creando usuario admin inicial..."
node - << 'ADMINEOF'
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const existe = await User.findOne({ email: 'admin@hospital.local' });
    if (!existe) {
      const hash = await bcrypt.hash('Admin1234!', 10);
      await User.create({
        nombre: 'Administrador', email: 'admin@hospital.local',
        username: 'admin', password: hash,
        role: 'admin', activo: true
      });
      console.log('✅ Usuario admin creado: admin / Admin1234!');
    } else {
      console.log('ℹ️  Usuario admin ya existe');
    }
    await mongoose.disconnect();
  } catch (e) {
    console.log('⚠️  No se pudo crear usuario admin automáticamente:', e.message);
    process.exit(0);
  }
})();
ADMINEOF

# ── Crear carpetas de uploads ──────────────────────────────
mkdir -p "$APP_DIR/uploads/imagenes"
mkdir -p "$APP_DIR/uploads/dicom"
mkdir -p "$APP_DIR/uploads/worklist"
chown -R www-data:www-data "$APP_DIR/uploads" 2>/dev/null || true
ok "Carpetas de uploads creadas"

# ── Resumen final ──────────────────────────────────────────
echo ""
echo "=================================================="
echo -e "${VERDE}  ✅ INSTALACIÓN COMPLETADA EXITOSAMENTE  ${NC}"
echo "=================================================="
echo ""
echo "  🌐 URL de acceso:  http://$SERVER_IP"
echo "  🔑 Usuario admin:  admin"
echo "  🔒 Contraseña:     Admin1234!"
echo "  📁 Directorio:     $APP_DIR"
echo "  📋 Logs:           /var/log/centro-diagnostico.log"
echo ""
echo "  Comandos útiles:"
echo "  ─────────────────"
echo "  pm2 status                    # Ver estado"
echo "  pm2 logs centro-diagnostico   # Ver logs"
echo "  pm2 restart centro-diagnostico # Reiniciar"
echo "  bash $SCRIPT_DIR/update.sh    # Actualizar"
echo ""
echo -e "${AMARILLO}  ⚠️  IMPORTANTE: Cambie la contraseña admin en la primera sesión${NC}"
echo ""
