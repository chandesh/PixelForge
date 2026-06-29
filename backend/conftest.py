import uuid

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.images.models import ResizePreset, ResizeJob, ResizeOutput


class UserFactory:

    @staticmethod
    def create(**kwargs):
        data = {
            "email": f"user_{uuid.uuid4().hex[:8]}@example.com",
            "name": "Test User",
            "password": "testpass123",
        }
        data.update(kwargs)
        password = data.pop("password")
        user = User.objects.create_user(password=password, **data)
        return user


class ResizePresetFactory:

    @staticmethod
    def create(**kwargs):
        data = {
            "name": "Test Preset",
            "slug": f"test-preset-{uuid.uuid4().hex[:8]}",
            "width": 800,
            "height": 600,
            "category": ResizePreset.Category.SOCIAL,
            "description": "A test preset.",
            "is_active": True,
        }
        data.update(kwargs)
        return ResizePreset.objects.create(**data)


class ResizeJobFactory:

    @staticmethod
    def create(user=None, **kwargs):
        if user is None:
            user = UserFactory.create()
        data = {
            "user": user,
            "source_type": ResizeJob.SourceType.UPLOAD,
            "source_key": "uploads/test.png",
            "original_filename": "test.png",
            "original_size": 1024,
            "original_width": 1920,
            "original_height": 1080,
            "original_format": "PNG",
            "status": ResizeJob.Status.PENDING,
        }
        data.update(kwargs)
        return ResizeJob.objects.create(**data)


class ResizeOutputFactory:

    @staticmethod
    def create(job=None, preset=None, **kwargs):
        if job is None:
            job = ResizeJobFactory.create()
        data = {
            "job": job,
            "preset": preset,
            "label": "test-output",
            "width": 800,
            "height": 600,
            "output_key": f"jobs/{job.id}/test-output.jpg",
            "output_url": f"/media/jobs/{job.id}/test-output.jpg",
            "file_size": 2048,
        }
        data.update(kwargs)
        return ResizeOutput.objects.create(**data)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user():
    return UserFactory.create()


@pytest.fixture
def admin_user():
    return UserFactory.create(is_superuser=True, is_staff=True)


@pytest.fixture
def authenticated_client(test_user):
    client = APIClient()
    refresh = RefreshToken.for_user(test_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def another_user():
    return UserFactory.create()


@pytest.fixture
def sample_preset():
    return ResizePresetFactory.create()


@pytest.fixture
def sample_job(test_user):
    job = ResizeJobFactory.create(
        user=test_user,
        status=ResizeJob.Status.DONE,
    )
    ResizeOutputFactory.create(job=job, label="output-1", width=800, height=600)
    ResizeOutputFactory.create(job=job, label="output-2", width=400, height=300)
    return job


@pytest.fixture
def sample_job_pending(test_user):
    return ResizeJobFactory.create(
        user=test_user,
        status=ResizeJob.Status.PENDING,
    )


@pytest.fixture(autouse=True)
def storage_tmp_path(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")
    from core.storage.factory import StorageFactory
    StorageFactory._instance = None
    import importlib
    import core.storage
    importlib.reload(core.storage)
    fresh_storage = core.storage.storage
    import apps.images.views as images_views
    images_views.storage = fresh_storage
    yield


@pytest.fixture(autouse=True)
def celery_eager(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    from core.celery import app as celery_app
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True


@pytest.fixture
def uploaded_image():
    minimal_png = (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde"
        b"\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return SimpleUploadedFile("test.png", minimal_png, content_type="image/png")
