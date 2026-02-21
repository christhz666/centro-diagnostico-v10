# Gunicorn - Configuración de Producción
import multiprocessing
import os

# Servidor
bind = '127.0.0.1:5000'
workers = min(multiprocessing.cpu_count() * 2 + 1, 4)
worker_class = 'sync'
timeout = 120
keepalive = 5

# Seguridad
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# Logging
accesslog = 'logs/gunicorn_access.log'
errorlog = 'logs/gunicorn_error.log'
loglevel = 'warning'

# Proceso
daemon = False
pidfile = '/tmp/gunicorn_centro.pid'
preload_app = True

# Headers
forwarded_allow_ips = '127.0.0.1'
proxy_protocol = False
