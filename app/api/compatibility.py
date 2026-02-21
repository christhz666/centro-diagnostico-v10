from flask import Blueprint, jsonify, request
from datetime import date, datetime

bp = Blueprint('compatibility', __name__)

@bp.route('/test', methods=['GET'])
def test_compat():
    return jsonify({
        'status': 'ok', 
        'message': 'Compatibility layer working',
        'timestamp': datetime.now().isoformat()
    }), 200

@bp.route('/compat/dashboard/stats', methods=['GET'])
@bp.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    try:
        from app import db
        from app.models import Paciente, Estudio, Usuario, Orden, Factura
        
        stats = {
            'total_pacientes': Paciente.query.count(),
            'total_estudios': Estudio.query.filter_by(activo=True).count(),
            'total_usuarios': Usuario.query.filter_by(activo=True).count(),
            'ordenes_pendientes': Orden.query.filter_by(estado='pendiente').count(),
        }
        return jsonify({'success': True, 'data': stats}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/compat/citas/hoy', methods=['GET'])
@bp.route('/citas/hoy', methods=['GET'])
def citas_hoy():
    try:
        from app import db
        from app.models import Orden
        hoy = date.today()
        citas = Orden.query.filter(db.func.date(Orden.fecha_creacion) == hoy).all()
        return jsonify({'success': True, 'data': [c.to_dict() for c in citas]}), 200
    except Exception as e:
        return jsonify({'success': True, 'data': [], 'error': str(e)}), 200

@bp.route('/compat/estudios/categorias', methods=['GET'])
@bp.route('/estudios/categorias', methods=['GET'])
def estudios_categorias():
    return jsonify({'success': True, 'data': [
        {'id': 1, 'nombre': 'Hematologia'},
        {'id': 2, 'nombre': 'Quimica Sanguinea'},
        {'id': 3, 'nombre': 'Inmunologia'},
        {'id': 4, 'nombre': 'Urinalisis'},
        {'id': 5, 'nombre': 'Microbiologia'},
    ]}), 200

@bp.route('/equipos', methods=['GET'])
def equipos_list():
    return jsonify({'success': True, 'data': []}), 200

@bp.route('/admin/usuarios', methods=['GET'])
def admin_usuarios():
    try:
        from app.models import Usuario
        usuarios = Usuario.query.all()
        return jsonify({'success': True, 'data': [u.to_dict() for u in usuarios]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/citas', methods=['GET'])
def citas_list():
    try:
        from app.models import Orden
        ordenes = Orden.query.all()
        return jsonify({'success': True, 'data': [o.to_dict() for o in ordenes]}), 200
    except Exception as e:
        return jsonify({'success': True, 'data': []}), 200

@bp.route('/pacientes/', methods=['GET'])
def pacientes_search():
    try:
        from app.models import Paciente
        pacientes = Paciente.query.limit(50).all()
        return jsonify({'success': True, 'data': [p.to_dict() for p in pacientes]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/estudios/', methods=['GET'])
def estudios_list():
    try:
        from app.models import Estudio
        estudios = Estudio.query.filter_by(activo=True).all()
        return jsonify({'success': True, 'data': [e.to_dict() for e in estudios]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/resultados/', methods=['GET'])
def resultados_list():
    try:
        from app.models import Resultado
        resultados = Resultado.query.limit(100).all()
        return jsonify({'success': True, 'data': [r.to_dict() for r in resultados]}), 200
    except Exception as e:
        return jsonify({'success': True, 'data': []}), 200

@bp.route('/facturas/', methods=['GET'])
def facturas_list():
    try:
        from app.models import Factura
        facturas = Factura.query.limit(100).all()
        return jsonify({'success': True, 'data': [f.to_dict() for f in facturas]}), 200
    except Exception as e:
        return jsonify({'success': True, 'data': []}), 200
