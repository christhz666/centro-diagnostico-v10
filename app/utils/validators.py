import re
import bleach
from functools import wraps
from flask import request, jsonify


def sanitize_string(value, max_length=255):
    """Sanitizar string eliminando HTML y limitando longitud"""
    if value is None:
        return None
    if not isinstance(value, str):
        return str(value)[:max_length]
    # Eliminar tags HTML
    clean = bleach.clean(str(value), tags=[], strip=True)
    # Eliminar caracteres de control
    clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', clean)
    return clean.strip()[:max_length]


def sanitize_dict(data, fields_config=None):
    """Sanitizar diccionario completo"""
    if not data or not isinstance(data, dict):
        return {}
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            max_len = 255
            if fields_config and key in fields_config:
                max_len = fields_config[key].get('max_length', 255)
            sanitized[key] = sanitize_string(value, max_len)
        else:
            sanitized[key] = value
    return sanitized


def validate_cedula(cedula):
    """Validar formato de cédula dominicana"""
    if not cedula:
        return True  # Opcional
    clean = re.sub(r'[\s\-]', '', cedula)
    return bool(re.match(r'^\d{11}$', clean))


def validate_email(email):
    """Validar formato de email"""
    if not email:
        return True
    return bool(re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', email))


def validate_phone(phone):
    """Validar formato de teléfono"""
    if not phone:
        return True
    clean = re.sub(r'[\s\-\(\)\+]', '', phone)
    return bool(re.match(r'^\d{7,15}$', clean))


def require_fields(*fields):
    """Decorador para verificar campos requeridos"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No se enviaron datos'}), 400
            missing = [field for field in fields if not data.get(field)]
            if missing:
                return jsonify({
                    'error': f'Campos requeridos faltantes: {", ".join(missing)}'
                }), 400
            return f(*args, **kwargs)
        return decorated
    return decorator


def validate_pagination():
    """Obtener parámetros de paginación validados"""
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(100, max(1, int(request.args.get('per_page', 50))))
    except (ValueError, TypeError):
        page, per_page = 1, 50
    return page, per_page
