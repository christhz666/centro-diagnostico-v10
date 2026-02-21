@echo off
echo ============================================
echo   Instalador Agente de Rayos X / DICOM
echo   Centro Diagnostico
echo ============================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo de: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado:
node --version

echo.
echo Instalando dependencias...
cd /d "%~dp0"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Fallo al instalar dependencias.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   IMPORTANTE: Configura antes de iniciar
echo ============================================
echo.
echo 1. Abre config.json y cambia la URL del servidor:
echo      "url": "https://TU-DOMINIO-O-IP-VPS.com"
echo.
echo 2. Configura la carpeta donde el equipo de
echo    rayos X guarda las imagenes:
echo      "carpetaMonitoreo": "C:\\DICOM\\salida"
echo.
echo ============================================
echo   Para PROBAR:  node agente.js --test
echo   Para INICIAR: node agente.js
echo ============================================
echo.
pause
