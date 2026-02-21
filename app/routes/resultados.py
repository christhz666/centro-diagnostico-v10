from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os
import json

bp = Blueprint('resultados', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@bp.route('/', methods=['GET'])
@jwt_required()
def listar_resultados():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                r.id, 
                r.tipo_archivo, 
                r.nombre_archivo, 
                r.fecha_importacion, 
                r.estado_validacion,
                p.nombre,
                p.apellido,
                p.cedula
            FROM resultados r
            LEFT JOIN orden_detalles od ON r.orden_detalle_id = od.id
            LEFT JOIN ordenes o ON od.orden_id = o.id
            LEFT JOIN pacientes p ON o.paciente_id = p.id
            ORDER BY r.fecha_importacion DESC
            LIMIT 50
        """)
        
        resultados = []
        for row in cur.fetchall():
            resultados.append({
                'id': row[0],
                'tipo_archivo': row[1] or 'pdf',
                'nombre_archivo': row[2] or 'Sin nombre',
                'fecha': row[3].isoformat() if row[3] else None,
                'estado_validacion': row[4] or 'pendiente',
                'paciente_nombre': row[5],
                'paciente_apellido': row[6],
                'paciente_cedula': row[7]
            })
        
        cur.close()
        conn.close()
        return jsonify({'resultados': resultados}), 200
    except Exception as e:
        return jsonify({'error': str(e), 'resultados': []}), 500

@bp.route('/<int:resultado_id>', methods=['GET'])
@jwt_required()
def ver_resultado(resultado_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                r.id,
                r.tipo_archivo,
                r.nombre_archivo,
                r.fecha_importacion,
                r.estado_validacion,
                r.datos_dicom,
                r.interpretacion,
                r.valores_referencia,
                p.nombre,
                p.apellido,
                p.cedula,
                p.fecha_nacimiento,
                p.sexo,
                o.numero_orden,
                o.medico_referente
            FROM resultados r
            LEFT JOIN orden_detalles od ON r.orden_detalle_id = od.id
            LEFT JOIN ordenes o ON od.orden_id = o.id
            LEFT JOIN pacientes p ON o.paciente_id = p.id
            WHERE r.id = %s
        """, (resultado_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'No encontrado'}), 404
        
        # Parsear datos_dicom
        datos = None
        if row[5]:
            if isinstance(row[5], str):
                try:
                    datos = json.loads(row[5])
                except:
                    datos = row[5]
            else:
                datos = row[5]
        
        resultado = {
            'id': row[0],
            'tipo_archivo': row[1],
            'nombre_archivo': row[2],
            'fecha': row[3].isoformat() if row[3] else None,
            'estado_validacion': row[4],
            'datos': datos,
            'interpretacion': row[6],
            'valores_referencia': row[7],
            'paciente': {
                'nombre': row[8],
                'apellido': row[9],
                'cedula': row[10],
                'fecha_nacimiento': row[11].isoformat() if row[11] else None,
                'sexo': row[12]
            } if row[8] else None,
            'orden': {
                'numero_orden': row[13],
                'medico_referente': row[14]
            } if row[13] else None
        }
        
        cur.close()
        conn.close()
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
