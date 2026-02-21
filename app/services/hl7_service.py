from hl7apy.parser import parse_message
from hl7apy.core import Message
from datetime import datetime
import os

class HL7Service:
    
    @staticmethod
    def parse_hl7_file(filepath):
        """Parsear archivo HL7 y extraer datos del paciente y resultados"""
        try:
            with open(filepath, 'r') as f:
                hl7_content = f.read()
            
            message = parse_message(hl7_content)
            
            # Extraer datos del paciente (PID segment)
            pid = message.pid
            patient_data = {
                'patient_id': str(pid.pid_3) if pid.pid_3 else None,
                'name': str(pid.pid_5) if pid.pid_5 else None,
                'dob': str(pid.pid_7) if pid.pid_7 else None,
                'sex': str(pid.pid_8) if pid.pid_8 else None
            }
            
            # Extraer resultados (OBX segments)
            results = []
            for obx in message.obx:
                results.append({
                    'test_id': str(obx.obx_3) if obx.obx_3 else None,
                    'test_name': str(obx.obx_3.obx_3_2) if obx.obx_3.obx_3_2 else None,
                    'value': str(obx.obx_5) if obx.obx_5 else None,
                    'units': str(obx.obx_6) if obx.obx_6 else None,
                    'reference_range': str(obx.obx_7) if obx.obx_7 else None,
                    'status': str(obx.obx_11) if obx.obx_11 else None
                })
            
            return {
                'patient': patient_data,
                'results': results,
                'message_type': str(message.msh.msh_9) if message.msh.msh_9 else None,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            raise Exception(f"Error parsing HL7: {str(e)}")
    
    @staticmethod
    def create_hl7_message(patient_data, order_data):
        """Crear mensaje HL7 para enviar a equipos"""
        msg = Message("ORM_O01")
        msg.msh.msh_3 = "CENTRO_DIAGNOSTICO"
        msg.msh.msh_4 = "LAB"
        msg.msh.msh_7 = datetime.now().strftime("%Y%m%d%H%M%S")
        msg.msh.msh_9 = "ORM^O01"
        msg.msh.msh_10 = str(order_data['order_id'])
        msg.msh.msh_11 = "P"
        msg.msh.msh_12 = "2.5"
        
        msg.pid.pid_1 = "1"
        msg.pid.pid_3 = patient_data['patient_id']
        msg.pid.pid_5 = patient_data['name']
        msg.pid.pid_7 = patient_data.get('dob', '')
        msg.pid.pid_8 = patient_data.get('sex', '')
        
        return msg.to_er7()
