# 🏥 Centro Diagnóstico Mi Esperanza — v8

**README para Chris** — Guía completa de instalación, configuración y nuevas funciones.

---

## 📋 Índice

1. [¿Qué hay de nuevo en v8?](#nuevos)
2. [Requisitos](#requisitos)
3. [Instalación paso a paso](#instalacion)
4. [Configurar variables de entorno (.env)](#env)
5. [Arrancar el servidor](#arrancar)
6. [Módulo de Imagenología (NUEVO)](#imagenologia)
7. [Integración con equipo de Rayos X (NO doble registro)](#rayosx)
8. [Visor de imágenes para la doctora](#visor)
9. [Plantillas de reportes médicos](#plantillas)
10. [API Reference — Imagenología](#api)
11. [Solución de problemas](#troubleshooting)

---

## 🆕 ¿Qué hay de nuevo en v8? {#nuevos}

### Módulo de Imagenología completo
- **Visor de imágenes profesional** con controles de brillo, contraste, saturación, zoom, rotación, voltear (H/V) e invertir (negativo)
- Presets rápidos: `Normal`, `Hueso`, `Pulmones`, `Tejidos`, `Negativo`
- Subida de múltiples imágenes por estudio (JPG, PNG, BMP, TIFF, DCM)
- Miniaturas con navegación entre imágenes del mismo estudio

### Plantillas de reportes médicos
- Radiografía General
- Radiografía de Tórax (con campos pulmonares, silueta cardiaca, mediastino, etc.)
- Columna Vertebral
- Extremidades
- Abdomen
- Mamografía (incluye BIRADS)
- Personalizada
- El reporte se guarda en la base de datos y se puede imprimir

### Integración automática con el equipo de Rayos X
- Cuando registras un paciente y creas una cita con estudios de imágenes, el sistema **automáticamente envía los datos al equipo de Rayos X**
- El técnico NO tiene que escribir el nombre del paciente de nuevo
- Soporta: Orthanc DICOM, REST API del equipo, o archivo compartido
- Genera payload en formato DICOM MWL, HL7 ORM y JSON simple

### Correcciones de limpieza
- Aumentado límite de subida a 100MB
- Carpeta `/uploads/imagenes` creada y servida
- Body parser aumentado para imágenes grandes

---

## 💻 Requisitos {#requisitos}

| Software | Versión mínima | Link |
|----------|---------------|------|
| Node.js  | 18 LTS        | https://nodejs.org |
| MongoDB  | 6.0           | https://www.mongodb.com/try/download/community |
| npm      | incluido con Node.js | — |

**Opcional (para integración Rayos X):**
- Orthanc Server: https://www.orthanc-server.com/download.php

---

## 🚀 Instalación paso a paso {#instalacion}

### 1. Bajar el proyecto

```bash
# Si usas Git:
git clone <url-del-repo> centro-diagnostico
cd centro-diagnostico/backend

# O si tienes el ZIP:
# Descomprimir y entrar a la carpeta backend
```

### 2. Instalar dependencias de Node

```bash
npm install
```

Si da error de `serialport` (el módulo de comunicación serial con analizadores de laboratorio), instalar con:

```bash
npm install --ignore-scripts
```

### 3. Instalar y arrancar MongoDB

**En Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**En Windows:**
- Descargar e instalar desde https://www.mongodb.com/try/download/community
- Agregar `C:\Program Files\MongoDB\Server\7.0\bin` al PATH

**Verificar que MongoDB funciona:**
```bash
mongosh
# Debe mostrar el prompt > si funciona
```

### 4. Crear el archivo .env

```bash
cp .env.example .env
```

Editar `.env` con el editor de texto. **Lo mínimo necesario:**

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/centro_diagnostico
JWT_SECRET=aqui_va_una_clave_secreta_muy_larga_min32chars
```

### 5. Crear el administrador inicial

```bash
node createAdmin.js
```

Esto crea el usuario admin. Anotar las credenciales que muestra.

### 6. Crear carpetas necesarias

```bash
mkdir -p uploads/imagenes uploads/dicom uploads/worklist public
```

### 7. Arrancar el servidor

```bash
npm start
# O en modo desarrollo (con recarga automática):
npm run dev
```

Debes ver:
```
+---------------------------------------------------+
¦  Centro Diagnóstico - API Server                 ¦
¦  Host/Puerto: 0.0.0.0:5000                       |
+---------------------------------------------------+
```

### 8. Verificar que funciona

Abrir el navegador en: http://localhost:5000/api/health

Debe responder:
```json
{ "success": true, "message": "Centro Diagnóstico - API funcionando" }
```

---

## ⚙️ Configurar variables de entorno (.env) {#env}

### Variables obligatorias

```env
MONGODB_URI=mongodb://localhost:27017/centro_diagnostico
JWT_SECRET=clave_secreta_minimo_32_caracteres_aqui
PORT=5000
```

### Para email (notificaciones)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=correo@gmail.com
EMAIL_PASS=contraseña_de_aplicacion_de_google
```

> ⚠️ En Gmail debes activar "Contraseñas de aplicación" en la configuración de seguridad de Google.

### Para integración con Rayos X (ver sección siguiente)

```env
DICOM_MODE=none    # cambiar a orthanc, rest o file
```

---

## 📡 Integración con equipo de Rayos X {#rayosx}

### El problema que esto resuelve

Antes: Registrabas al paciente en el programa → luego tenías que registrarlo **otra vez** en el equipo de Rayos X (Konica Minolta, Carestream, etc.).

**Ahora:** Al crear una cita con estudios de imágenes, el sistema envía automáticamente los datos al equipo. El técnico abre el equipo y el paciente ya aparece listo.

### Opción A: Orthanc (Recomendada — gratuita)

Orthanc es un servidor DICOM open source que actúa de intermediario.

**Instalar Orthanc en el servidor:**
```bash
# Ubuntu:
sudo apt install orthanc
sudo systemctl start orthanc
sudo systemctl enable orthanc
```

**Configurar en .env:**
```env
DICOM_MODE=orthanc
ORTHANC_URL=http://localhost:8042
ORTHANC_USER=orthanc
ORTHANC_PASS=orthanc
```

**Configurar el equipo de Rayos X:**
- En el equipo, configurar la fuente DICOM Worklist apuntando a la IP del servidor, puerto 4242
- AET del servidor: `ORTHANC`

### Opción B: Carpeta compartida (más simple)

Si el PC del equipo de Rayos X está en la misma red:

**Configurar en .env:**
```env
DICOM_MODE=file
DICOM_WORKLIST_DIR=/ruta/carpeta/compartida
```

El sistema escribe un archivo JSON en esa carpeta cada vez que se crea una cita.
Requiere un script pequeño en el PC del equipo que lea ese archivo e importe los datos.

### Opción C: Sin integración automática (manual)

Si prefieres hacerlo manualmente cuando necesites:

```env
DICOM_MODE=none
```

Cuando tengas una cita y quieras enviar al equipo, llama:
```
GET /api/imagenologia/worklist/:citaId
```
Esto devuelve el payload en formato DICOM, HL7 y JSON para enviarlo manualmente.

### Probar la integración

```bash
curl http://localhost:5000/api/health
```

Crear una cita con un estudio de Rayos X y revisar la consola del servidor. Deberías ver:
```
✅ DICOM: Paciente Juan Rodriguez registrado en equipo de rayos X
```

---

## 🖼️ Visor de imágenes para la doctora {#visor}

### Acceder al visor

Hay dos formas:

**1. URL directa (visor solo):**
```
http://servidor:5000/visor?resultadoId=ID_DEL_RESULTADO
```

**2. Desde el frontend de React:**
Agregar en la pantalla de resultados un botón que abra:
```javascript
window.open(`/visor?resultadoId=${resultado._id}`)
// O como componente integrado en un iframe:
// <iframe src={`/visor?resultadoId=${resultado._id}`} />
```

### Controles del visor

| Control | Descripción |
|---------|-------------|
| Brillo | -100 a +100 (slider) |
| Contraste | -100 a +100 (slider) |
| Saturación | -100 a +100 (slider) |
| Zoom | 0.1x a 5x (slider + rueda del mouse) |
| Rotación | Botones -90° / +90° |
| Voltear | Horizontal / Vertical |
| Invertir | Convierte a negativo (útil en Rayos X) |
| Mover | Arrastrar la imagen con el mouse |

### Presets rápidos

- **Normal**: Sin ajustes
- **Hueso**: Alto contraste, baja saturación
- **Pulmones**: Contraste realzado, muy baja saturación
- **Tejidos**: Contraste y saturación moderados
- **Negativo**: Imagen invertida

### Subir imágenes

- Click en el `+` en el panel de miniaturas
- O arrastrar el archivo directamente al área del visor
- Formatos: JPG, PNG, BMP, TIFF (hasta 50MB por imagen)
- Si el equipo de Rayos X envía imágenes automáticamente via webhook, aparecen solas

---

## 📋 Plantillas de reportes médicos {#plantillas}

El panel derecho del visor tiene la pestaña **Reporte** donde la doctora:

1. Selecciona la plantilla según el tipo de estudio
2. Rellena los campos (con texto sugerido de guía)
3. Click **Guardar** (guarda borrador)
4. Click **Finalizar** (marca como completado y firma)

### Plantillas disponibles

| Plantilla | Campos incluidos |
|-----------|-----------------|
| Radiografía General | Técnica, Hallazgos, Impresión diagnóstica, Recomendaciones |
| Tórax | + Campos pulmonares, Silueta cardiaca, Mediastino, Estructuras óseas |
| Columna | + Alineación, Cuerpos vertebrales, Espacios discales, Partes blandas |
| Extremidades | + Estructuras óseas, Articulaciones, Partes blandas |
| Abdomen | + Distribución gaseosa, Solidificaciones |
| Mamografía | + Densidad mamaria, Masas, Calcificaciones, BIRADS |
| Personalizada | Solo campos básicos |

### Imprimir el reporte

Click en **🖨️ Imprimir** en el header del visor.
El navegador abre el diálogo de impresión con el reporte listo.

---

## 🔌 API Reference — Imagenología {#api}

Todos los endpoints requieren header `Authorization: Bearer TOKEN` (excepto donde se indica).

### Plantillas
```
GET /api/imagenologia/plantillas
```
Sin autenticación. Devuelve todas las plantillas disponibles.

### Workspace del visor
```
GET  /api/imagenologia/workspace/:resultadoId
PUT  /api/imagenologia/workspace/:resultadoId
```
GET devuelve todo (paciente, imágenes, ajustes, reporte).
PUT guarda ajustes y/o reporte.

Body del PUT:
```json
{
  "ajustes": { "brillo": 20, "contraste": 30, "zoom": 1.5, "invertido": false },
  "reporte": {
    "plantilla": "torax",
    "hallazgos": "Sin hallazgos patológicos.",
    "impresion_diagnostica": "Tórax normal.",
    "medico_firmante": "Dra. García"
  }
}
```

### Subir imágenes
```
POST /api/imagenologia/upload/:resultadoId
Content-Type: multipart/form-data
Campo: imagenes (array de archivos)
```

### Eliminar imagen
```
DELETE /api/imagenologia/imagen/:resultadoId/:imagenId
```

### Lista de estudios (panel del doctor)
```
GET /api/imagenologia/lista?estado=pendiente&fecha=2025-01-15&page=1
```

### Finalizar reporte
```
POST /api/imagenologia/reporte/:resultadoId/finalizar
Body: { "reporte": { ... campos del reporte ... } }
```

### Worklist para equipo de Rayos X
```
GET /api/imagenologia/worklist/:citaId
```
Devuelve el payload en DICOM MWL, HL7 ORM y JSON para enviar al equipo.

### Webhook del equipo (el equipo llama a este endpoint cuando termina)
```
POST /api/imagenologia/webhook/equipo-listo
Body: {
  "accessionNumber": "ACC123",
  "imagenes": [{ "filename": "img1.jpg", "url": "/ruta/imagen", "tipo": "image/jpeg" }],
  "studyInstanceUID": "1.2.3..."
}
```

---

## 🔧 Solución de problemas {#troubleshooting}

### El servidor no arranca

```bash
# Ver el error completo:
node server.js

# Errores comunes:
# "Cannot find module 'serialport'" → npm install --ignore-scripts
# "EADDRINUSE 5000" → otro proceso usa el puerto, cambiar PORT en .env
# "MongooseServerSelectionError" → MongoDB no está corriendo
```

### MongoDB no conecta

```bash
# Verificar que está corriendo:
sudo systemctl status mongodb
# O en Windows:
net start MongoDB

# Ver el puerto:
netstat -an | grep 27017
```

### El visor no carga imágenes

- Verificar que la carpeta `uploads/imagenes` existe y tiene permisos de escritura
- Verificar que el servidor sirve archivos estáticos: http://localhost:5000/uploads/

### La integración DICOM no funciona

```bash
# Probar conexión Orthanc:
curl http://localhost:8042/system

# Ver logs del servidor cuando se crea una cita y buscar:
# "✅ DICOM: Paciente..."
# "⚠️ Error DICOM:"
```

### Error 413 "Payload Too Large" al subir imágenes

El servidor ya tiene límite de 100MB. Si sigue el error, revisar si hay un proxy nginx delante:

```nginx
# Agregar en el bloque location de nginx:
client_max_body_size 100M;
```

### Preguntas frecuentes

**¿Puedo usar el visor en el celular?**
Sí, es responsive. Funciona en tablet, celular y PC.

**¿El visor funciona sin internet?**
Sí, es 100% local. Solo necesita el servidor local.

**¿Se pueden ver imágenes DICOM (.dcm)?**
Por ahora se convierten a JPEG/PNG. Para visor DICOM nativo (con ventanado HU), se puede agregar Cornerstone.js en el futuro.

**¿Cómo agrego una nueva plantilla de reporte?**
En `controllers/imagenologiaController.js`, objeto `PLANTILLAS`, agregar la nueva plantilla siguiendo el mismo formato.

---

## 📁 Estructura del proyecto

```
backend/
├── controllers/
│   ├── imagenologiaController.js  ← NUEVO: visor, upload, reporte
│   ├── citaController.js          ← MODIFICADO: integración DICOM al crear cita
│   └── pacienteController.js      ← MODIFICADO: payload rayos X al crear paciente
├── routes/
│   └── imagenologia.js            ← NUEVO: todas las rutas de imagenología
├── services/
│   └── dicomIntegrationService.js ← NUEVO: envío a equipo de rayos X
├── public/
│   └── visor-imagenes.html        ← NUEVO: visor completo de imágenes
├── uploads/
│   ├── imagenes/                  ← NUEVO: imágenes subidas
│   ├── dicom/                     ← Archivos DICOM recibidos
│   └── worklist/                  ← Worklist JSON para equipos
├── .env.example                   ← ACTUALIZADO: con variables DICOM
└── server.js                      ← MODIFICADO: nuevas rutas y límites
```

---

## 🆘 Contacto y soporte

Para problemas con la instalación, reportar en el repositorio del proyecto con:
1. Sistema operativo (Windows/Linux/Mac)
2. Versión de Node.js: `node -v`
3. Versión de MongoDB: `mongod --version`
4. El error completo que aparece en consola

---

*Centro Diagnóstico Mi Esperanza — v8.0 | Generado con asistencia de IA*
