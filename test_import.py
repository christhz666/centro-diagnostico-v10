import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app.routes.auth import auth_bp
    print("? auth_bp importado correctamente")
    print(f"? Routes: {auth_bp.deferred_functions}")
except Exception as e:
    print(f"? Error importando auth_bp: {e}")
    import traceback
    traceback.print_exc()

try:
    from app import create_app
    app = create_app('development')
    print("? App creada correctamente")
    print(f"? Blueprints registrados: {list(app.blueprints.keys())}")
except Exception as e:
    print(f"? Error creando app: {e}")
    import traceback
    traceback.print_exc()
