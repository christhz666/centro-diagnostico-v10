@echo off
echo ============================================
echo   Instalador Agente de Rayos X / DICOM
echo   Centro Diagnostico - Servicio Windows
echo ============================================
echo.
echo Este script instala el agente como tarea
echo programada que arranca con Windows de forma
echo silenciosa (sin ventana de consola).
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Se requieren permisos de Administrador.
    echo     Haz clic derecho en este archivo y
    echo     selecciona "Ejecutar como administrador".
    pause
    exit /b 1
)

set AGENT_DIR=%~dp0
set AGENT_EXE=%AGENT_DIR%dist\AgenteDICOM.exe
set CONFIG_FILE=%AGENT_DIR%config.json
set TASK_NAME=CentroDiagnostico-AgenteDICOM

:: Verificar que el .exe existe
if not exist "%AGENT_EXE%" (
    echo [ERROR] No se encontro AgenteDICOM.exe en dist\
    echo         Ejecuta primero: pkg agente.js --targets node18-win-x64 --output dist\AgenteDICOM.exe
    pause
    exit /b 1
)

:: Verificar config.json
if not exist "%CONFIG_FILE%" (
    echo [ERROR] No se encontro config.json
    pause
    exit /b 1
)

:: Crear lanzador silencioso VBS
echo [*] Creando lanzador silencioso...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%AGENT_DIR%"
echo WshShell.Run """%AGENT_EXE%""", 0, False
) > "%AGENT_DIR%lanzador-silencioso.vbs"

:: Eliminar tarea anterior si existe
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: Crear tarea programada
echo [*] Registrando tarea programada...
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%AGENT_DIR%lanzador-silencioso.vbs\"" /sc onlogon /rl highest /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo   [OK] Agente DICOM instalado exitosamente
    echo ============================================
    echo.
    echo   El agente vigilara automaticamente la
    echo   carpeta configurada en config.json y
    echo   subira imagenes nuevas al servidor.
    echo.
    echo   Para iniciar ahora: doble clic en
    echo     lanzador-silencioso.vbs
    echo.
    echo   Para detener: Administrador de Tareas ^>
    echo     buscar AgenteDICOM.exe ^> Finalizar
    echo.
    echo   Para desinstalar:
    echo     schtasks /delete /tn "%TASK_NAME%" /f
    echo ============================================

    echo.
    set /p INICIAR="Deseas iniciar el agente ahora? (S/N): "
    if /i "%INICIAR%"=="S" (
        echo [*] Iniciando agente...
        start "" wscript.exe "%AGENT_DIR%lanzador-silencioso.vbs"
        echo [OK] Agente iniciado en segundo plano.
    )
) else (
    echo [ERROR] No se pudo registrar la tarea programada.
)

echo.
pause
