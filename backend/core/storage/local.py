from pathlib import Path
from django.conf import settings
from .base import StorageBackend


class LocalBackend(StorageBackend):

    def __init__(self):
        self.media_root = Path(settings.MEDIA_ROOT).resolve()

    def _path(self, key: str) -> Path:
        path = (self.media_root / key).resolve()
        if path != self.media_root and self.media_root not in path.parents:
            raise ValueError("Invalid storage key.")
        return path

    def upload_file(self, file_obj, key: str) -> str:
        dest = self._path(key)
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

    def open_file(self, key: str):
        path = self._path(key)
        if not path.is_file():
            raise FileNotFoundError(f"Storage key not found: {key}")
        return open(path, "rb")

    def get_url(self, key: str) -> str:
        return f"{settings.MEDIA_URL}{key}"

    def delete_file(self, key: str) -> None:
        path = self._path(key)
        if path.exists():
            path.unlink()
