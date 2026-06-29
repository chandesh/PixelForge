"""Storage backend factory — instantiates the correct backend from settings."""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class StorageFactory:
    """Factory for creating storage backend instances.

    Reads STORAGE_BACKEND from Django settings and returns the appropriate
    backend singleton.
    """

    _instance = None

    @classmethod
    def get_backend(cls):
        if cls._instance is None:
            backend_name = getattr(settings, "STORAGE_BACKEND", "local")
            if backend_name == "local":
                from .local import LocalBackend
                cls._instance = LocalBackend()
            elif backend_name == "s3":
                from .s3 import S3Backend
                cls._instance = S3Backend()
            else:
                raise ImproperlyConfigured(
                    f"Unknown STORAGE_BACKEND '{backend_name}'. "
                    f"Valid values: 'local', 's3'."
                )
        return cls._instance
