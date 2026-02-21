from flask import Blueprint, request, jsonify
import psycopg2
import os
import json
from datetime import datetime

bp = Blueprint('maquinas', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/recibir-json', methods=['POST'])
def recibir_resultado_json():
    """Recibir resultados en formato JSON desde máquinas"""
    try:
        data = request.json
        
        paciente_id = data.get('paciente_id')
        orden_id = data.get('orden_id')
        valores = data.get('valores', {})
        
        if not paciente_id or not orden_id:
            return jsonify({'error': 'paciente_id y orden_id requeridos'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM orden_detalles WHERE orden_id = %s ORDER BY id DESC LIMIT 1", (orden_id,))
        row = cur.fetchone()
        
        if not row:
            return jsonify({'error': 'Orden no encontrada'}), 404
        
        orden_detalle_id = row[0]
        
        cur.execute("""
            INSERT INTO resultados (
                orden_detalle_id, tipo_archivo, nombre_archivo, datos_dicom,
                estado_validacion, fecha_importacion, created_at
            ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            orden_detalle_id,
            'json',
            f'resultado_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
            json.dumps(valores),
            'pendiente'
        ))
        
        resultado_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'resultado_id': resultado_id,
            'message': 'Resultado recibido'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/estado', methods=['GET'])
def estado_servicio():
    """Estado del servicio"""
    return jsonify({
        'status': 'online',
        'servicio': 'Integración Máquinas',
        'endpoints': {
            'json': '/api/maquinas/recibir-json',
            'estado': '/api/maquinas/estado'
        }
    }), 200
