from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.hl7_service import HL7Service
from app.services.dicom_service import DICOMService
import os

bp = Blueprint('integraciones', __name__)

@bp.route('/hl7/parse', methods=['POST'])
@jwt_required()
def parse_hl7():
    """Procesar archivo HL7 subido"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        filepath = f"/tmp/{file.filename}"
        file.save(filepath)
        data = HL7Service.parse_hl7_file(filepath)
        os.remove(filepath)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/dicom/parse', methods=['POST'])
@jwt_required()
def parse_dicom():
    """Procesar archivo DICOM subido"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        filepath = f"/tmp/{file.filename}"
        file.save(filepath)
        metadata = DICOMService.parse_dicom_file(filepath)
        os.remove(filepath)
        return jsonify({'success': True, 'metadata': metadata})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
