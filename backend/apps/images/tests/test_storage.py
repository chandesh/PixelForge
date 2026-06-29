"""Tests for storage backends."""
import os
import io
import pytest
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.test.utils import override_settings
from core.storage.base import StorageBackend
from core.storage.local import LocalBackend
from core.storage.s3 import S3Backend
from core.storage.factory import StorageFactory


AWS_S3_OVERRIDES = {
    "AWS_ACCESS_KEY_ID": "test-key",
    "AWS_SECRET_ACCESS_KEY": "test-secret",
    "AWS_STORAGE_BUCKET_NAME": "test-bucket",
    "AWS_S3_REGION_NAME": "us-east-1",
    "AWS_S3_SIGNED_URL_EXPIRY": 3600,
}


class TestLocalBackend:
    def test_local_backend_upload(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
        monkeypatch.setattr(settings, "MEDIA_URL", "/media/")
        backend = LocalBackend()
        file_obj = io.BytesIO(b"test file content")
        key = "test_dir/test_file.txt"
        returned_key = backend.upload_file(file_obj, key)
        assert returned_key == key
        dest = tmp_path / key
        assert dest.exists()
        assert dest.read_text() == "test file content"

    def test_local_backend_get_url(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "MEDIA_URL", "/media/")
        monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
        backend = LocalBackend()
        url = backend.get_url("test_dir/test.png")
        assert url == "/media/test_dir/test.png"

    def test_local_backend_delete(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
        monkeypatch.setattr(settings, "MEDIA_URL", "/media/")
        backend = LocalBackend()
        file_obj = io.BytesIO(b"delete me")
        key = "to_delete.txt"
        backend.upload_file(file_obj, key)
        assert (tmp_path / key).exists()
        backend.delete_file(key)
        assert not (tmp_path / key).exists()


class TestS3Backend:
    @override_settings(**AWS_S3_OVERRIDES)
    def test_s3_backend_upload(self, mocker):
        mock_client = mocker.patch("boto3.client")
        client_instance = mock_client.return_value
        backend = S3Backend()
        file_obj = io.BytesIO(b"test")
        returned_key = backend.upload_file(file_obj, "test.png")
        assert returned_key == "test.png"
        client_instance.upload_fileobj.assert_called_once()

    @override_settings(**AWS_S3_OVERRIDES)
    def test_s3_backend_get_signed_url(self, mocker):
        mock_client = mocker.patch("boto3.client")
        client_instance = mock_client.return_value
        client_instance.generate_presigned_url.return_value = "https://signed-url.com/test.png"
        backend = S3Backend()
        url = backend.get_url("test.png")
        assert "signed-url.com" in url
        client_instance.generate_presigned_url.assert_called_once()


class TestStorageFactory:
    def test_storage_factory_local(self, monkeypatch):
        StorageFactory._instance = None
        monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")
        backend = StorageFactory.get_backend()
        assert isinstance(backend, LocalBackend)

    @override_settings(**AWS_S3_OVERRIDES)
    def test_storage_factory_s3(self, monkeypatch, mocker):
        StorageFactory._instance = None
        monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
        mocker.patch("boto3.client")
        backend = StorageFactory.get_backend()
        assert isinstance(backend, S3Backend)

    def test_storage_factory_invalid(self, monkeypatch):
        StorageFactory._instance = None
        monkeypatch.setattr(settings, "STORAGE_BACKEND", "invalid")
        with pytest.raises(ImproperlyConfigured):
            StorageFactory.get_backend()
