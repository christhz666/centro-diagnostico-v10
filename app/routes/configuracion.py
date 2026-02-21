from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Configuracion, Usuario
from app.utils.validators import sanitize_string, sanitize_dict

bp = Blueprint('configuracion', __name__)


def require_admin(f):
    from functools import wraps
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        usuario = Usuario.query.get(user_id)
        if not usuario or usuario.rol != 'admin':
            return jsonify({'error': 'Acceso denegado'}), 403
        return f(*args, **kwargs)
    return decorated


@bp.route('/', methods=['GET'])
@jwt_required()
def obtener_configuracion():
    """Obtener toda la configuración"""
    configs = Configuracion.query.all()
    return jsonify({
        'configuracion': {c.clave: c.valor for c in configs}
    })


@bp.route('/', methods=['PUT'])
@require_admin
def actualizar_configuracion():
    """Actualizar configuración"""
    datos = request.get_json()
    if not datos:
        return jsonify({'error': 'Datos requeridos'}), 400

    datos = sanitize_dict(datos)
    actualizados = []

    for clave, valor in datos.items():
        config = Configuracion.query.filter_by(clave=clave).first()
        if config:
            config.valor = str(valor)
            actualizados.append(clave)
        else:
            nueva = Configuracion()
            nueva.clave = sanitize_string(clave, 100)
            nueva.valor = str(valor)
            nueva.tipo = 'texto'
            db.session.add(nueva)
            actualizados.append(clave)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'{len(actualizados)} configuraciones actualizadas',
        'actualizados': actualizados
    })


@bp.route('/empresa', methods=['GET'])
def info_empresa():
    """Información pública del centro (para recibos, portal)"""
    claves = ['empresa_nombre', 'empresa_rnc', 'empresa_telefono', 'empresa_direccion']
    configs = Configuracion.query.filter(Configuracion.clave.in_(claves)).all()

    info = {c.clave.replace('empresa_', ''): c.valor for c in configs}
    return jsonify(info)
