@echo off
echo ============================================
echo   Instalador Agente de Laboratorio
echo   Centro Diagnostico
echo ============================================
echo.

:: Verificar si Node.js esta instalado
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo de: https://nodejs.org/
    echo Instala la version LTS y vuelve a ejecutar este script.
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
echo   IMPORTANTE: Configura tu servidor
echo ============================================
echo.
echo Abre el archivo config.json y cambia:
echo   "url": "https://TU-DOMINIO-O-IP-VPS.com"
echo por la URL real de tu servidor.
echo.
echo Tambien configura los equipos (IP, puerto COM, etc.)
echo.
echo ============================================
echo   Para PROBAR la conexion ejecuta:
echo     node agente.js --test
echo.
echo   Para INICIAR el agente ejecuta:
echo     node agente.js
echo ============================================
echo.
pause
