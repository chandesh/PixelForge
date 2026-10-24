"""Image serializers for PixelForge."""
import math
import uuid

from django.conf import settings
from django.db.models import Q
from rest_framework import serializers

from .models import ResizePreset, ResizeJob, ResizeOutput
from .validators import ImageValidationError, validate_image_file, validate_remote_image_url


def _format_file_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"


def _compute_aspect_ratio(width, height):
    if not width or not height:
        return "—"
    g = math.gcd(width, height)
    return f"{width // g}:{height // g}"


def _outputs(obj):
    return list(obj.outputs.all())


class ResizePresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResizePreset
        fields = ("id", "name", "slug", "width", "height", "category", "label", "description", "is_predefined")


class CustomPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResizePreset
        fields = ("id", "name", "width", "height", "label")
        read_only_fields = ("id",)

    def validate_width(self, value):
        if value < 1 or value > getattr(settings, "MAX_IMAGE_DIMENSION", 10000):
            raise serializers.ValidationError("Width must be between 1 and 10,000 pixels.")
        return value

    def validate_height(self, value):
        if value < 1 or value > getattr(settings, "MAX_IMAGE_DIMENSION", 10000):
            raise serializers.ValidationError("Height must be between 1 and 10,000 pixels.")
        return value


class ResizeOutputSerializer(serializers.ModelSerializer):
    preset_name = serializers.SerializerMethodField()
    preset_category = serializers.SerializerMethodField()
    aspect_ratio = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()

    class Meta:
        model = ResizeOutput
        fields = (
            "id", "label", "width", "height", "file_size", "file_size_display",
            "output_url", "preset_name", "preset_category", "aspect_ratio",
            "created_at",
        )

    def get_preset_name(self, obj):
        return obj.preset.name if obj.preset else None

    def get_preset_category(self, obj):
        return obj.preset.category if obj.preset else None

    def get_aspect_ratio(self, obj):
        return _compute_aspect_ratio(obj.width, obj.height)

    def get_file_size_display(self, obj):
        return _format_file_size(obj.file_size)


class ResizeJobListSerializer(serializers.ModelSerializer):
    output_count = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    preset_summary = serializers.SerializerMethodField()
    original_size_display = serializers.SerializerMethodField()

    class Meta:
        model = ResizeJob
        fields = (
            "id", "status", "source_type", "original_filename",
            "original_width", "original_height", "original_size",
            "original_size_display", "original_format",
            "created_at", "completed_at", "output_count",
            "thumbnail_url", "preset_summary", "error_message",
        )

    def get_output_count(self, obj):
        return len(_outputs(obj))

    def get_thumbnail_url(self, obj):
        if obj.status != ResizeJob.Status.DONE:
            return None
        first = next((output for output in _outputs(obj) if output.output_url), None)
        if first:
            return first.output_url
        if obj.source_type == "URL":
            return obj.source_url
        return None

    def get_preset_summary(self, obj):
        return list(dict.fromkeys(output.label for output in _outputs(obj)))

    def get_original_size_display(self, obj):
        return _format_file_size(obj.original_size) if obj.original_size else "—"


class ResizeJobDetailSerializer(serializers.ModelSerializer):
    outputs = ResizeOutputSerializer(many=True, read_only=True)
    output_count = serializers.SerializerMethodField()
    preset_summary = serializers.SerializerMethodField()
    original_size_display = serializers.SerializerMethodField()
    original_dimensions_display = serializers.SerializerMethodField()
    processing_duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = ResizeJob
        fields = (
            "id", "status", "source_type", "source_url",
            "original_filename", "original_size", "original_size_display",
            "original_width", "original_height", "original_dimensions_display",
            "original_format", "created_at", "updated_at",
            "completed_at", "error_message", "outputs",
            "output_count", "preset_summary", "processing_duration_seconds",
        )

    def get_output_count(self, obj):
        return len(_outputs(obj))

    def get_preset_summary(self, obj):
        return list(dict.fromkeys(output.label for output in _outputs(obj)))

    def get_original_size_display(self, obj):
        return _format_file_size(obj.original_size) if obj.original_size else "—"

    def get_original_dimensions_display(self, obj):
        if obj.original_width and obj.original_height:
            return f"{obj.original_width} × {obj.original_height}"
        return "—"

    def get_processing_duration_seconds(self, obj):
        if obj.created_at and obj.completed_at:
            delta = obj.completed_at - obj.created_at
            return round(delta.total_seconds(), 1)
        return None


