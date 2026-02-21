from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from app.services.hl7_service import HL7Service
from app.services.dicom_service import DICOMService
from app import db
from app.models import Resultado, OrdenDetalle
import os
import time
import threading

class FileMonitor(FileSystemEventHandler):
    
    def __init__(self, watch_path='/home/equipos/export'):
        self.watch_path = watch_path
        os.makedirs(watch_path, exist_ok=True)
    
    def on_created(self, event):
        if event.is_directory:
            return
        
        filepath = event.src_path
        filename = os.path.basename(filepath)
        
        # Esperar a que el archivo termine de escribirse
        time.sleep(2)
        
        try:
            if filename.endswith('.hl7'):
                self.process_hl7(filepath)
            elif filename.endswith('.dcm'):
                self.process_dicom(filepath)
        except Exception as e:
            print(f"Error processing {filepath}: {str(e)}")
    
    def process_hl7(self, filepath):
        """Procesar archivo HL7"""
        data = HL7Service.parse_hl7_file(filepath)
        print(f"HL7 procesado: {data['patient']['name']}")
        # Aquí guardarías el resultado en la BD
    
    def process_dicom(self, filepath):
    """Procesar archivo DICOM y enviar a Orthanc"""
    import requests
    
    metadata = DICOMService.parse_dicom_file(filepath)
    print(f"DICOM procesado: {metadata['patient_name']}")
    
    # Enviar a Orthanc
    try:
        with open(filepath, 'rb') as f:
            response = requests.post(
                'http://127.0.0.1:8042/instances',
                data=f.read(),
                auth=('orthanc', 'orthanc'),
                headers={'Content-Type': 'application/dicom'}
            )
        if response.status_code == 200:
            print(f"? DICOM enviado a Orthanc: {metadata['patient_name']}")
        else:
            print(f"? Error Orthanc: {response.status_code}")
    except Exception as e:
        print(f"? Error enviando a Orthanc: {str(e)}")
    
    @staticmethod
    def start_monitoring(watch_path='/home/equipos/export'):
        """Iniciar monitor en segundo plano"""
        event_handler = FileMonitor(watch_path)
        observer = Observer()
        observer.schedule(event_handler, watch_path, recursive=True)
        observer.start()
        print(f"Monitoring {watch_path} for new files...")
        return observer
