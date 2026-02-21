import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuración base"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    # Base de datos
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://centro_user:centro_pass@localhost:5432/centro_diagnostico'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
    }

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # Archivos
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    RESULTADOS_FOLDER = os.path.join(UPLOAD_FOLDER, 'resultados')
    TEMP_FOLDER = os.path.join(UPLOAD_FOLDER, 'temp')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {'pdf', 'dcm', 'jpg', 'jpeg', 'png', 'hl7', 'txt'}

    # Monitoreo
    EQUIPOS_EXPORT_PATH = os.getenv('EQUIPOS_EXPORT_PATH', './uploads/equipos')

    # Nube
    CLOUD_SYNC_ENABLED = os.getenv('CLOUD_SYNC_ENABLED', 'false').lower() == 'true'
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET', 'centro-diagnostico-backup')
    AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

    # Email
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')

    # NCF / ITBIS
    NCF_VALIDATION_ENABLED = True
    ITBIS_RATE = 0.18

    # Sesión
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class DevelopmentConfig(Config):
    """Desarrollo"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Producción"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing"""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


# Seleccionar configuración según entorno
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
