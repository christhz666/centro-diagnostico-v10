#!/bin/bash
# ============================================================
#  INSTALADOR CENTRO DIAGNÓSTICO v10 — VPS Oracle
#  Ejecutar como: bash install.sh
#  Todo queda listo desde que termina.
# ============================================================

set -e
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🏥 Centro Diagnóstico v10 — Instalador VPS     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Detectar si estamos dentro del repo clonado o no
if [ -f "server.js" ]; then
    APP_DIR="$(pwd)"
else
    APP_DIR="$HOME/centro-diagnostico"
fi
REPO="https://github.com/christhz666/centro-diagnostico-v10.git"

# Detectar IP pública
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU-IP-AQUI")

# ── 1. Dependencias del sistema ──────────────────────────────
echo "📦 [1/8] Verificando dependencias del sistema..."

if ! command -v node &> /dev/null; then
    echo "   Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "   ✅ Node.js $(node --version)"

if ! command -v mongod &> /dev/null; then
    echo "   Instalando MongoDB 7..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt-get update && sudo apt-get install -y mongodb-org
    sudo systemctl enable mongod && sudo systemctl start mongod
fi
echo "   ✅ MongoDB activo"

if ! command -v pm2 &> /dev/null; then
    echo "   Instalando PM2..."
    sudo npm install -g pm2
fi
echo "   ✅ PM2 $(pm2 --version)"

# ── 2. Clonar o actualizar repositorio ───────────────────────
echo ""
echo "📥 [2/8] Descargando código..."

if [ -f "$APP_DIR/server.js" ]; then
    echo "   ✅ Código ya existe en $APP_DIR"
    cd "$APP_DIR"
else
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
    echo "   ✅ Código clonado en $APP_DIR"
fi

# ── 3. Instalar dependencias backend ─────────────────────────
echo ""
echo "📦 [3/8] Instalando dependencias del backend..."
npm install --production 2>&1 | tail -1
echo "   ✅ Backend listo"

# ── 4. Compilar frontend ─────────────────────────────────────
echo ""
echo "🔨 [4/8] Compilando frontend (esto toma 1-2 min)..."
cd "$APP_DIR/frontend"
npm install 2>&1 | tail -1
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build 2>&1 | tail -5
cd "$APP_DIR"
echo "   ✅ Frontend compilado"

# ── 5. Configurar .env ───────────────────────────────────────
echo ""
echo "⚙️  [5/8] Configurando variables de entorno..."

if [ -f ".env" ]; then
    echo "   ✅ .env ya existe, conservando configuración"
    if ! grep -q "JWT_SECRET" .env; then
        JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        echo "JWT_SECRET=$JWT" >> .env
        echo "   🔑 JWT_SECRET agregado"
    fi
else
    JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/centro_diagnostico
JWT_SECRET=$JWT
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://${PUBLIC_IP}:5000,http://${PUBLIC_IP},http://localhost:5000,http://localhost:3000
FRONTEND_URL=http://${PUBLIC_IP}
PUBLIC_API_URL=http://${PUBLIC_IP}:5000
RATE_LIMIT_MAX=500
RATE_LIMIT_LOGIN_MAX=20
DICOM_MODE=none
DICOM_FOLDER=./uploads/dicom
EOF
    echo "   ✅ .env creado (IP: $PUBLIC_IP)"
fi

# ── 6. Configurar trust proxy en Express ─────────────────────
echo ""
echo "🔧 [6/8] Configurando trust proxy..."
if ! grep -q "trust proxy" server.js; then
    sed -i "s/const app = express();/const app = express();\napp.set('trust proxy', 1);/" server.js
    echo "   ✅ Trust proxy configurado"
else
    echo "   ✅ Trust proxy ya existe"
fi

# ── 7. Configurar Nginx ──────────────────────────────────────
echo ""
echo "🌐 [7/8] Configurando Nginx..."

if command -v nginx &> /dev/null; then
    # Crear config de Nginx apuntando al directorio correcto
    NGINX_CONF=""
    if [ -d "/etc/nginx/conf.d" ]; then
        NGINX_CONF="/etc/nginx/conf.d/centro-diagnostico.conf"
    elif [ -d "/etc/nginx/sites-available" ]; then
        NGINX_CONF="/etc/nginx/sites-available/centro-diagnostico"
    fi

    if [ -n "$NGINX_CONF" ]; then
        sudo tee "$NGINX_CONF" > /dev/null << EOF
server {
    listen 80;
    server_name $PUBLIC_IP;
    client_max_body_size 100M;

    root $APP_DIR/frontend/build;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        alias $APP_DIR/uploads;
    }
}
EOF
        # Activar si usa sites-enabled
        if [ -d "/etc/nginx/sites-enabled" ]; then
            sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
            sudo rm -f /etc/nginx/sites-enabled/default
        fi

        sudo nginx -t && sudo systemctl restart nginx
        echo "   ✅ Nginx configurado → http://$PUBLIC_IP"
    fi
else
    echo "   ⚠️ Nginx no instalado. Instálalo con: sudo apt install nginx"
fi

# ── 8. Firewall + PM2 ────────────────────────────────────────
echo ""
echo "🚀 [8/8] Iniciando servidor..."

# Firewall
sudo iptables -C INPUT -p tcp --dport 5000 -j ACCEPT 2>/dev/null || {
    sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
}
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || {
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
}
sudo netfilter-persistent save 2>/dev/null || true

# PM2
pm2 delete all 2>/dev/null || true
cd "$APP_DIR"
pm2 start server.js --name centro-diagnostico
pm2 startup 2>/dev/null || true
pm2 save

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ ¡INSTALACIÓN COMPLETADA!                     ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Tu sistema está en:                             ║"
echo "║  👉 http://$PUBLIC_IP                            ║"
echo "║                                                  ║"
echo "║  Comandos útiles:                                ║"
echo "║  pm2 status       → ver estado                   ║"
echo "║  pm2 logs         → ver logs en vivo             ║"
echo "║  pm2 restart all  → reiniciar                    ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
