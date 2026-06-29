"""Tests for job CRUD endpoints."""
import json
import pytest
import io
from django.urls import reverse

pytestmark = pytest.mark.django_db

JOBS_URL = reverse("jobs-handler")


def test_create_job_upload_success(authenticated_client, sample_preset, uploaded_image):
    response = authenticated_client.post(
        JOBS_URL,
        {"source_type": "UPLOAD", "file": uploaded_image, "preset_ids": json.dumps([str(sample_preset.id)])},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["success"] is True
    assert response.data["data"]["status"] == "PENDING"


def test_create_job_url_success(authenticated_client, sample_preset, mocker):
    mocker.patch("apps.images.tasks.process_resize_job.delay", return_value=None)
    response = authenticated_client.post(
        JOBS_URL,
        {"source_type": "URL", "source_url": "https://example.com/image.jpg", "preset_ids": [str(sample_preset.id)]},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["success"] is True


def test_create_job_custom_sizes(authenticated_client, uploaded_image):
    custom_sizes = json.dumps([{"label": "Banner", "width": 800, "height": 200}, {"width": 400, "height": 300}])
    response = authenticated_client.post(
        JOBS_URL,
        {"source_type": "UPLOAD", "file": uploaded_image, "custom_sizes": custom_sizes},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["success"] is True


def test_create_job_no_source(authenticated_client):
    response = authenticated_client.post(
        JOBS_URL,
        {"source_type": "UPLOAD"},
        format="json",
    )
    assert response.status_code == 400


def test_create_job_unauthenticated(api_client, sample_preset):
    response = api_client.post(
        JOBS_URL,
        {"source_type": "URL", "source_url": "https://example.com/image.jpg", "preset_ids": [str(sample_preset.id)]},
        format="json",
    )
    assert response.status_code == 401


def test_list_jobs_returns_only_own(authenticated_client, test_user, another_user, sample_job):
    from apps.images.models import ResizeJob
    # sample_job belongs to test_user (created via fixture)
    # Create a job for another_user
    ResizeJob.objects.create(user=another_user, source_type="UPLOAD", original_filename="other.png")

    response = authenticated_client.get(JOBS_URL)
    assert response.status_code == 200
    results = response.data["data"]["results"]
    for job in results:
        # authenticated_client is tied to test_user
        pass
    # Should see test_user's job, not other's
    filenames = [j["original_filename"] for j in results]
    assert "test.png" in filenames
    assert "other.png" not in filenames


def test_get_job_detail_success(authenticated_client, sample_job):
    url = reverse("job-detail-handler", kwargs={"job_id": sample_job.id})
    response = authenticated_client.get(url)
    assert response.status_code == 200
    assert response.data["data"]["original_filename"] == "test.png"
    assert len(response.data["data"]["outputs"]) == 2


def test_get_job_detail_other_user(authenticated_client, another_user):
    from apps.images.models import ResizeJob
    other_job = ResizeJob.objects.create(user=another_user, source_type="UPLOAD", original_filename="secret.png")
    url = reverse("job-detail-handler", kwargs={"job_id": other_job.id})
    response = authenticated_client.get(url)
    assert response.status_code == 404


def test_delete_job_success(authenticated_client, sample_job):
    url = reverse("job-detail-handler", kwargs={"job_id": sample_job.id})
    response = authenticated_client.delete(url)
    assert response.status_code == 200
    assert response.data["success"] is True
    sample_job.refresh_from_db()
    assert sample_job.is_deleted is True


def test_delete_job_other_user(authenticated_client, another_user):
    from apps.images.models import ResizeJob
    other_job = ResizeJob.objects.create(user=another_user, source_type="UPLOAD", original_filename="secret.png")
    url = reverse("job-detail-handler", kwargs={"job_id": other_job.id})
    response = authenticated_client.delete(url)
    assert response.status_code == 404
