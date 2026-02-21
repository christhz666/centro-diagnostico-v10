from app import db
from datetime import datetime
import uuid
import random
import string

def generar_id_paciente():
    """Genera ID único: PAC-YYYYMMDD-XXXX"""
    fecha = datetime.now().strftime('%Y%m%d')
    random_code = ''.join(random.choices(string.digits, k=4))
    return f"PAC-{fecha}-{random_code}"

def generar_credenciales_paciente(nombre, apellido):
    """Genera usuario y contraseña para portal del paciente"""
    usuario = f"{nombre.lower()}.{apellido.lower()}"
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    return usuario, password

# Extender tabla pacientes con nuevos campos
# Ejecutar en PostgreSQL
