"""Celery tasks for image processing.

Primary: pyvips (libvips C bindings for speed).
Fallback: Pillow (pure Python, slower but reliable).
"""
import os
import shutil
import tempfile
import uuid
import logging

from celery import shared_task
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from PIL import Image

from .validators import (
    ImageValidationError,
    sanitize_label,
    validate_image_path,
    validate_remote_image_url,
)

logger = logging.getLogger(__name__)

EXTENSION_BY_FORMAT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}


class NoOutputsGenerated(RuntimeError):
    """Raised when every requested output size failed."""


def classify_error(exception: Exception) -> str:
    exception_type = type(exception).__name__
    exception_msg = str(exception).lower()

    logger.error(
        "ResizeJob processing failed",
        exc_info=True,
        extra={"exception_type": exception_type},
    )

    if exception_type == "NoOutputsGenerated":
        return "None of the requested output sizes could be generated. Please try a different image or fewer sizes."

    if exception_type == "ImageValidationError":
        return str(exception)

    if exception_type in (
        "ConnectionError", "ConnectTimeout", "ReadTimeout",
        "RequestException", "HTTPError",
    ):
        return "Could not download the image from the provided URL. Please check the URL and try again."

    if "timeout" in exception_msg:
        return "The request timed out while downloading the image. Please try again."

    if exception_type == "FileNotFoundError":
        return "Could not find the source image file. Please try uploading the file again."

    if "404" in exception_msg or "not found" in exception_msg:
        return "The image URL could not be found. Please check that the URL is correct and publicly accessible."

    if "403" in exception_msg or "forbidden" in exception_msg or "unauthorized" in exception_msg:
        return "Access to the image URL was denied. Please ensure the image is publicly accessible."

    if exception_type in ("UnidentifiedImageError", "DecompressionBombError"):
        return "The file does not appear to be a valid image. Please upload a JPEG, PNG, WebP, or GIF file."

    if "unsupported" in exception_msg or "cannot identify" in exception_msg:
        return "This image format is not supported. Please convert to JPEG, PNG, or WebP and try again."

    if "truncated" in exception_msg or "corrupt" in exception_msg:
        return "The image file appears to be corrupted or incomplete. Please try uploading the file again."

    if "decompression bomb" in exception_msg:
        return "The image dimensions are too large to process safely. Please use an image smaller than 10,000 × 10,000 pixels."

    if exception_type in ("ClientError", "BotoCoreError", "NoCredentialsError"):
        return "There was a problem saving your processed files. Please try again or contact support if the issue persists."

    if "no space left" in exception_msg or "disk" in exception_msg:
        return "The server ran out of storage space while processing your image. Please try again later."

    if "permission denied" in exception_msg:
        return "A storage permission error occurred. Please try again or contact support."

    if exception_type in ("MemoryError", "OSError") or "memory" in exception_msg:
        return "The image is too large to process with the available resources. Please try a smaller image or fewer output sizes."

    if exception_type in ("Error", "VipsError") and "vips" in exception_msg:
        return "An error occurred while processing the image. Please try a different image format or contact support."

    if exception_type in ("IOError",):
        return "Could not read the image file. Please ensure the file is not corrupted."

    if "invalid" in exception_msg and ("width" in exception_msg or "height" in exception_msg):
        return "One or more of the requested output dimensions are invalid. Please review your size selections."

    return "An unexpected error occurred while processing your image. Please try again. If the problem continues, contact support."


