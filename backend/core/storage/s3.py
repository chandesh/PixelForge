"""S3 storage backend for production."""
import mimetypes
from io import BytesIO
import boto3
from django.conf import settings
from .base import StorageBackend


class S3Backend(StorageBackend):
    """Stores files on AWS S3 with pre-signed URL access."""

    def __init__(self):
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        self.bucket = settings.AWS_STORAGE_BUCKET_NAME
        self.signed_url_expiry = settings.AWS_S3_SIGNED_URL_EXPIRY

    def upload_file(self, file_obj, key: str) -> str:
        content_type, _ = mimetypes.guess_type(key)
        if content_type is None:
            content_type = "application/octet-stream"
        self.client.upload_fileobj(file_obj, self.bucket, key, ExtraArgs={"ContentType": content_type})
        return key

    def get_url(self, key: str) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=self.signed_url_expiry,
        )

    def delete_file(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)
