import sys
import bcrypt
from app import create_app, db
from app.models import Usuario

app = create_app()

with app.app_context():
    print("--- INICIANDO DIAGNOSTICO DE LOGIN ---")

    # 1. Verificar si existe el usuario
    print("1. Buscando usuario 'admin'...")
    usuario = Usuario.query.filter_by(username='admin').first()

    if not usuario:
        print("ERROR FATAL: El usuario 'admin' NO existe en la base de datos.")
        sys.exit(1)
    print(f"   OK: Usuario encontrado (ID: {usuario.id})")

    # 2. Verificar el hash
    print("2. Analizando hash de contraseña...")
    if not usuario.password_hash:
        print("ERROR FATAL: El campo password_hash está VACÍO o es NULO.")
    else:
        print(f"   Hash actual: {usuario.password_hash[:10]}...")

    # 3. Intentar verificar contraseña (Aquí es donde suele fallar)
    print("3. Intentando verificar contraseña con bcrypt...")
    pass_prueba = "admin123"
    try:
        # Simulamos lo que hace tu auth.py
        es_valida = bcrypt.checkpw(
            pass_prueba.encode('utf-8'), 
            usuario.password_hash.encode('utf-8')
        )
        if es_valida:
            print("   EXITO: La contraseña 'admin123' funciona correctamente.")
        else:
            print("   FALLO: La contraseña 'admin123' NO coincide con el hash.")
    except Exception as e:
        print("\n!!! EXCEPCIÓN DETECTADA (Causa del Error 500) !!!")
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Mensaje: {str(e)}")
        print("-" * 30)
        print("Si el error dice 'Invalid salt' o 'Incorrect number of bindings',")
        print("significa que el hash en la BD está corrupto.")
