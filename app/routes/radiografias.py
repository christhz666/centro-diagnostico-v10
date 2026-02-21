from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os

bp = Blueprint('radiografias', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_radiografias():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT r.id, r.tipo_estudio, r.region_anatomica, r.informe_medico, 
                   r.estado, r.fecha_toma, p.nombre, p.apellido, p.cedula
            FROM radiografias r
            LEFT JOIN pacientes p ON r.paciente_id = p.id
            ORDER BY r.fecha_toma DESC LIMIT 100
        """)
        radiografias = []
        for row in cur.fetchall():
            radiografias.append({
                'id': row[0], 'tipo_estudio': row[1], 'region_anatomica': row[2],
                'informe_medico': row[3], 'estado': row[4],
                'fecha_toma': row[5].isoformat() if row[5] else None,
                'paciente': f"{row[6]} {row[7]}", 'cedula': row[8]
            })
        cur.close()
        conn.close()
        return jsonify(radiografias), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/tipos', methods=['GET'])
@jwt_required()
def listar_tipos():
    tipos = ['Radiografía de Tórax', 'Radiografía de Columna', 'Radiografía de Extremidades',
             'Radiografía Dental', 'Radiografía Abdominal', 'Mamografía', 'Tomografía', 'Resonancia Magnética']
    return jsonify(tipos), 200
