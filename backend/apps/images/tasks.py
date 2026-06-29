"""Celery tasks for image processing.

Primary: pyvips (libvips C bindings for speed).
Fallback: Pillow (pure Python, slower but reliable).
"""
import os
import tempfile
import uuid
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def classify_error(exception: Exception) -> str:
    exception_type = type(exception).__name__
    exception_msg = str(exception).lower()

    logger.error(
        "ResizeJob processing failed",
        exc_info=True,
        extra={"exception_type": exception_type},
    )

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
    """Resize using pyvips (libvips). Raises exception on failure."""
    import pyvips
    image = pyvips.Image.new_from_file(source_path)
    resized = image.thumbnail_image(width, height=height)
    ext = os.path.splitext(dest_path)[1].lstrip(".").upper()
    if ext == "JPG":
        ext = "JPEG"
    resized.write_to_file(dest_path, Q=90)


def _process_with_pillow(source_path, dest_path, width, height):
    """Resize using Pillow as fallback."""
    from PIL import Image
    with Image.open(source_path) as img:
        img = img.convert("RGB") if img.mode in ("RGBA", "P") else img
        img.thumbnail((width, height), Image.LANCZOS)
        # Create canvas of exact size and paste
        result = Image.new(img.mode, (width, height), (255, 255, 255))
        offset_x = (width - img.width) // 2
        offset_y = (height - img.height) // 2
        result.paste(img, (offset_x, offset_y))
        result.save(dest_path, quality=90)


@shared_task(bind=True, max_retries=1)
def process_resize_job(self, job_id, preset_ids=None, custom_sizes=None):
    """Process a resize job: download source, resize to all requested sizes, upload results."""
    from django.apps import apps
    from .models import ResizeJob, ResizeOutput, ResizePreset
    from core.storage import storage

    if preset_ids is None:
        preset_ids = []
    if custom_sizes is None:
        custom_sizes = []

    try:
        job = ResizeJob.objects.get(id=job_id)
    except ResizeJob.DoesNotExist:
        logger.error("ResizeJob %s not found.", job_id)
        return

    try:
        job.status = ResizeJob.Status.PROCESSING
        job.save(update_fields=["status"])

        source_path = None
        temp_dir = None

        try:
            # Download or fetch source
            if job.source_type == "URL":
                import requests
                temp_dir = tempfile.mkdtemp()
                source_path = os.path.join(temp_dir, f"source_{uuid.uuid4()}")
                resp = requests.get(job.source_url, stream=True, timeout=120)
                resp.raise_for_status()
                with open(source_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=65536):
                        if chunk:
                            f.write(chunk)
            else:
                # Fetch from storage backend
                temp_dir = tempfile.mkdtemp()
                source_path = os.path.join(temp_dir, f"source_{uuid.uuid4()}")
                # TODO: Stream download from storage backend
                # For now assume the file is accessible locally
                local_path = os.path.join(settings.MEDIA_ROOT, job.source_key)
                if os.path.exists(local_path):
                    import shutil
                    shutil.copy2(local_path, source_path)
                else:
                    raise FileNotFoundError(f"Source file not found: {local_path}")

            # Validate and read original image properties
            try:
                import pyvips
                img = pyvips.Image.new_from_file(source_path)
                job.original_width = img.width
                job.original_height = img.height
                job.original_format = img.get("vips-loader").upper()
            except Exception:
                from PIL import Image
                with Image.open(source_path) as img:
                    job.original_width, job.original_height = img.size
                    job.original_format = img.format or "UNKNOWN"
            job.save(update_fields=["original_width", "original_height", "original_format"])

            ext = os.path.splitext(job.original_filename)[1] or ".jpg"

            # Build size list from presets + custom sizes
            sizes = []
            if preset_ids:
                presets = ResizePreset.objects.filter(id__in=preset_ids, is_active=True)
                for preset in presets:
                    sizes.append({
                        "label": preset.name,
                        "width": preset.width,
                        "height": preset.height,
                        "preset_id": preset.id,
                    })
            for cs in custom_sizes:
                sizes.append({
                    "label": cs.get("label", f"{cs['width']}x{cs['height']}"),
                    "width": cs["width"],
                    "height": cs["height"],
                    "preset_id": None,
                })

            # Resize and upload each output
            for size in sizes:
                label_slug = size["label"].lower().replace(" ", "-").replace("/", "-")
                output_filename = f"{label_slug}{ext}"
                output_path = os.path.join(temp_dir, output_filename)

                try:
                    _process_with_pyvips(source_path, output_path, size["width"], size["height"])
                except Exception:
                    try:
                        _process_with_pillow(source_path, output_path, size["width"], size["height"])
                    except Exception as fallback_err:
                        logger.error("Both pyvips and Pillow failed for %s: %s", label_slug, fallback_err)
                        continue

                output_key = f"jobs/{job_id}/{output_filename}"
                with open(output_path, "rb") as f:
                    from io import BytesIO
                    bio = BytesIO(f.read())
                    storage.upload_file(bio, output_key)

                file_size = os.path.getsize(output_path)
                output_url = storage.get_url(output_key)

                ResizeOutput.objects.create(
                    job=job,
                    preset_id=size["preset_id"],
                    label=size["label"],
                    width=size["width"],
                    height=size["height"],
                    output_key=output_key,
                    output_url=output_url,
                    file_size=file_size,
                )

        finally:
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)

        job.status = ResizeJob.Status.DONE
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at"])

    except Exception as exc:
        logger.exception("Resize job %s failed.", job_id)
        job.status = ResizeJob.Status.FAILED
        job.error_message = classify_error(exc)[:2000]
        job.save(update_fields=["status", "error_message"])
