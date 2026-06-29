import os
from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS += ["django_extensions"]

MEDIA_ROOT = os.environ.get("MEDIA_ROOT", "/app/media")
MEDIA_URL = os.environ.get("MEDIA_URL", "/media/")

STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "local")


