"""Tests for serializers — thumbnail_url and error_message behavior."""
import pytest
from apps.images.models import ResizeJob
from apps.images.serializers import ResizeJobListSerializer
from conftest import ResizeJobFactory, ResizeOutputFactory

pytestmark = pytest.mark.django_db


def test_thumbnail_url_returns_none_for_pending():
    job = ResizeJobFactory.create(status=ResizeJob.Status.PENDING)
    ResizeOutputFactory.create(job=job, output_url="/media/test.jpg")
    serializer = ResizeJobListSerializer(job)
    assert serializer.data["thumbnail_url"] is None


def test_thumbnail_url_returns_first_output_url_for_done():
    job = ResizeJobFactory.create(status=ResizeJob.Status.DONE)
    ResizeOutputFactory.create(job=job, output_url="/media/first.jpg", label="first")
    ResizeOutputFactory.create(job=job, output_url="/media/second.jpg", label="second")
    serializer = ResizeJobListSerializer(job)
    assert serializer.data["thumbnail_url"] == "/media/first.jpg"


def test_thumbnail_url_skips_null_output_url():
    job = ResizeJobFactory.create(status=ResizeJob.Status.DONE)
    ResizeOutputFactory.create(job=job, output_url="", label="empty")
    ResizeOutputFactory.create(job=job, output_url="/media/valid.jpg", label="valid")
    serializer = ResizeJobListSerializer(job)
    assert serializer.data["thumbnail_url"] == "/media/valid.jpg"


def test_thumbnail_url_fallback_to_source_url():
    job = ResizeJobFactory.create(
        status=ResizeJob.Status.DONE,
        source_type=ResizeJob.SourceType.URL,
        source_url="https://example.com/img.jpg",
    )
    serializer = ResizeJobListSerializer(job)
    assert serializer.data["thumbnail_url"] == "https://example.com/img.jpg"


def test_thumbnail_url_returns_none_when_no_outputs_no_source():
    job = ResizeJobFactory.create(
        status=ResizeJob.Status.DONE,
        source_type=ResizeJob.SourceType.UPLOAD,
    )
    serializer = ResizeJobListSerializer(job)
    assert serializer.data["thumbnail_url"] is None


def test_error_message_in_list_serializer():
    job = ResizeJobFactory.create(
        status=ResizeJob.Status.FAILED,
        error_message="A user-friendly error message",
    )
    serializer = ResizeJobListSerializer(job)
    assert "error_message" in serializer.data
    assert serializer.data["error_message"] == "A user-friendly error message"


def test_failed_job_thumbnail_is_none():
    job = ResizeJobFactory.create(status=ResizeJob.Status.FAILED)
    ResizeOutputFactory.create(job=job, output_url="/media/test.jpg")
    serializer = ResizeJobListSerializer(job)
    assert serializer.data["thumbnail_url"] is None
