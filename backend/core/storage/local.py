import os
from pathlib import Path
from django.conf import settings
from .base import StorageBackend


class LocalBackend(StorageBackend):

    def __init__(self):
        self.media_root = Path(settings.MEDIA_ROOT)

    def upload_file(self, file_obj, key: str) -> str:
        dest = self.media_root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            if hasattr(file_obj, "chunks"):
                for chunk in file_obj.chunks():
                    f.write(chunk)
            else:
                while True:
                    chunk = file_obj.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        return key

    def get_url(self, key: str) -> str:
        return f"{settings.MEDIA_URL}{key}"

    def delete_file(self, key: str) -> None:
        path = self.media_root / key
        if path.exists():
            os.remove(path)
