# Directorio de Instaladores de Desktop App

Este directorio contiene los instaladores de la aplicación de escritorio del Centro Diagnóstico.

## Cómo agregar instaladores

Coloque los archivos de instalación en este directorio con las siguientes extensiones:

- **Windows**: Archivos `.exe` (ejemplo: `CentroDiagnostico-Setup-5.0.0.exe`)
- **macOS**: Archivos `.dmg` (ejemplo: `CentroDiagnostico-5.0.0.dmg`)
- **Linux**: Archivos `.AppImage` (ejemplo: `CentroDiagnostico-5.0.0.AppImage`)

## Notas importantes

- El sistema detectará automáticamente los instaladores disponibles basándose en la extensión del archivo
- Solo debe haber un archivo por plataforma (el sistema usará el primero que encuentre)
- Los archivos deben tener permisos de lectura para el proceso del servidor Node.js
- Este directorio NO debe incluirse en el control de versiones (ya está en `.gitignore`)

## Generación de instaladores

Los instaladores se generan desde el proyecto `desktop-app` usando Electron Builder:

```bash
cd desktop-app
npm run build:win   # Para Windows
npm run build:mac   # Para macOS
npm run build:linux # Para Linux
```

Los archivos generados se encontrarán en `desktop-app/dist/` y deben copiarse a este directorio.

## Estructura esperada

```
backend/downloads/
├── README.md (este archivo)
├── CentroDiagnostico-Setup-5.0.0.exe
├── CentroDiagnostico-5.0.0.dmg
└── CentroDiagnostico-5.0.0.AppImage
```
