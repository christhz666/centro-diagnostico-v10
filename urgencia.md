# TAREAS PENDIENTES DE URGENCIA (FALTA DE ESPACIO EN DISCO)

## Contexto Actual
Durante el intento de compilar las aplicaciones nativas de escritorio (Fase 7 del proyecto), se detectó que el disco duro principal (`C:\`) cuenta con **menos de 2 GB de espacio libre** disponible. 

La arquitectura actual de escritorio está basada en **Tauri (Rust)**, lo cual exige instalar el ecosistema de Rust (`cargo`) y las herramientas de compilación de **Visual Studio C++ (MSVC Build Tools)**. Estas herramientas pesan entre 6 GB y 8 GB, por lo que es **imposible** instalarlas en la computadora actual sin colapsar el sistema operativo.

## Plan de Acción a Retomar (Migración a Electron.js)
Para solucionar este bloqueo sin requerir gigabytes de descargas adicionales, la próxima vez que retomemos el proyecto debemos ejecutar los siguientes pasos:

### 1. Migrar `App-Online` a Electron
- Inicializar un proyecto base de Electron.
- Configurar el archivo `main.js` para que simplemente cargue la URL de producción (`https://miesperanzalab.duckdns.org`) a pantalla completa.
- Configurar iconos y empaquetar en un `.exe` usando `electron-builder`.

### 2. Migrar `App-Offline` a Electron (Refactorización Crítica)
- Recrear la estructura de la aplicación de escritorio offline usando Electron.js + Vite/React.
- **Base de Datos Local:** Reescribir el motor de SQLite (que actualmente está hecho en Rust con `rusqlite`) utilizando `sqlite3` o `better-sqlite3` en el proceso principal (Main Process) de Electron.
- **Daemon de Sincronización:** Migrar el hilo en segundo plano que sincroniza con el VPS remoto (actualmente en `sync.rs` con `reqwest`) a un worker o intervalo en Node.js dentro de Electron.
- Inyectar el frontend de React existente en la vista de Electron.
- Empaquetar y generar el `.exe` con `electron-builder`.

### 3. Distribución
- Tomar ambos instaladores generados (`Centro_Diagnostico_Online.exe` y `Centro_Diagnostico_Offline.exe`) y colocarlos en la carpeta `downloads/` del backend.
- Asegurar que los botones de la página web descarguen correctamente estos ejecutables.

---
**Nota para el Asistente AI:** Al reiniciar la conversación y leer este archivo, debes proponer inmediatamente al usuario iniciar la fase de refactorización hacia Electron.js basándote en estas instrucciones.
