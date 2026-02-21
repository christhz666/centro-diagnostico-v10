const { execSync } = require('child_process');

try {
    // Ejecutamos tauri signer, y le pasamos dos Enters (newlines) a su stdin
    // para aceptar un password vacio
    const out = execSync('npx tauri signer generate', {
        input: '\n\n',
        encoding: 'utf-8',
        env: { ...process.env, TAURI_PRIVATE_KEY_PASSWORD: '' }
    });
    console.log(out);
} catch (e) {
    console.error("Error:", e.stdout || e.message);
}
