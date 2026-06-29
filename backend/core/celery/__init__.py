"""Celery application for PixelForge."""
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.config.dev")

app = Celery("pixelforge")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
