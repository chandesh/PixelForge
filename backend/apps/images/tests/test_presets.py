"""Tests for the presets endpoint."""
import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

PRESETS_URL = reverse("presets-list")


def test_list_presets_authenticated(authenticated_client, sample_preset):
    response = authenticated_client.get(PRESETS_URL)
    assert response.status_code == 200
    assert response.data["success"] is True
    data = response.data["data"]
    assert isinstance(data, dict)
    # sample_preset is SOCIAL category
    assert "SOCIAL" in data


def test_list_presets_unauthenticated(api_client):
    response = api_client.get(PRESETS_URL)
    assert response.status_code == 401


def test_preset_count_per_category(authenticated_client):
    from apps.images.models import ResizePreset
    ResizePreset.objects.create(name="W1", slug="w1", width=1920, height=1080, category="WALLPAPER")
    ResizePreset.objects.create(name="W2", slug="w2", width=3840, height=2160, category="WALLPAPER")
    ResizePreset.objects.create(name="W3", slug="w3", width=800, height=600, category="WALLPAPER")
    ResizePreset.objects.create(name="W4", slug="w4", width=400, height=300, category="WALLPAPER")
    ResizePreset.objects.create(name="W5", slug="w5", width=200, height=100, category="WALLPAPER")
    # Social
    ResizePreset.objects.create(name="S1", slug="s1", width=1080, height=1080, category="SOCIAL")
    # Document
    ResizePreset.objects.create(name="D1", slug="d1", width=595, height=842, category="DOCUMENT")
    ResizePreset.objects.create(name="D2", slug="d2", width=612, height=792, category="DOCUMENT")
    ResizePreset.objects.create(name="D3", slug="d3", width=32, height=32, category="DOCUMENT")
    ResizePreset.objects.create(name="D4", slug="d4", width=64, height=64, category="DOCUMENT")
    ResizePreset.objects.create(name="D5", slug="d5", width=180, height=180, category="DOCUMENT")
    ResizePreset.objects.create(name="D6", slug="d6", width=512, height=512, category="DOCUMENT")
    ResizePreset.objects.create(name="D7", slug="d7", width=1024, height=1024, category="DOCUMENT")
    ResizePreset.objects.create(name="D8", slug="d8", width=1240, height=1754, category="DOCUMENT")
    ResizePreset.objects.create(name="D9", slug="d9", width=2480, height=3508, category="DOCUMENT")
    # Thumbnail
    ResizePreset.objects.create(name="T1", slug="t1", width=1280, height=720, category="THUMBNAIL")
    ResizePreset.objects.create(name="T2", slug="t2", width=800, height=450, category="THUMBNAIL")
    ResizePreset.objects.create(name="T3", slug="t3", width=600, height=400, category="THUMBNAIL")
    ResizePreset.objects.create(name="T4", slug="t4", width=320, height=180, category="THUMBNAIL")
    ResizePreset.objects.create(name="T5", slug="t5", width=1280, height=720, category="THUMBNAIL")

    response = authenticated_client.get(PRESETS_URL)
    assert response.status_code == 200
    data = response.data["data"]
    assert len(data.get("WALLPAPER", [])) >= 5
    assert len(data.get("SOCIAL", [])) >= 1
    assert len(data.get("DOCUMENT", [])) >= 9
    assert len(data.get("THUMBNAIL", [])) >= 5


def test_inactive_preset_excluded(authenticated_client):
    from apps.images.models import ResizePreset
    active = ResizePreset.objects.create(name="Active", slug="active", width=100, height=100, category="SOCIAL", is_active=True)
    inactive = ResizePreset.objects.create(name="Inactive", slug="inactive", width=200, height=200, category="SOCIAL", is_active=False)

    response = authenticated_client.get(PRESETS_URL)
    data = response.data["data"]
    preset_names = [p["name"] for p in data.get("SOCIAL", [])]
    assert "Active" in preset_names
    assert "Inactive" not in preset_names
