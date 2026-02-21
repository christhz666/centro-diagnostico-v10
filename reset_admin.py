import bcrypt
from app import create_app, db
from sqlalchemy import text

# Crear la app para tener el contexto
app = create_app('production')

with app.app_context():
    try:
        # 1. Probar conexión
        db.session.execute(text('SELECT 1'))
        print("? Conexión a BD: OK")

        # 2. Generar hash de '123456'
        hashed = bcrypt.hashpw(b'123456', bcrypt.gensalt(rounds=12)).decode('utf-8')
        
        # 3. Actualizar admin
        result = db.session.execute(
            text("UPDATE usuarios SET password_hash = :h WHERE username = 'admin'"),
            {'h': hashed}
        )
        db.session.commit()
        print("? Contraseña de admin cambiada a: 123456")
        
    except Exception as e:
        print(f"? Error: {e}")
