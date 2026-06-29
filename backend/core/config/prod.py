"""Production settings for PixelForge."""
from .base import *

DEBUG = False

STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "s3")

# S3 settings — all from environment
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
AWS_S3_SIGNED_URL_EXPIRY = int(os.environ.get("AWS_S3_SIGNED_URL_EXPIRY", "3600"))

# No MEDIA_ROOT/MEDIA_URL in prod — S3 serves directly
# TODO: Configure S3 bucket CORS for direct browser uploads if needed
