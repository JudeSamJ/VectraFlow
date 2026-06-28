from minio import Minio
from minio.error import S3Error
from app.config import settings
import structlog
import io

logger = structlog.get_logger(__name__)

class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info("minio_bucket_created", bucket=self.bucket)
        except S3Error as e:
            logger.error("minio_bucket_check_failed", error=str(e))
            raise

    async def upload_file(self, object_name: str, file_data: bytes, content_type: str = "application/octet-stream") -> str:
        """Uploads a file to MinIO and returns the storage path (object name)"""
        try:
            self.client.put_object(
                self.bucket,
                object_name,
                io.BytesIO(file_data),
                length=len(file_data),
                content_type=content_type
            )
            return object_name
        except S3Error as e:
            logger.error("minio_upload_failed", object_name=object_name, error=str(e))
            raise

    async def download_file(self, object_name: str) -> bytes:
        """Downloads a file from MinIO"""
        try:
            response = self.client.get_object(self.bucket, object_name)
            return response.read()
        except S3Error as e:
            logger.error("minio_download_failed", object_name=object_name, error=str(e))
            raise
        finally:
            if 'response' in locals():
                response.close()
                self.client.get_object(self.bucket, object_name).release_conn()

    async def delete_file(self, object_name: str) -> None:
        """Deletes a file from MinIO"""
        try:
            self.client.remove_object(self.bucket, object_name)
        except S3Error as e:
            logger.error("minio_delete_failed", object_name=object_name, error=str(e))
            raise

storage_service = StorageService()
