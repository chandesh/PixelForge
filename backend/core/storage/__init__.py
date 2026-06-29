"""Storage backend abstraction for PixelForge."""
from .factory import StorageFactory

storage = StorageFactory.get_backend()
__all__ = ["storage"]
