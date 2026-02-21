"""
Servicio de integración con máquinas de laboratorio
Recibe resultados vía HL7, DICOM o API REST desde las máquinas
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import psycopg2
import os
import json
from datetime import datetime
import hashlib

maquinas_bp = Blueprint('maquinas', __name__)

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))

@maquinas_bp.route('/recibir-hl7', methods=['POST'])
def recibir_resultado_hl7():
    """
    Endpoint para que las máquinas de laboratorio envíen resultados en formato HL7
    La máquina hace POST a: http://192.9.135.84:5000/api/maquinas/recibir-hl7
    """
    try:
        data = request.json
        
        # Validar datos requeridos
        if not data.get('mensaje_hl7'):
            return jsonify({'error': 'mensaje_hl7 es requerido'}), 400
        
        # Parsear mensaje HL7
        mensaje_hl7 = data['mensaje_hl7']
        
        # Extraer información del mensaje HL7
        # Formato típico: MSH|^~\&|LAB|HOSPITAL|...
        lineas = mensaje_hl7.split('\n')
        
        paciente_id = data.get('paciente_id')
        orden_id = data.get('orden_id')
        
        if not paciente_id or not orden_id:
            return jsonify({'error': 'paciente_id y orden_id son requeridos'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Buscar orden_detalle_id
        cur.execute("""
            SELECT id FROM orden_detalles 
            WHERE orden_id = %s 
            ORDER BY id DESC LIMIT 1
        """, (orden_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Orden no encontrada'}), 404
        
        orden_detalle_id = row[0]
        
        # Crear resultado
        valores_json = data.get('valores', {})
        
        cur.execute("""
            INSERT INTO resultados (
                orden_detalle_id,
                tipo_archivo,
                nombre_archivo,
                datos_hl7,
                datos_dicom,
                estado_validacion,
                fecha_importacion,
                created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            orden_detalle_id,
            'hl7',
            f'resultado_hl7_{datetime.now().strftime("%Y%m%d_%H%M%S")}.hl7',
            mensaje_hl7,
            json.dumps(valores_json),
            'pendiente'
        ))
        
        resultado_id = cur.fetchone()[0]
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'resultado_id': resultado_id,
            'message': 'Resultado recibido y almacenado correctamente'
        }), 201
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@maquinas_bp.route('/recibir-dicom', methods=['POST'])
def recibir_resultado_dicom():
    """
    Endpoint para recibir imágenes DICOM de equipos de radiología/imagenología
    La máquina hace POST a: http://192.9.135.84:5000/api/maquinas/recibir-dicom
    """
    try:
        # Archivo DICOM en formato multipart/form-data
        if 'archivo' not in request.files:
            return jsonify({'error': 'No se envió archivo'}), 400
        
        archivo = request.files['archivo']
        paciente_id = request.form.get('paciente_id')
        orden_id = request.form.get('orden_id')
        
        if not paciente_id or not orden_id:
            return jsonify({'error': 'paciente_id y orden_id son requeridos'}), 400
        
        # Guardar archivo
        upload_dir = '/home/opc/centro-diagnostico/uploads/dicom'
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = f'dicom_{orden_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.dcm'
        filepath = os.path.join(upload_dir, filename)
        archivo.save(filepath)
        
        # Calcular hash
        with open(filepath, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        
        # Guardar en BD
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id FROM orden_detalles 
            WHERE orden_id = %s 
            ORDER BY id DESC LIMIT 1
        """, (orden_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Orden no encontrada'}), 404
        
        orden_detalle_id = row[0]
        
        cur.execute("""
            INSERT INTO resultados (
                orden_detalle_id,
                tipo_archivo,
                nombre_archivo,
                ruta_archivo,
                tamano_bytes,
                hash_archivo,
                estado_validacion,
                fecha_importacion,
                created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            orden_detalle_id,
            'dicom',
            filename,
            filepath,
            os.path.getsize(filepath),
            file_hash,
            'pendiente'
        ))
        
        resultado_id = cur.fetchone()[0]
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'resultado_id': resultado_id,
            'filename': filename,
            'message': 'Imagen DICOM recibida correctamente'
        }), 201
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@maquinas_bp.route('/recibir-json', methods=['POST'])
def recibir_resultado_json():
    """
    Endpoint genérico para máquinas que envían JSON
    La máquina hace POST a: http://192.9.135.84:5000/api/maquinas/recibir-json
    
    Formato esperado:
    {
        "paciente_id": 123,
        "orden_id": 456,
        "tipo_estudio": "hemograma",
        "valores": {
            "hemoglobina": {"valor": 14.5, "unidad": "g/dL", "referencia": "12-16"},
            "leucocitos": {"valor": 7500, "unidad": "cel/µL", "referencia": "4000-11000"}
        }
    }
    """
    try:
        data = request.json
        
        paciente_id = data.get('paciente_id')
        orden_id = data.get('orden_id')
        valores = data.get('valores', {})
        
        if not paciente_id or not orden_id:
            return jsonify({'error': 'paciente_id y orden_id son requeridos'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Buscar orden_detalle
        cur.execute("""
            SELECT id FROM orden_detalles 
            WHERE orden_id = %s 
            ORDER BY id DESC LIMIT 1
        """, (orden_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Orden no encontrada'}), 404
        
        orden_detalle_id = row[0]
        
        # Insertar resultado
        cur.execute("""
            INSERT INTO resultados (
                orden_detalle_id,
                tipo_archivo,
                nombre_archivo,
                datos_dicom,
                estado_validacion,
                fecha_importacion,
                created_at
            ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            orden_detalle_id,
            'json',
            f'resultado_{data.get("tipo_estudio", "analisis")}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
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
            'message': 'Resultado recibido correctamente'
        }), 201
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@maquinas_bp.route('/estado', methods=['GET'])
def estado_servicio():
    """Verificar que el servicio de integración está activo"""
    return jsonify({
        'status': 'online',
        'servicio': 'Integración con Máquinas de Laboratorio',
        'endpoints': {
            'hl7': '/api/maquinas/recibir-hl7',
            'dicom': '/api/maquinas/recibir-dicom',
            'json': '/api/maquinas/recibir-json'
        },
        'timestamp': datetime.now().isoformat()
    }), 200