def _process_with_pyvips(source_path, dest_path, width, height):
    """Resize using pyvips, then pad to exact dimensions."""
    import pyvips

    image = pyvips.Image.new_from_file(source_path, access="sequential")
    resized = image.thumbnail_image(width, height=height)
    left = max(0, (width - resized.width) // 2)
    top = max(0, (height - resized.height) // 2)
    resized = resized.embed(
        left,
        top,
        width,
        height,
        extend="background",
        background=[255, 255, 255],
    )
    ext = os.path.splitext(dest_path)[1].lower()
    options = {"Q": 90} if ext in (".jpg", ".jpeg", ".webp") else {}
    resized.write_to_file(dest_path, **options)


def _process_with_pillow(source_path, dest_path, width, height):
    """Resize using Pillow as fallback."""
    with Image.open(source_path) as img:
        if img.mode in ("RGBA", "P", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            rgba = img.convert("RGBA")
            background.paste(rgba, mask=rgba.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.thumbnail((width, height), Image.LANCZOS)
        result = Image.new("RGB", (width, height), (255, 255, 255))
        offset_x = (width - img.width) // 2
        offset_y = (height - img.height) // 2
        result.paste(img, (offset_x, offset_y))
        result.save(dest_path, quality=90)


def _download_remote_image(url: str, dest_path: str) -> None:
    import requests

    validate_remote_image_url(url)
    max_bytes = getattr(settings, "MAX_IMAGE_DOWNLOAD_BYTES", 25 * 1024 * 1024)
    timeout = getattr(settings, "REMOTE_FETCH_TIMEOUT_SECONDS", 30)

    response = requests.get(
        url,
        stream=True,
        timeout=(5, timeout),
        allow_redirects=False,
    )
    try:
        status_code = getattr(response, "status_code", None)
        if isinstance(status_code, int) and 300 <= status_code < 400:
            raise ImageValidationError("Image URLs must not redirect.")
        response.raise_for_status()

        headers = getattr(response, "headers", {}) or {}
        content_length = headers.get("Content-Length") if hasattr(headers, "get") else None
        try:
            if content_length is not None and int(content_length) > max_bytes:
                raise ImageValidationError("The remote image is too large.")
        except (TypeError, ValueError):
            pass

        total = 0
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=65536):
                if not chunk:
                    continue
                total += len(chunk)
                if total > max_bytes:
                    raise ImageValidationError("The remote image is too large.")
                f.write(chunk)
    finally:
        close = getattr(response, "close", None)
        if callable(close):
            close()


def _copy_stored_source(source_key: str, dest_path: str) -> None:
    from core.storage import storage

    source = storage.open_file(source_key)
    try:
        with open(dest_path, "wb") as dest:
            shutil.copyfileobj(source, dest, length=64 * 1024)
    finally:
        close = getattr(source, "close", None)
        if callable(close):
            close()


@shared_task(bind=True)
def process_resize_job(self, job_id, preset_ids=None, custom_sizes=None):
    """Process a resize job: download source, resize to all requested sizes, upload results."""
    from .models import ResizeJob, ResizeOutput, ResizePreset

    preset_ids = preset_ids or []
    custom_sizes = custom_sizes or []

    try:
        job = ResizeJob.objects.get(id=job_id)
    except ResizeJob.DoesNotExist:
        logger.error("ResizeJob %s not found.", job_id)
        return

    try:
        job.status = ResizeJob.Status.PROCESSING
        job.error_message = ""
        job.save(update_fields=["status", "error_message"])

        temp_dir = tempfile.mkdtemp()
        source_path = os.path.join(temp_dir, f"source_{uuid.uuid4()}")

        try:
            if job.source_type == ResizeJob.SourceType.URL:
                _download_remote_image(job.source_url, source_path)
            else:
                _copy_stored_source(job.source_key, source_path)

            validate_image_path(source_path)

            with Image.open(source_path) as image:
                job.original_width, job.original_height = image.size
                job.original_format = (image.format or "UNKNOWN").upper()
            job.save(update_fields=["original_width", "original_height", "original_format"])

            ext = EXTENSION_BY_FORMAT.get(job.original_format, ".jpg")

            sizes = []
            if preset_ids:
                presets = ResizePreset.objects.filter(
                    Q(is_predefined=True) | Q(user=job.user),
                    id__in=preset_ids,
                    is_active=True,
                    width__gt=0,
                    height__gt=0,
                )
                presets_by_id = {str(preset.id): preset for preset in presets}
                for preset_id in dict.fromkeys(str(pid) for pid in preset_ids):
                    preset = presets_by_id.get(preset_id)
                    if preset:
                        sizes.append({
                            "label": preset.name,
                            "width": preset.width,
                            "height": preset.height,
                            "preset_id": preset.id,
                        })

            for custom_size in custom_sizes:
                sizes.append({
                    "label": custom_size.get("label") or f"{custom_size['width']}x{custom_size['height']}",
                    "width": int(custom_size["width"]),
                    "height": int(custom_size["height"]),
                    "preset_id": None,
                })

            max_outputs = getattr(settings, "MAX_OUTPUTS_PER_JOB", 50)
            sizes = sizes[:max_outputs]

            from core.storage import storage

            created = 0
            for index, size in enumerate(sizes, start=1):
                label_slug = sanitize_label(size["label"])
                output_filename = f"{index:02d}-{label_slug}{ext}"
                output_path = os.path.join(temp_dir, output_filename)

                try:
                    _process_with_pyvips(source_path, output_path, size["width"], size["height"])
                except Exception:
                    try:
                        _process_with_pillow(source_path, output_path, size["width"], size["height"])
                    except Exception as fallback_err:
                        logger.error("Both pyvips and Pillow failed for %s: %s", label_slug, fallback_err)
                        continue

                output_key = f"jobs/{job.id}/{output_filename}"
                with open(output_path, "rb") as output_file:
                    storage.upload_file(output_file, output_key)

                ResizeOutput.objects.create(
                    job=job,
                    preset_id=size["preset_id"],
                    label=size["label"][:255],
                    width=size["width"],
                    height=size["height"],
                    output_key=output_key,
                    output_url=storage.get_url(output_key),
                    file_size=os.path.getsize(output_path),
                )
                created += 1

            if created == 0:
                raise NoOutputsGenerated("No output sizes could be generated.")

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        job.status = ResizeJob.Status.DONE
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at"])

    except Exception as exc:
        logger.exception("Resize job %s failed.", job_id)
        job.status = ResizeJob.Status.FAILED
        job.error_message = classify_error(exc)[:2000]
        job.save(update_fields=["status", "error_message"])
