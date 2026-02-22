#!/bin/bash
# ============================================================
#  INSTALADOR CENTRO DIAGNÓSTICO v10 — VPS Oracle
#  Ejecutar como: bash install.sh
# ============================================================

set -e
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🏥 Centro Diagnóstico v10 — Instalador VPS     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

APP_DIR="/home/ubuntu/centro-diagnostico"
REPO="https://github.com/christhz666/centro-diagnostico-v10.git"

# ── 1. Dependencias del sistema ──────────────────────────────
echo "📦 [1/6] Verificando dependencias del sistema..."

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
echo "📥 [2/6] Descargando código..."

if [ -d "$APP_DIR" ]; then
    echo "   Carpeta existente, actualizando..."
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || {
        echo "   Repositorio diferente, reemplazando..."
        cd /home/ubuntu
        mv "$APP_DIR" "${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        git clone "$REPO" "$APP_DIR"
        cd "$APP_DIR"
    }
else
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi
echo "   ✅ Código descargado en $APP_DIR"

# ── 3. Instalar dependencias Node ────────────────────────────
echo ""
echo "📦 [3/6] Instalando dependencias..."
npm install --production
echo "   ✅ Dependencias instaladas"

# ── 4. Configurar .env ───────────────────────────────────────
echo ""
echo "⚙️  [4/6] Configurando variables de entorno..."

if [ -f ".env" ]; then
    echo "   ✅ .env ya existe, conservando configuración actual"
    # Verificar que tenga JWT_SECRET
    if ! grep -q "JWT_SECRET" .env; then
        JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        echo "JWT_SECRET=$JWT" >> .env
        echo "   🔑 JWT_SECRET agregado"
    fi
else
    # Crear .env desde cero
    JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Detectar IP pública del VPS
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU-IP-AQUI")
    
    cat > .env << EOF
# ── Servidor ──────────────────────────────────────
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# ── MongoDB ───────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/centro_diagnostico

# ── JWT (generado automáticamente) ────────────────
JWT_SECRET=$JWT
JWT_EXPIRES_IN=7d

# ── CORS ──────────────────────────────────────────
CORS_ORIGINS=http://${PUBLIC_IP}:5000,http://localhost:5000,http://localhost:3000
FRONTEND_URL=http://${PUBLIC_IP}:5000
PUBLIC_API_URL=http://${PUBLIC_IP}:5000

# ── Rate Limiting ─────────────────────────────────
RATE_LIMIT_MAX=500
RATE_LIMIT_LOGIN_MAX=20

# ── DICOM / Rayos X ──────────────────────────────
DICOM_MODE=none
DICOM_FOLDER=./uploads/dicom
EOF
    echo "   ✅ .env creado con IP: $PUBLIC_IP"
    echo "   🔑 JWT_SECRET generado automáticamente"
fi

# ── 5. Abrir firewall ────────────────────────────────────────
echo ""
echo "🔥 [5/6] Configurando firewall..."
sudo iptables -C INPUT -p tcp --dport 5000 -j ACCEPT 2>/dev/null || {
    sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
    echo "   Puerto 5000 abierto"
}
# Intentar guardar reglas (puede fallar si no tiene netfilter-persistent)
sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables.rules > /dev/null 2>&1 || true
echo "   ✅ Puerto 5000 accesible"

# ── 6. Iniciar con PM2 ──────────────────────────────────────
echo ""
echo "🚀 [6/6] Iniciando servidor..."
pm2 stop centro-diagnostico 2>/dev/null || true
pm2 delete centro-diagnostico 2>/dev/null || true
pm2 start server.js --name centro-diagnostico
pm2 startup 2>/dev/null || true
pm2 save

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ ¡INSTALACIÓN COMPLETADA!                     ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Tu sistema está disponible en:                  ║"
echo "║  👉 http://$PUBLIC_IP:5000                       ║"
echo "║                                                  ║"
echo "║  Comandos útiles:                                ║"
echo "║  pm2 status        → ver estado                  ║"
echo "║  pm2 logs          → ver logs en vivo            ║"
echo "║  pm2 restart all   → reiniciar                   ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "⚠️  RECUERDA abrir el puerto 5000 en Oracle Cloud:"
echo "   Networking → VCN → Security Lists → Add Ingress Rule"
echo "   Source: 0.0.0.0/0 | Port: 5000 | Protocol: TCP"
echo ""
