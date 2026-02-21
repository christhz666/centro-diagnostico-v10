@echo off
setlocal enabledelayedexpansion
title Centro Diagnostico - Instalador Windows
color 0A

rem ── Ir a la carpeta del proyecto ──────────────────────────────
cd /d "%~dp0"

echo.
echo ==================================================
echo    CENTRO DIAGNOSTICO - Instalador Windows
echo ==================================================
echo.

rem ── Admin check ──────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ejecute como Administrador ^(clic derecho^)
    echo.
    pause
    exit /b 1
)
echo OK - Administrador

rem ── Node.js ──────────────────────────────────────────────────
echo.
echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no encontrado. Instale desde https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo OK - Node.js %%v

rem ── package.json ─────────────────────────────────────────────
if not exist "package.json" (
    echo.
    echo ERROR: package.json no encontrado.
    echo Asegurese de que este .bat este en la carpeta del proyecto.
    dir
    pause
    exit /b 1
)
echo OK - package.json encontrado

rem ── .env ─────────────────────────────────────────────────────
if not exist ".env" (
    echo.
    echo Creando archivo .env con valores por defecto...
    (
        echo NODE_ENV=production
        echo PORT=5000
        echo HOST=0.0.0.0
        echo MONGODB_URI=mongodb://localhost:27017/centro_diagnostico
        echo JWT_SECRET=CambiarEnProduccion!SecretoSeguro2024
        echo JWT_EXPIRES_IN=24h
        echo CORS_ORIGINS=http://localhost,http://localhost:5000,http://localhost:3000
        echo FRONTEND_URL=http://localhost
        echo PUBLIC_API_URL=http://localhost/api
        echo RATE_LIMIT_MAX=500
        echo RATE_LIMIT_LOGIN_MAX=20
    ) > ".env"
    echo OK - .env creado
) else (
    echo OK - .env ya existe
)

rem ── npm install backend ───────────────────────────────────────
echo.
echo Instalando dependencias del backend...
echo (Ignorando compilaciones nativas - puede tardar 2-3 min)
echo.
npm install --omit=dev --ignore-scripts --legacy-peer-deps
set NPMRC=%errorlevel%
if !NPMRC! neq 0 (
    echo.
    echo Primer intento fallo, reintentando...
    npm install --ignore-scripts --legacy-peer-deps --force
    set NPMRC=%errorlevel%
)
if !NPMRC! neq 0 (
    echo.
    echo ===================================
    echo ERROR en npm install del backend.
    echo ===================================
    echo Revise el error arriba.
    echo.
    cmd /k
    exit /b 1
)
echo.
echo OK - Dependencias del backend instaladas

rem ── npm install y build frontend ─────────────────────────────
if exist "frontend\package.json" (
    echo.
    echo Instalando frontend...
    cd /d "%~dp0frontend"
    npm install --legacy-peer-deps
    if !errorlevel! neq 0 (
        echo ERROR en npm install del frontend
        cmd /k
        exit /b 1
    )
    echo Compilando frontend ^(3-5 minutos^)...
    npm run build
    if !errorlevel! neq 0 (
        echo ERROR al compilar frontend
        cmd /k
        exit /b 1
    )
    echo OK - Frontend compilado
    cd /d "%~dp0"
)

rem ── PM2 ──────────────────────────────────────────────────────
echo.
echo Configurando PM2...
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g pm2
    npm install -g pm2-windows-startup
)
pm2 delete centro-diagnostico 2>nul
pm2 start "%~dp0server.js" --name "centro-diagnostico" --cwd "%~dp0"
pm2 save
pm2-startup install >nul 2>&1
echo OK - PM2 configurado

rem ── Accesos directos ─────────────────────────────────────────
(
    echo @echo off
    echo pm2 restart centro-diagnostico
    echo echo Reiniciado. && pause
) > "%USERPROFILE%\Desktop\Reiniciar-CentroDiagnostico.bat"
(
    echo @echo off
    echo pm2 status && pause
) > "%USERPROFILE%\Desktop\Estado-CentroDiagnostico.bat"

rem ── FIN ──────────────────────────────────────────────────────
echo.
echo ==================================================
echo   INSTALACION COMPLETADA
echo ==================================================
echo.
echo   Acceso:  http://localhost:5000
echo   Admin:   admin / Admin1234!
echo.
echo   Accesos directos creados en el Escritorio.
echo   Cambie la contrasena del admin en la primera sesion.
echo.
pause
