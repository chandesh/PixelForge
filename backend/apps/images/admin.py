from django.contrib import admin
from .models import ResizePreset, ResizeJob, ResizeOutput


@admin.register(ResizePreset)
class ResizePresetAdmin(admin.ModelAdmin):
    list_display = ("name", "width", "height", "category", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(ResizeJob)
class ResizeJobAdmin(admin.ModelAdmin):
    list_display = ("original_filename", "user", "status", "source_type", "created_at")
    list_filter = ("status", "source_type")
    search_fields = ("original_filename", "user__email")


@admin.register(ResizeOutput)
class ResizeOutputAdmin(admin.ModelAdmin):
    list_display = ("label", "job", "width", "height", "file_size")
