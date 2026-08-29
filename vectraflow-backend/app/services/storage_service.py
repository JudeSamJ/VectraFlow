import io
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import httpx
import structlog
from app.config import settings

logger = structlog.get_logger(__name__)

# Raw (non-image/video) files, stored as "authenticated" assets so they're
# not reachable by guessing a URL — only via a signed URL we generate.
RESOURCE_TYPE = "raw"
DELIVERY_TYPE = "authenticated"


class StorageService:
    """
    Document object storage backed by Cloudinary's Raw Upload API.

    Replaces a previous AWS S3-based implementation — this app has no AWS
    account, IAM credentials, or S3 bucket anywhere in it anymore.
    """

    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        self._http = httpx.AsyncClient(timeout=30.0)

    async def upload_file(
        self,
        object_name: str,
        file_data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload bytes to Cloudinary and return the object key (public_id)."""
        try:
            cloudinary.uploader.upload(
                io.BytesIO(file_data),
                public_id=object_name,
                resource_type=RESOURCE_TYPE,
                type=DELIVERY_TYPE,
                overwrite=True,
                unique_filename=False,
                use_filename=False,
            )
            logger.info("cloudinary_upload_success", key=object_name, size=len(file_data))
            return object_name
        except Exception as e:
            logger.error("cloudinary_upload_failed", key=object_name, error=str(e))
            raise

    def generate_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> str:
        """
        Signed URL for a private object. Note: unlike an S3 presigned URL,
        this doesn't carry a hard time-based expiry on Cloudinary's free
        plan (that needs the separate token-auth add-on) — the signature
        just ties the URL to this app's API secret, so it isn't guessable.
        expiry_seconds is accepted for interface parity with callers.
        """
        url, _ = cloudinary.utils.cloudinary_url(
            object_name,
            resource_type=RESOURCE_TYPE,
            type=DELIVERY_TYPE,
            sign_url=True,
        )
        return url

    async def download_file(self, object_name: str) -> bytes:
        """Download an object from Cloudinary and return its bytes."""
        try:
            url = self.generate_presigned_url(object_name)
            response = await self._http.get(url)
            response.raise_for_status()
            logger.info("cloudinary_download_success", key=object_name, size=len(response.content))
            return response.content
        except Exception as e:
            logger.error("cloudinary_download_failed", key=object_name, error=str(e))
            raise

    async def delete_file(self, object_name: str) -> None:
        """Delete an object from Cloudinary."""
        try:
            result = cloudinary.uploader.destroy(
                object_name,
                resource_type=RESOURCE_TYPE,
                type=DELIVERY_TYPE,
                invalidate=True,
            )
            logger.info("cloudinary_delete_success", key=object_name, result=result.get("result"))
        except Exception as e:
            logger.error("cloudinary_delete_failed", key=object_name, error=str(e))
            raise


storage_service = StorageService()
