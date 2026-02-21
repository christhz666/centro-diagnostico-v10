from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os

bp = Blueprint('citas', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/hoy', methods=['GET'])
@jwt_required()
def get_citas_hoy():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT o.id, o.fecha_orden, p.nombre, p.apellido, p.cedula, 
                   o.estado, COUNT(od.id) as cantidad_estudios,
                   p.telefono, p.email
            FROM ordenes o
            JOIN pacientes p ON o.paciente_id = p.id
            LEFT JOIN orden_detalles od ON o.id = od.orden_id
            WHERE DATE(o.fecha_orden) = CURRENT_DATE
            GROUP BY o.id, o.fecha_orden, p.nombre, p.apellido, p.cedula, 
                     o.estado, p.telefono, p.email
            ORDER BY o.fecha_orden DESC
        """)
        
        citas = []
        for row in cur.fetchall():
            citas.append({
                'id': row[0],
                'hora': row[1].strftime('%H:%M') if row[1] else None,
                'paciente': f"{row[2]} {row[3]}",
                'cedula': row[4],
                'estado': row[5] or 'programada',
                'estudios': row[6] or 0,
                'telefono': row[7],
                'email': row[8]
            })
        
        cur.close()
        conn.close()
        
        return jsonify(citas), 200
        
    except Exception as e:
        print(f"? Error en citas hoy: {e}")
        return jsonify({'error': str(e)}), 500