class CreateJobSerializer(serializers.Serializer):
    source_type = serializers.ChoiceField(choices=["UPLOAD", "URL"])
    source_url = serializers.URLField(required=False, allow_blank=True)
    file = serializers.FileField(required=False)
    preset_ids = serializers.JSONField(required=False, default=list)
    custom_sizes = serializers.JSONField(required=False, default=list)

    def validate_file(self, value):
        try:
            validate_image_file(value)
        except ImageValidationError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value

    def validate_source_url(self, value):
        if not value:
            return value
        try:
            validate_remote_image_url(value, resolve=False)
        except ImageValidationError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value

    def validate_preset_ids(self, value):
        value = self._parse_json_list(value, "preset_ids")
        normalized = []
        for preset_id in value:
            try:
                normalized.append(str(uuid.UUID(str(preset_id))))
            except (TypeError, ValueError, AttributeError) as exc:
                raise serializers.ValidationError("Each preset id must be a valid UUID.") from exc
        return list(dict.fromkeys(normalized))

    def validate_custom_sizes(self, value):
        value = self._parse_json_list(value, "custom_sizes")
        max_dimension = getattr(settings, "MAX_IMAGE_DIMENSION", 10000)
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each custom size must be an object.")
            try:
                width = int(item["width"])
                height = int(item["height"])
            except (KeyError, TypeError, ValueError) as exc:
                raise serializers.ValidationError("Each custom size must have integer width and height.") from exc
            if not 1 <= width <= max_dimension or not 1 <= height <= max_dimension:
                raise serializers.ValidationError(
                    f"Custom dimensions must be between 1 and {max_dimension} pixels."
                )
            label = str(item.get("label") or f"{width}x{height}").strip()[:255]
            cleaned.append({"label": label, "width": width, "height": height})
        return cleaned

    def validate(self, attrs):
        source_type = attrs["source_type"]
        if source_type == "UPLOAD" and not attrs.get("file"):
            raise serializers.ValidationError({"file": "File is required for upload source type."})
        if source_type == "URL" and not attrs.get("source_url"):
            raise serializers.ValidationError({"source_url": "URL is required for URL source type."})

        preset_ids = attrs.get("preset_ids") or []
        custom_sizes = attrs.get("custom_sizes") or []
        max_outputs = getattr(settings, "MAX_OUTPUTS_PER_JOB", 50)
        if not preset_ids and not custom_sizes:
            raise serializers.ValidationError("Select at least one preset or custom size.")
        if len(preset_ids) + len(custom_sizes) > max_outputs:
            raise serializers.ValidationError(
                f"A job can generate at most {max_outputs} outputs."
            )

        if preset_ids:
            request = self.context.get("request")
            user = getattr(request, "user", None)
            allowed = ResizePreset.objects.filter(
                Q(is_predefined=True) | Q(user=user),
                id__in=preset_ids,
                is_active=True,
                width__gt=0,
                height__gt=0,
            )
            allowed_ids = {str(preset_id) for preset_id in allowed.values_list("id", flat=True)}
            missing = [preset_id for preset_id in preset_ids if preset_id not in allowed_ids]
            if missing:
                raise serializers.ValidationError(
                    {"preset_ids": "One or more presets are invalid or unavailable."}
                )

        return attrs

    @staticmethod
    def _parse_json_list(value, field_name):
        if isinstance(value, str):
            import json as json_lib
            try:
                value = json_lib.loads(value)
            except (json_lib.JSONDecodeError, TypeError) as exc:
                raise serializers.ValidationError(f"Invalid {field_name} JSON.") from exc
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} must be a list.")
        return value
