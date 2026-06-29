"""Image processing models for PixelForge."""
import uuid
from django.db import models
from django.conf import settings


class ResizePreset(models.Model):
    """Predefined resize dimensions grouped by category."""

    class Category(models.TextChoices):
        WALLPAPER = "WALLPAPER", "Wallpaper"
        THUMBNAIL = "THUMBNAIL", "Thumbnail"
        SOCIAL = "SOCIAL", "Social / Newsfeed"
        LOGO = "LOGO", "Logo"
        ICON = "ICON", "Icon"
        DOCUMENT = "DOCUMENT", "Document"
        CUSTOM = "CUSTOM", "Custom"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    category = models.CharField(max_length=20, choices=Category.choices, db_index=True)
    label = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_predefined = models.BooleanField(default=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_presets",
    )

    def __str__(self) -> str:
        return f"{self.name} ({self.width}x{self.height})"

    class Meta:
        ordering = ["category", "name"]
        verbose_name = "Resize Preset"
        verbose_name_plural = "Resize Presets"


class ResizeJob(models.Model):
    """A single image resize job containing one or more outputs."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        DONE = "DONE", "Done"
        FAILED = "FAILED", "Failed"

    class SourceType(models.TextChoices):
        UPLOAD = "UPLOAD", "Upload"
        URL = "URL", "URL"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resize_jobs"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    source_type = models.CharField(max_length=10, choices=SourceType.choices)
    source_url = models.URLField(blank=True, null=True)
    source_key = models.CharField(max_length=500, blank=True)
    original_filename = models.CharField(max_length=500, blank=True)
    original_size = models.PositiveIntegerField(default=0)
    original_width = models.PositiveIntegerField(null=True, blank=True)
    original_height = models.PositiveIntegerField(null=True, blank=True)
    original_format = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"{self.original_filename} ({self.status})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Resize Job"
        verbose_name_plural = "Resize Jobs"


class ResizeOutput(models.Model):
    """A single output file produced by a resize job."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(ResizeJob, on_delete=models.CASCADE, related_name="outputs")
    preset = models.ForeignKey(ResizePreset, on_delete=models.SET_NULL, null=True, blank=True)
    label = models.CharField(max_length=255)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    output_key = models.CharField(max_length=500)
    output_url = models.URLField(max_length=2000, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.label} ({self.width}x{self.height})"

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Resize Output"
        verbose_name_plural = "Resize Outputs"
