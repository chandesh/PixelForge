"""Image serializers for PixelForge."""
import math
from rest_framework import serializers
from .models import ResizePreset, ResizeJob, ResizeOutput


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
        if value < 1:
            raise serializers.ValidationError("Width must be positive.")
        return value

    def validate_height(self, value):
        if value < 1:
            raise serializers.ValidationError("Height must be positive.")
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
        return obj.outputs.count()

    def get_thumbnail_url(self, obj):
        if obj.status != ResizeJob.Status.DONE:
            return None
        first = obj.outputs.exclude(output_url__exact="").filter(output_url__isnull=False).order_by("created_at").first()
        if first:
            return first.output_url
        if obj.source_type == "URL":
            return obj.source_url
        return None

    def get_preset_summary(self, obj):
        return list(obj.outputs.values_list("label", flat=True).distinct())

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
        return obj.outputs.count()

    def get_preset_summary(self, obj):
        return list(obj.outputs.values_list("label", flat=True).distinct())

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

    def validate_preset_ids(self, value):
        if isinstance(value, str):
            import json as json_lib
            try:
                value = json_lib.loads(value)
            except (json_lib.JSONDecodeError, TypeError):
                raise serializers.ValidationError("Invalid preset_ids JSON.")
        if not isinstance(value, list):
            raise serializers.ValidationError("preset_ids must be a list.")
        return value

    def validate_custom_sizes(self, value):
        if isinstance(value, str):
            import json as json_lib
            try:
                value = json_lib.loads(value)
            except (json_lib.JSONDecodeError, TypeError):
                raise serializers.ValidationError("Invalid custom_sizes JSON.")
        if not isinstance(value, list):
            raise serializers.ValidationError("custom_sizes must be a list.")
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each custom size must be an object.")
            if "width" not in item or "height" not in item:
                raise serializers.ValidationError("Each custom size must have width and height.")
            if item.get("width", 0) < 1 or item.get("height", 0) < 1:
                raise serializers.ValidationError("Width and height must be positive.")
        return value
