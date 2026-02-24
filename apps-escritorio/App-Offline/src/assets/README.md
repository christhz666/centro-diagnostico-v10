# Logo del Centro Diagnóstico Mi Esperanza

## Ubicación del Logo

El logo debe estar disponible en dos ubicaciones:
1. `frontend/public/logo-centro.png` o `logo-centro.svg` - Para uso en archivos públicos
2. `frontend/src/assets/logo-centro.png` o `logo-centro.svg` - Para imports en componentes React

## Logo Actual

Actualmente se está usando un logo SVG placeholder. Para usar el logo oficial:

1. Descarga el logo desde: https://miesperanzalab.com/wp-content/uploads/2024/10/Logo-Mie-esperanza-Lab-Color-400x190-1.png

2. Guarda el archivo descargado como:
   - `frontend/public/logo-centro.png`
   - `frontend/src/assets/logo-centro.png`

3. O ejecuta estos comandos desde la raíz del proyecto:
   ```bash
   curl -L "https://miesperanzalab.com/wp-content/uploads/2024/10/Logo-Mie-esperanza-Lab-Color-400x190-1.png" -o frontend/public/logo-centro.png
   cp frontend/public/logo-centro.png frontend/src/assets/logo-centro.png
   ```

## Componentes que usan el logo

- `frontend/src/components/Login.js` - Pantalla de inicio de sesión
- `frontend/src/components/FacturaTermica.js` - Cabecera de facturas
- `frontend/src/components/VisorResultados.js` - Impresión de resultados

## Fallback

El sistema está configurado para funcionar con el logo SVG placeholder si el logo PNG no está disponible, asegurando que el sistema funcione incluso sin conexión a internet.
