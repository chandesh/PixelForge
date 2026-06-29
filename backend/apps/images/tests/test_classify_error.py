"""Tests for classify_error function in tasks.py."""
import pytest
from apps.images.tasks import classify_error


_UnidentifiedImageError = type("UnidentifiedImageError", (Exception,), {})
_BotoCoreError = type("BotoCoreError", (Exception,), {})
_VipsError = type("VipsError", (Exception,), {})


class TestClassifyError:

    def test_connection_error(self):
        msg = classify_error(ConnectionError("Connection refused"))
        assert "download" in msg

    def test_timeout_in_message(self):
        msg = classify_error(RuntimeError("connection timeout"))
        assert "timed out" in msg

    def test_404_in_message(self):
        msg = classify_error(RuntimeError("404 Client Error"))
        assert "could not be found" in msg

    def test_not_found_in_message(self):
        msg = classify_error(RuntimeError("file not found"))
        assert "could not be found" in msg

    def test_forbidden_in_message(self):
        msg = classify_error(RuntimeError("403 Forbidden"))
        assert "Access" in msg and "denied" in msg

    def test_unauthorized_in_message(self):
        msg = classify_error(RuntimeError("unauthorized"))
        assert "Access" in msg and "denied" in msg

    def test_file_not_found(self):
        msg = classify_error(FileNotFoundError("No such file"))
        assert "uploading" in msg
        assert "source" in msg

    def test_unidentified_image_error(self):
        msg = classify_error(_UnidentifiedImageError("not an image"))
        assert "valid image" in msg

    def test_unsupported_format_in_message(self):
        msg = classify_error(RuntimeError("cannot identify image file"))
        assert "format is not supported" in msg

    def test_truncated_image_in_message(self):
        msg = classify_error(RuntimeError("truncated image"))
        assert "corrupted" in msg

    def test_decompression_bomb_in_message(self):
        msg = classify_error(RuntimeError("decompression bomb"))
        assert "dimensions" in msg

    def test_boto_core_error(self):
        msg = classify_error(_BotoCoreError("upload failed"))
        assert "saving" in msg

    def test_no_space_left_in_message(self):
        msg = classify_error(OSError("No space left on device"))
        assert "storage space" in msg

    def test_permission_denied_in_message(self):
        msg = classify_error(PermissionError("Permission denied"))
        assert "permission" in msg

    def test_memory_error(self):
        msg = classify_error(MemoryError("Out of memory"))
        assert "too large" in msg

    def test_os_error_with_memory(self):
        msg = classify_error(OSError("Cannot allocate memory"))
        assert "too large" in msg

    def test_vips_error(self):
        msg = classify_error(_VipsError("vips: some error"))
        assert "processing" in msg

    def test_io_error_type(self):
        exc = type("IOError", (Exception,), {})
        msg = classify_error(exc("Read failed"))
        assert "read the image file" in msg

    def test_invalid_dimensions(self):
        msg = classify_error(ValueError("invalid width specified"))
        assert "dimensions" in msg

    def test_generic_fallback(self):
        msg = classify_error(Exception("Something completely unexpected"))
        assert "unexpected error" in msg
