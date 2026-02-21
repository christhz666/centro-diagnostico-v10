# Deploy en VPS Oracle

## Requisitos del VPS
- Ubuntu 20.04 o superior (Oracle Cloud Free Tier está bien)
- Node.js 18+ 
- MongoDB 6+
- Puerto 5000 abierto en el firewall de Oracle Cloud

## Paso 1: Abrir puerto en Oracle Cloud

En la consola de Oracle Cloud:
1. Ve a **Networking → Virtual Cloud Networks → Tu VCN → Security Lists**
2. Añade una **Ingress Rule**:
   - Source CIDR: `0.0.0.0/0`
   - Destination Port: `5000`
   - Protocol: TCP
3. Dentro del VPS, también abre el firewall del sistema:

```bash
sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
sudo netfilter-persistent save
```

## Paso 2: Instalar Node.js y MongoDB

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB 7
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable mongod && sudo systemctl start mongod
```

## Paso 3: Clonar y configurar

```bash
cd /home/ubuntu
git clone https://github.com/TU-USUARIO/centro-diagnostico-v8.git app
cd app
npm install
```

Crear archivo `.env`:
```bash
cat > .env << 'EOF'
PORT=5000
MONGODB_URI=mongodb://localhost:27017/centro_diagnostico
JWT_SECRET=tu_clave_secreta_super_larga_aqui_12345
JWT_EXPIRE=7d
NODE_ENV=production
EOF
```

## Paso 4: Crear primer usuario admin

```bash
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const existing = await User.findOne({ role: 'admin' });
  if (existing) { console.log('Admin ya existe'); process.exit(0); }
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({ nombre: 'Admin', email: 'admin@lab.com', password: hash, role: 'admin' });
  console.log('Admin creado: admin@lab.com / admin123');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
"
```

## Paso 5: Ejecutar con PM2 (proceso persistente)

```bash
sudo npm install -g pm2
pm2 start server.js --name centro-diagnostico
pm2 startup
pm2 save
```

Ahora tu sistema está en: `http://TU-IP-VPS:5000`

## Paso 6: HTTPS con Nginx (recomendado)

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Configurar Nginx como proxy
sudo tee /etc/nginx/sites-available/centro-diagnostico << 'EOF'
server {
    listen 80;
    server_name tu-dominio.com;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/centro-diagnostico /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# SSL gratuito con Let's Encrypt
sudo certbot --nginx -d tu-dominio.com
```

Acceso final: `https://tu-dominio.com`

## Paso 7: Configurar los agentes locales

En cada PC del laboratorio:

### Agente de Laboratorio (equipos hematología, química, etc.)
1. Copia la carpeta `agentes/agente-laboratorio/` a la PC
2. Edita `config.json`:
   ```json
   {
     "servidor": {
       "url": "https://tu-dominio.com"
     }
   }
   ```
3. Configura los equipos (IP, puerto COM)
4. Ejecuta `instalar.bat` (doble clic)
5. Prueba: `node agente.js --test`
6. Inicia: `node agente.js`

### Agente de Rayos X (imágenes DICOM/CR)
1. Copia la carpeta `agentes/agente-rayosx/` a la PC del rayos X
2. Edita `config.json`:
   ```json
   {
     "servidor": {
       "url": "https://tu-dominio.com"
     },
     "carpetaMonitoreo": "C:\\RUTA\\DONDE\\GUARDA\\IMAGENES"
   }
   ```
3. Ejecuta `instalar.bat`
4. Prueba: `node agente.js --test`
5. Inicia: `node agente.js`

## Hacer los agentes arrancar con Windows (servicio)

Para que los agentes inicien solos al encender la PC:

```batch
npm install -g node-windows
```

O más simple, crear un acceso directo en la carpeta de Inicio de Windows:
1. Presiona `Win+R` → escribe `shell:startup`
2. Crea un acceso directo a `node agente.js` en esa carpeta

## Actualizar el servidor

```bash
cd /home/ubuntu/app
git pull origin main
npm install
pm2 restart centro-diagnostico
```
