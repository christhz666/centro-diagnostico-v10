from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Usuario
from sqlalchemy import text

class AuthService:
    
    @staticmethod
    def verificar_permiso(permiso_requerido):
        """Decorador para verificar permisos"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                current_user = get_jwt_identity()
                
                if isinstance(current_user, str):
                    user_id = int(current_user)
                else:
                    user_id = current_user.get('id')
                
                # Obtener usuario y rol
                resultado = db.session.execute(text("""
                    SELECT u.id, u.username, r.nombre as rol, r.permisos
                    FROM usuarios u
                    LEFT JOIN roles r ON r.id = u.rol_id
                    WHERE u.id = :user_id
                """), {'user_id': user_id}).first()
                
                if not resultado:
                    return jsonify({'error': 'Usuario no encontrado'}), 404
                
                permisos = resultado[3] or {}
                
                # Administrador tiene todos los permisos
                if permisos.get('todos'):
                    return f(*args, **kwargs)
                
                # Verificar permiso específico
                if not permisos.get(permiso_requerido):
                    return jsonify({'error': 'No tiene permisos para esta acción'}), 403
                
                return f(*args, **kwargs)
            return decorated_function
        return decorator
    
    @staticmethod
    def registrar_auditoria(usuario_id, accion, tabla, registro_id, datos_antes=None, datos_despues=None):
        """Registrar acción en auditoría"""
        from flask import request
        import json
        
        db.session.execute(text("""
            INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_antes, datos_despues, ip_address)
            VALUES (:user_id, :accion, :tabla, :reg_id, :antes, :despues, :ip)
        """), {
            'user_id': usuario_id,
            'accion': accion,
            'tabla': tabla,
            'reg_id': registro_id,
            'antes': json.dumps(datos_antes) if datos_antes else None,
            'despues': json.dumps(datos_despues) if datos_despues else None,
            'ip': request.remote_addr if request else None
        })
        db.session.commit()
