"""Validation helpers for image uploads, URLs, and output labels."""
import ipaddress
import re
import socket
import warnings
from urllib.parse import urlsplit

from django.conf import settings
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
_LABEL_SAFE_RE = re.compile(r"[^a-z0-9]+")


class ImageValidationError(ValueError):
    """Raised when user-supplied image input is invalid or unsafe."""


def sanitize_label(label: str, fallback: str = "output") -> str:
    """Return a filesystem-safe slug for an output label."""
    slug = _LABEL_SAFE_RE.sub("-", (label or "").lower()).strip("-")
    return slug[:100] or fallback


def validate_image_file(file_obj, max_bytes: int | None = None) -> None:
    """Validate an uploaded image's size, format, and dimensions."""
    max_bytes = max_bytes or getattr(settings, "MAX_IMAGE_UPLOAD_BYTES", 25 * 1024 * 1024)
    size = getattr(file_obj, "size", None)
    if size is not None and size > max_bytes:
        raise ImageValidationError(
            f"Image is too large. Maximum size is {max_bytes // (1024 * 1024)} MB."
        )

    try:
        file_obj.seek(0)
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(file_obj) as image:
                image_format = (image.format or "").upper()
                width, height = image.size
                image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        raise ImageValidationError(
            "The file is not a valid image. Upload a JPEG, PNG, WebP, or GIF."
        ) from exc
    except Image.DecompressionBombWarning as exc:
        raise ImageValidationError("The image dimensions are too large.") from exc
    finally:
        file_obj.seek(0)

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise ImageValidationError("Unsupported image format. Use JPEG, PNG, WebP, or GIF.")

    max_dimension = getattr(settings, "MAX_IMAGE_DIMENSION", 10000)
    if width < 1 or height < 1 or width > max_dimension or height > max_dimension:
        raise ImageValidationError(
            f"Image dimensions must be between 1 and {max_dimension} pixels."
        )


def validate_image_path(path: str) -> None:
    """Validate an image already written to disk."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as image:
                image_format = (image.format or "").upper()
                width, height = image.size
                image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        raise ImageValidationError(
            "The image is not a valid JPEG, PNG, WebP, or GIF file."
        ) from exc
    except Image.DecompressionBombWarning as exc:
        raise ImageValidationError("The image dimensions are too large.") from exc

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise ImageValidationError("Unsupported image format. Use JPEG, PNG, WebP, or GIF.")

    max_dimension = getattr(settings, "MAX_IMAGE_DIMENSION", 10000)
    if width < 1 or height < 1 or width > max_dimension or height > max_dimension:
        raise ImageValidationError(
            f"Image dimensions must be between 1 and {max_dimension} pixels."
        )


def validate_remote_image_url(url: str, *, resolve: bool = True) -> None:
    """Reject non-HTTP(S) URLs and URLs that resolve to non-public addresses."""
    if not url:
        raise ImageValidationError("A URL is required.")

    parsed = urlsplit(url)
    if parsed.scheme not in ("http", "https"):
        raise ImageValidationError("Only http and https URLs are supported.")
    if not parsed.hostname:
        raise ImageValidationError("The URL must include a hostname.")
    if parsed.username or parsed.password:
        raise ImageValidationError("URLs with embedded credentials are not supported.")

    try:
        literal_address = ipaddress.ip_address(parsed.hostname)
    except ValueError:
        literal_address = None
    if literal_address is not None and not literal_address.is_global:
        raise ImageValidationError("The URL must point to a public internet address.")

    if not resolve:
        return

    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ImageValidationError("The URL hostname could not be resolved.") from exc

    if not addresses:
        raise ImageValidationError("The URL hostname could not be resolved.")

    for family, _, _, _, sockaddr in addresses:
        if family not in (socket.AF_INET, socket.AF_INET6):
            continue
        address = ipaddress.ip_address(sockaddr[0])
        if not address.is_global:
            raise ImageValidationError("The URL must point to a public internet address.")
