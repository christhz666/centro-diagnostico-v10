#!/bin/bash

echo "================================================"
echo "INSTALANDO TODOS LOS MÓDULOS DEL SISTEMA"
echo "================================================"

# Crear carpetas necesarias
mkdir -p app/routes app/services app/utils

# ==============================================
# MÓDULO: AUTH (Autenticación)
# ==============================================
cat > app/routes/auth.py << 'EOF'
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app import db
from app.models import Usuario
import bcrypt
from datetime import datetime

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['POST'])
def login():
    datos = request.get_json()
    if not datos or 'username' not in datos or 'password' not in datos:
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400
    usuario = Usuario.query.filter_by(username=datos['username']).first()
    if not usuario or not usuario.activo:
        return jsonify({'error': 'Credenciales inválidas'}), 401
    if bcrypt.checkpw(datos['password'].encode('utf-8'), usuario.password_hash.encode('utf-8')):
        usuario.ultimo_acceso = datetime.utcnow()
        db.session.commit()
        identity = str(usuario.id)
        access_token = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)
        return jsonify({'access_token': access_token, 'refresh_token': refresh_token, 'usuario': usuario.to_dict()})
    return jsonify({'error': 'Credenciales inválidas'}), 401

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    return jsonify({'access_token': access_token})

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    usuario = Usuario.query.get(int(current_user_id))
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify(usuario.to_dict())
EOF

# ==============================================
# MÓDULO: PACIENTES
# ==============================================
cat > app/routes/pacientes.py << 'EOF'
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Paciente
from datetime import datetime

bp = Blueprint('pacientes', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_pacientes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    buscar = request.args.get('buscar', '')
    query = Paciente.query
    if buscar:
        query = query.filter((Paciente.nombre.ilike(f'%{buscar}%')) | (Paciente.apellido.ilike(f'%{buscar}%')) | (Paciente.cedula.ilike(f'%{buscar}%')))
    query = query.order_by(Paciente.created_at.desc())
    pacientes = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({'pacientes': [p.to_dict() for p in pacientes.items], 'total': pacientes.total, 'pages': pacientes.pages, 'current_page': page})

@bp.route('/<int:paciente_id>', methods=['GET'])
@jwt_required()
def obtener_paciente(paciente_id):
    paciente = Paciente.query.get_or_404(paciente_id)
    return jsonify(paciente.to_dict())

@bp.route('/', methods=['POST'])
@jwt_required()
def crear_paciente():
    try:
        datos = request.get_json()
        if not datos.get('nombre') or not datos.get('apellido'):
            return jsonify({'error': 'Nombre y apellido requeridos'}), 400
        if datos.get('cedula'):
            existe = Paciente.query.filter_by(cedula=datos['cedula']).first()
            if existe:
                return jsonify({'error': 'Ya existe un paciente con esta cédula'}), 400
        paciente = Paciente()
        paciente.cedula = datos.get('cedula')
        paciente.pasaporte = datos.get('pasaporte')
        paciente.nombre = datos['nombre']
        paciente.apellido = datos['apellido']
        paciente.fecha_nacimiento = datetime.fromisoformat(datos['fecha_nacimiento']) if datos.get('fecha_nacimiento') else None
        paciente.sexo = datos.get('sexo')
        paciente.telefono = datos.get('telefono')
        paciente.celular = datos.get('celular')
        paciente.email = datos.get('email')
        paciente.direccion = datos.get('direccion')
        paciente.ciudad = datos.get('ciudad')
        paciente.seguro_medico = datos.get('seguro_medico')
        paciente.numero_poliza = datos.get('numero_poliza')
        paciente.tipo_sangre = datos.get('tipo_sangre')
        paciente.alergias = datos.get('alergias')
        db.session.add(paciente)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Paciente creado', 'paciente': paciente.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:paciente_id>', methods=['PUT'])
