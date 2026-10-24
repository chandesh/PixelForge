"""Tests for Celery image processing tasks."""
import json
import pytest
import os
import tempfile
from io import BytesIO

from PIL import Image
from django.urls import reverse
from apps.images.models import ResizeJob, ResizeOutput

pytestmark = pytest.mark.django_db


def _png_bytes(width=2, height=2):
    buffer = BytesIO()
    Image.new("RGB", (width, height), (255, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def _dummy_process(source_path, dest_path, width, height):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, "w") as f:
        f.write("dummy")


def _create_upload_job(authenticated_client, sample_preset):
    """Helper to create a minimal upload-based job."""
    image_bytes = _png_bytes()
    from django.core.files.uploadedfile import SimpleUploadedFile
    img = SimpleUploadedFile("test.png", image_bytes, content_type="image/png")
    return authenticated_client.post(
        reverse("jobs-handler"),
        {"source_type": "UPLOAD", "file": img, "preset_ids": json.dumps([str(sample_preset.id)])},
        format="multipart",
    )


def test_process_resize_job_sets_done_status(authenticated_client, sample_preset, mocker):
    mocker.patch("apps.images.tasks._process_with_pyvips", side_effect=_dummy_process)
    mocker.patch("apps.images.tasks._process_with_pillow", side_effect=_dummy_process)

    resp = _create_upload_job(authenticated_client, sample_preset)
    job_id = resp.data["data"]["id"]
    job = ResizeJob.objects.get(id=job_id)
    assert job.status == "DONE"


def test_process_resize_job_creates_outputs(authenticated_client, sample_preset, mocker):
    mocker.patch("apps.images.tasks._process_with_pyvips", side_effect=_dummy_process)
    mocker.patch("apps.images.tasks._process_with_pillow", side_effect=_dummy_process)

    resp = _create_upload_job(authenticated_client, sample_preset)
    job_id = resp.data["data"]["id"]
    outputs = ResizeOutput.objects.filter(job_id=job_id)
    assert outputs.count() >= 1


def test_process_resize_job_handles_pyvips_failure(authenticated_client, sample_preset, mocker):
    mocker.patch("apps.images.tasks._process_with_pyvips", side_effect=Exception("pyvips failed"))
    mocker.patch("apps.images.tasks._process_with_pillow", side_effect=_dummy_process)

    resp = _create_upload_job(authenticated_client, sample_preset)
    job_id = resp.data["data"]["id"]
    job = ResizeJob.objects.get(id=job_id)
    assert job.status == "DONE"


def test_process_resize_job_handles_total_failure(authenticated_client, sample_preset, mocker):
    mocker.patch("apps.images.tasks._process_with_pyvips", side_effect=Exception("pyvips failed"))
    mocker.patch("apps.images.tasks._process_with_pillow", side_effect=Exception("Pillow failed"))

    resp = _create_upload_job(authenticated_client, sample_preset)
    job_id = resp.data["data"]["id"]
    job = ResizeJob.objects.get(id=job_id)
    assert job.status == "FAILED"


def test_process_resize_job_url_source(authenticated_client, sample_preset, mocker):
    image_bytes = _png_bytes()
    mock_resp = mocker.Mock()
    mock_resp.status_code = 200
    mock_resp.iter_content.return_value = [image_bytes]
    mock_resp.raise_for_status = mocker.Mock()
    mocker.patch("requests.get", return_value=mock_resp)
    mocker.patch("apps.images.tasks._process_with_pyvips", side_effect=_dummy_process)
    mocker.patch("apps.images.tasks._process_with_pillow", side_effect=_dummy_process)

    response = authenticated_client.post(
        reverse("jobs-handler"),
        {"source_type": "URL", "source_url": "https://example.com/image.jpg", "preset_ids": [str(sample_preset.id)]},
        format="json",
    )
    job_id = response.data["data"]["id"]
    job = ResizeJob.objects.get(id=job_id)
    assert job.status == "DONE"


def test_process_resize_job_fails_with_classified_error(authenticated_client, sample_preset, mocker):
    mock_resp = mocker.Mock()
    mock_resp.raise_for_status.side_effect = ConnectionError("Connection refused by example.com")
    mocker.patch("requests.get", return_value=mock_resp)

    response = authenticated_client.post(
        reverse("jobs-handler"),
        {"source_type": "URL", "source_url": "https://example.com/image.jpg", "preset_ids": [str(sample_preset.id)]},
        format="json",
    )
    job_id = response.data["data"]["id"]
    job = ResizeJob.objects.get(id=job_id)
    assert job.status == "FAILED"
    assert job.error_message is not None
    assert "download" in job.error_message.lower()
    assert "example.com" not in job.error_message
    assert "ConnectionError" not in job.error_message


def test_process_resize_job_custom_sizes(authenticated_client, mocker):
    mocker.patch("apps.images.tasks._process_with_pyvips", side_effect=_dummy_process)
    mocker.patch("apps.images.tasks._process_with_pillow", side_effect=_dummy_process)

    image_bytes = _png_bytes()
    from django.core.files.uploadedfile import SimpleUploadedFile
    img = SimpleUploadedFile("test.png", image_bytes, content_type="image/png")

    response = authenticated_client.post(
        reverse("jobs-handler"),
        {
            "source_type": "UPLOAD",
            "file": img,
            "custom_sizes": json.dumps([{"label": "Custom", "width": 300, "height": 200}]),
        },
        format="multipart",
    )
    job_id = response.data["data"]["id"]
    job = ResizeJob.objects.get(id=job_id)
    assert job.status == "DONE"
    outputs = ResizeOutput.objects.filter(job_id=job_id)
    assert outputs.count() >= 1
