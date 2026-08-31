import io
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import httpx
import structlog
from app.config import settings

logger = structlog.get_logger(__name__)

# Raw (non-image/video) files.
#
# NOTE: this used to store assets as delivery type "authenticated" and
# generate a "signed" URL via cloudinary.utils.cloudinary_url(sign_url=True)
# to read them back. That signing (`sign_url`) is Cloudinary's anti-tampering
# signature for *transformations* — it does NOT grant access to an
# "authenticated"-type asset, which needs either a paid token-auth add-on or
# a properly Admin-API-signed download URL (cloudinary.utils.private_download_url).
# Using the wrong mechanism made every download 401, unconditionally — this
# is why PDFs (and in practice most uploads) were failing to ingest at all.
#
# Fixed by using plain "upload" (public) delivery instead: the URL is
# deterministic and needs no signature, so there's nothing to get wrong here.
# Each object's path already embeds two random UUIDs (knowledge base id +
# file id), so it isn't practically guessable/enumerable even though it's
# not access-controlled the way a truly private asset would be — the same
# threat model as an S3/GCS object with a random key and no public listing.
RESOURCE_TYPE = "raw"
DELIVERY_TYPE = "upload"


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
        Public delivery URL for the object — deterministic, no signature
        needed (see the DELIVERY_TYPE note above for why). expiry_seconds is
        accepted for interface parity with callers; it doesn't apply here
        since there's no time-limited signature to expire.
        """
        url, _ = cloudinary.utils.cloudinary_url(
            object_name,
            resource_type=RESOURCE_TYPE,
            type=DELIVERY_TYPE,
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
