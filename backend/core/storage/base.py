"""Abstract storage backend for PixelForge."""
from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Abstract base class for file storage backends."""

    @abstractmethod
    def upload_file(self, file_obj, key: str) -> str:
        """Upload a file-like object to the given key. Returns the stored key."""
        ...

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Return an accessible URL for the given key."""
        ...

    @abstractmethod
    def delete_file(self, key: str) -> None:
        """Delete the file at the given key."""
        ...