@jwt_required()
def actualizar_paciente(paciente_id):
    try:
        paciente = Paciente.query.get_or_404(paciente_id)
        datos = request.get_json()
        if 'nombre' in datos: paciente.nombre = datos['nombre']
        if 'apellido' in datos: paciente.apellido = datos['apellido']
        if 'telefono' in datos: paciente.telefono = datos['telefono']
        if 'celular' in datos: paciente.celular = datos['celular']
        if 'email' in datos: paciente.email = datos['email']
        if 'direccion' in datos: paciente.direccion = datos['direccion']
        db.session.commit()
        return jsonify({'success': True, 'message': 'Paciente actualizado', 'paciente': paciente.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
EOF

# ==============================================
# MÓDULO: ESTUDIOS
# ==============================================
cat > app/routes/estudios.py << 'EOF'
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Estudio, CategoriaEstudio

bp = Blueprint('estudios', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_estudios():
    categoria_id = request.args.get('categoria_id', type=int)
    query = Estudio.query.filter_by(activo=True)
    if categoria_id:
        query = query.filter_by(categoria_id=categoria_id)
    estudios = query.order_by(Estudio.nombre).all()
    return jsonify({'estudios': [e.to_dict() for e in estudios], 'total': len(estudios)})

@bp.route('/<int:estudio_id>', methods=['GET'])
@jwt_required()
def obtener_estudio(estudio_id):
    estudio = Estudio.query.get_or_404(estudio_id)
    return jsonify(estudio.to_dict())

@bp.route('/categorias', methods=['GET'])
@jwt_required()
def listar_categorias():
    categorias = CategoriaEstudio.query.filter_by(activo=True).all()
    return jsonify({'categorias': [{'id': c.id, 'nombre': c.nombre, 'descripcion': c.descripcion} for c in categorias]})
EOF

# ==============================================
# MÓDULO: ÓRDENES
# ==============================================
cat > app/routes/ordenes.py << 'EOF'
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Orden, OrdenDetalle, Paciente, Estudio
from sqlalchemy import text

bp = Blueprint('ordenes', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_ordenes():
    estado = request.args.get('estado')
    query = Orden.query
    if estado:
        query = query.filter(Orden.estado == estado)
    ordenes = query.order_by(Orden.fecha_orden.desc()).limit(50).all()
    return jsonify({'ordenes': [o.to_dict() for o in ordenes], 'total': len(ordenes)})

@bp.route('/<int:orden_id>', methods=['GET'])
@jwt_required()
def obtener_orden(orden_id):
    orden = Orden.query.get_or_404(orden_id)
    detalles = []
    for detalle in orden.detalles:
        detalles.append({
            'id': detalle.id,
            'estudio': detalle.estudio.to_dict() if detalle.estudio else None,
            'precio': float(detalle.precio),
            'descuento': float(detalle.descuento),
            'precio_final': float(detalle.precio_final),
            'estado': detalle.estado
        })
    resultado = orden.to_dict()
    resultado['detalles'] = detalles
    return jsonify(resultado)

@bp.route('/', methods=['POST'])
@jwt_required()
def crear_orden():
    try:
        datos = request.get_json()
        usuario_id = int(get_jwt_identity())
        if not datos.get('paciente_id') or not datos.get('estudios'):
            return jsonify({'error': 'paciente_id y estudios requeridos'}), 400
        resultado = db.session.execute(text("SELECT generar_numero_orden()"))
        numero_orden = resultado.scalar()
        orden = Orden()
        orden.numero_orden = numero_orden
        orden.paciente_id = datos['paciente_id']
        orden.medico_referente = datos.get('medico_referente', '')
        orden.prioridad = datos.get('prioridad', 'normal')
        orden.usuario_registro_id = usuario_id
        orden.estado = 'pendiente'
        db.session.add(orden)
        db.session.flush()
        total_orden = 0
        for est in datos['estudios']:
            estudio = Estudio.query.get(est['estudio_id'])
            if not estudio:
                db.session.rollback()
                return jsonify({'error': f'Estudio no encontrado'}), 404
            descuento = float(est.get('descuento', 0))
            precio = float(estudio.precio)
            precio_final = precio - descuento
            detalle = OrdenDetalle()
            detalle.orden_id = orden.id
            detalle.estudio_id = est['estudio_id']
            detalle.precio = precio
            detalle.descuento = descuento
            detalle.precio_final = precio_final
            detalle.estado = 'pendiente'
            db.session.add(detalle)
            total_orden += precio_final
        db.session.commit()
        return jsonify({'success': True, 'message': 'Orden creada', 'orden': orden.to_dict(), 'total': float(total_orden)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/pendientes', methods=['GET'])
@jwt_required()
def ordenes_pendientes():
    ordenes = Orden.query.filter(Orden.estado.in_(['pendiente', 'en_proceso'])).order_by(Orden.fecha_orden.desc()).all()
    return jsonify({'ordenes': [o.to_dict() for o in ordenes], 'total': len(ordenes)})
EOF

# ==============================================
# MÓDULO: FACTURAS (Ya existe, actualizar)
# ==============================================
echo "? Módulo de facturas ya existe"

# ==============================================
# MÓDULO: RESULTADOS
# ==============================================
cat > app/routes/resultados.py << 'EOF'
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Resultado, OrdenDetalle

bp = Blueprint('resultados', __name__)

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_resultados():
    orden_id = request.args.get('orden_id', type=int)
    query = Resultado.query
    if orden_id:
        query = query.join(OrdenDetalle).filter(OrdenDetalle.orden_id == orden_id)
    resultados = query.order_by(Resultado.fecha_importacion.desc()).limit(50).all()
    return jsonify({'resultados': [{'id': r.id, 'tipo_archivo': r.tipo_archivo, 'nombre_archivo': r.nombre_archivo, 'fecha': r.fecha_importacion.isoformat()} for r in resultados]})
EOF

# ==============================================
# MÓDULO: REPORTES
# ==============================================
cat > app/routes/reportes.py << 'EOF'
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Factura, Orden, Paciente, Estudio
from sqlalchemy import func, extract
from datetime import datetime, timedelta

bp = Blueprint('reportes', __name__)

@bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    hoy = datetime.now().date()
    inicio_mes = hoy.replace(day=1)
    
    # Facturas del mes
    facturas_mes = Factura.query.filter(
        extract('year', Factura.fecha_factura) == hoy.year,
        extract('month', Factura.fecha_factura) == hoy.month,
        Factura.estado != 'anulada'
    ).all()
    
    total_mes = sum(float(f.total) for f in facturas_mes)
    facturas_pendientes = len([f for f in facturas_mes if f.estado in ['pendiente', 'parcial']])
    
    # Órdenes pendientes
    ordenes_pendientes = Orden.query.filter(Orden.estado.in_(['pendiente', 'en_proceso'])).count()
    
    # Pacientes registrados
    total_pacientes = Paciente.query.filter_by(estado='activo').count()
    
    return jsonify({
        'ventas_mes': total_mes,
        'facturas_mes': len(facturas_mes),
        'facturas_pendientes': facturas_pendientes,
        'ordenes_pendientes': ordenes_pendientes,
        'total_pacientes': total_pacientes
    })

@bp.route('/ventas', methods=['GET'])
@jwt_required()
def reporte_ventas():
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    
    if not fecha_inicio or not fecha_fin:
        return jsonify({'error': 'Se requieren fecha_inicio y fecha_fin'}), 400
    
    fecha_inicio = datetime.fromisoformat(fecha_inicio)
    fecha_fin = datetime.fromisoformat(fecha_fin)
    
    facturas = Factura.query.filter(
        Factura.fecha_factura >= fecha_inicio,
        Factura.fecha_factura <= fecha_fin,
        Factura.estado != 'anulada'
    ).all()
    
    total_ventas = sum(float(f.total) for f in facturas)
    total_itbis = sum(float(f.itbis) for f in facturas)
    
    return jsonify({
        'fecha_inicio': fecha_inicio.isoformat(),
        'fecha_fin': fecha_fin.isoformat(),
        'total_ventas': total_ventas,
        'total_itbis': total_itbis,
        'cantidad_facturas': len(facturas)
    })
EOF

# ==============================================
# ACTUALIZAR run.py CON TODOS LOS MÓDULOS
# ==============================================
cat > run.py << 'EOF'
from flask import Flask
from flask_cors import CORS
from config import config
import os

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    from app import db, migrate, jwt
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
    
    os.makedirs(app.config.get('UPLOAD_FOLDER', './uploads'), exist_ok=True)
    
    # Importar TODOS los blueprints
    from app.routes.auth import bp as auth_bp
    from app.routes.pacientes import bp as pacientes_bp
    from app.routes.estudios import bp as estudios_bp
    from app.routes.ordenes import bp as ordenes_bp
    from app.routes.facturas import bp as facturas_bp
    from app.routes.resultados import bp as resultados_bp
    from app.routes.reportes import bp as reportes_bp
    
    # Registrar TODOS los blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(pacientes_bp, url_prefix='/api/pacientes')
    app.register_blueprint(estudios_bp, url_prefix='/api/estudios')
    app.register_blueprint(ordenes_bp, url_prefix='/api/ordenes')
    app.register_blueprint(facturas_bp, url_prefix='/api/facturas')
    app.register_blueprint(resultados_bp, url_prefix='/api/resultados')
    app.register_blueprint(reportes_bp, url_prefix='/api/reportes')
    
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'Sistema operativo - Todos los módulos cargados'}
    
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Recurso no encontrado'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'error': 'Error interno del servidor'}, 500
    
    return app

if __name__ == '__main__':
    application = create_app(os.getenv('FLASK_ENV', 'development'))
    application.run(host='0.0.0.0', port=5000, debug=True)
EOF

echo "? TODOS LOS MÓDULOS CREADOS"
echo "================================================"
echo "Módulos instalados:"
echo "  - Auth (Autenticación)"
echo "  - Pacientes"
echo "  - Estudios"
echo "  - Órdenes"
echo "  - Facturas"
echo "  - Resultados"
echo "  - Reportes"
echo "================================================"
