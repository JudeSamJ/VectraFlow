import io
import boto3
from botocore.exceptions import ClientError
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class StorageService:
    """
    AWS S3 object storage service.
    Uses boto3 with standard AWS credentials (access key + secret, or IAM role).
    """

    def __init__(self):
        session = boto3.session.Session()
        client_kwargs = dict(
            service_name="s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        if settings.AWS_S3_ENDPOINT_URL:
            # VPC endpoint or LocalStack for local testing
            client_kwargs["endpoint_url"] = settings.AWS_S3_ENDPOINT_URL

        self.client = session.client(**client_kwargs)
        self.bucket = settings.AWS_S3_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
            logger.info("s3_bucket_exists", bucket=self.bucket)
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("404", "NoSuchBucket"):
                self.client.create_bucket(
                    Bucket=self.bucket,
                    CreateBucketConfiguration={"LocationConstraint": settings.AWS_REGION}
                    if settings.AWS_REGION != "us-east-1" else {},
                )
                # Block all public access
                self.client.put_public_access_block(
                    Bucket=self.bucket,
                    PublicAccessBlockConfiguration={
                        "BlockPublicAcls": True,
                        "IgnorePublicAcls": True,
                        "BlockPublicPolicy": True,
                        "RestrictPublicBuckets": True,
                    },
                )
                logger.info("s3_bucket_created", bucket=self.bucket)
            else:
                logger.error("s3_bucket_check_failed", error=str(e))
                raise

    async def upload_file(
        self,
        object_name: str,
        file_data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload bytes to S3 and return the object key."""
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=object_name,
                Body=io.BytesIO(file_data),
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
            logger.info("s3_upload_success", key=object_name, size=len(file_data))
            return object_name
        except ClientError as e:
            logger.error("s3_upload_failed", key=object_name, error=str(e))
            raise

    async def download_file(self, object_name: str) -> bytes:
        """Download an object from S3 and return its bytes."""
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=object_name)
            data = response["Body"].read()
            logger.info("s3_download_success", key=object_name, size=len(data))
            return data
        except ClientError as e:
            logger.error("s3_download_failed", key=object_name, error=str(e))
            raise

    async def delete_file(self, object_name: str) -> None:
        """Delete an object from S3."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=object_name)
            logger.info("s3_delete_success", key=object_name)
        except ClientError as e:
            logger.error("s3_delete_failed", key=object_name, error=str(e))
            raise

    def generate_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> str:
        """Generate a time-limited presigned GET URL for a private object."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": object_name},
            ExpiresIn=expiry_seconds,
        )


storage_service = StorageService()
