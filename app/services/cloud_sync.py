import boto3
from botocore.exceptions import ClientError
import os
from datetime import datetime
import json

class CloudSyncService:
    
    def __init__(self, service='aws'):
        self.service = service
        if service == 'aws':
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            self.bucket = os.getenv('AWS_S3_BUCKET', 'centro-diagnostico-backups')
    
    def upload_backup(self, local_path, remote_name=None):
        """Subir respaldo a AWS S3"""
        if not remote_name:
            remote_name = f"backups/{datetime.now().strftime('%Y/%m/%d')}/{os.path.basename(local_path)}"
        
        try:
            self.s3_client.upload_file(local_path, self.bucket, remote_name)
            return {'success': True, 'location': f"s3://{self.bucket}/{remote_name}"}
        except ClientError as e:
            return {'success': False, 'error': str(e)}
    
    def upload_resultado(self, local_path, paciente_id, tipo):
        """Subir resultado médico a S3"""
        remote_name = f"resultados/{paciente_id}/{tipo}/{os.path.basename(local_path)}"
        return self.upload_backup(local_path, remote_name)
    
    def list_backups(self, prefix='backups/'):
        """Listar respaldos disponibles"""
        try:
            response = self.s3_client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
            if 'Contents' not in response:
                return []
            return [{'key': obj['Key'], 'size': obj['Size'], 'modified': obj['LastModified'].isoformat()} for obj in response['Contents']]
        except ClientError as e:
            return []
    
    def download_backup(self, remote_key, local_path):
        """Descargar respaldo desde S3"""
        try:
            self.s3_client.download_file(self.bucket, remote_key, local_path)
            return {'success': True, 'path': local_path}
        except ClientError as e:
            return {'success': False, 'error': str(e)}

class AzureSyncService:
    
    def __init__(self):
        from azure.storage.blob import BlobServiceClient
        connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        self.blob_service = BlobServiceClient.from_connection_string(connection_string)
        self.container = os.getenv('AZURE_CONTAINER', 'centro-diagnostico')
    
    def upload_file(self, local_path, blob_name):
        """Subir archivo a Azure Blob Storage"""
        try:
            blob_client = self.blob_service.get_blob_client(container=self.container, blob=blob_name)
            with open(local_path, 'rb') as data:
                blob_client.upload_blob(data, overwrite=True)
            return {'success': True, 'url': blob_client.url}
        except Exception as e:
            return {'success': False, 'error': str(e)}
