"""S3 storage backend for production."""
import mimetypes

import boto3
from botocore.exceptions import ClientError
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

    def open_file(self, key: str):
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code in ("NoSuchKey", "404", "NotFound"):
                raise FileNotFoundError(f"Storage key not found: {key}") from exc
            raise
        return response["Body"]

    def get_url(self, key: str) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=self.signed_url_expiry,
        )

    def delete_file(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)
