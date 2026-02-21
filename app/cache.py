from functools import wraps
from flask import request
import hashlib
import json

# Cache simple en memoria (para producción usar Redis)
_cache = {}

def cache_key(*args, **kwargs):
    """Generar clave de cache"""
    key_data = f"{args}{kwargs}{request.path}"
    return hashlib.md5(key_data.encode()).hexdigest()

def cached(timeout=300):
    """Decorador para cachear respuestas"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            key = f"{f.__name__}:{cache_key(*args, **kwargs)}"
            
            # Verificar si está en cache
            if key in _cache:
                cached_data, timestamp = _cache[key]
                from time import time
                if time() - timestamp < timeout:
                    return cached_data
            
            # Ejecutar función y guardar en cache
            result = f(*args, **kwargs)
            from time import time
            _cache[key] = (result, time())
            
            return result
        return decorated_function
    return decorator

def clear_cache():
    """Limpiar todo el cache"""
    global _cache
    _cache = {}
