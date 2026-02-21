import pydicom
from datetime import datetime
import os

class DICOMService:
    
    @staticmethod
    def parse_dicom_file(filepath):
        """Leer archivo DICOM y extraer metadatos"""
        try:
            ds = pydicom.dcmread(filepath)
            
            metadata = {
                'patient_id': str(ds.PatientID) if hasattr(ds, 'PatientID') else None,
                'patient_name': str(ds.PatientName) if hasattr(ds, 'PatientName') else None,
                'patient_dob': str(ds.PatientBirthDate) if hasattr(ds, 'PatientBirthDate') else None,
                'patient_sex': str(ds.PatientSex) if hasattr(ds, 'PatientSex') else None,
                'study_date': str(ds.StudyDate) if hasattr(ds, 'StudyDate') else None,
                'study_time': str(ds.StudyTime) if hasattr(ds, 'StudyTime') else None,
                'study_description': str(ds.StudyDescription) if hasattr(ds, 'StudyDescription') else None,
                'modality': str(ds.Modality) if hasattr(ds, 'Modality') else None,
                'institution_name': str(ds.InstitutionName) if hasattr(ds, 'InstitutionName') else None,
                'series_description': str(ds.SeriesDescription) if hasattr(ds, 'SeriesDescription') else None,
                'image_type': str(ds.ImageType) if hasattr(ds, 'ImageType') else None,
                'rows': int(ds.Rows) if hasattr(ds, 'Rows') else None,
                'columns': int(ds.Columns) if hasattr(ds, 'Columns') else None
            }
            
            return metadata
        except Exception as e:
            raise Exception(f"Error parsing DICOM: {str(e)}")
    
    @staticmethod
    def convert_dicom_to_png(dicom_path, output_path):
        """Convertir DICOM a PNG para visualización"""
        try:
            ds = pydicom.dcmread(dicom_path)
            pixel_array = ds.pixel_array
            
            from PIL import Image
            import numpy as np
            
            # Normalizar y convertir a imagen
            pixel_array = pixel_array - np.min(pixel_array)
            pixel_array = pixel_array / np.max(pixel_array)
            pixel_array = (pixel_array * 255).astype(np.uint8)
            
            image = Image.fromarray(pixel_array)
            image.save(output_path)
            return output_path
        except Exception as e:
            raise Exception(f"Error converting DICOM: {str(e)}")
