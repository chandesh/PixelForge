"""Tests for the register endpoint."""
import pytest
from django.urls import reverse
from apps.users.models import User

pytestmark = pytest.mark.django_db

REGISTER_URL = reverse("auth-register")


def test_register_success(api_client):
    payload = {"name": "Alice", "email": "alice@example.com", "password": "securepass123", "confirm_password": "securepass123"}
    response = api_client.post(REGISTER_URL, payload, format="json")
    assert response.status_code == 201
    assert response.data["success"] is True
    assert response.data["data"]["user"]["email"] == "alice@example.com"
    assert "access" in response.data["data"]
    assert "refresh" in response.data["data"]
    assert User.objects.filter(email="alice@example.com").exists()


def test_register_duplicate_email(api_client, test_user):
    payload = {"name": "Alice", "email": test_user.email, "password": "securepass123", "confirm_password": "securepass123"}
    response = api_client.post(REGISTER_URL, payload, format="json")
    assert response.status_code == 400


def test_register_password_mismatch(api_client):
    payload = {"name": "Alice", "email": "alice@example.com", "password": "securepass123", "confirm_password": "differentpass"}
    response = api_client.post(REGISTER_URL, payload, format="json")
    assert response.status_code == 400


def test_register_missing_fields(api_client):
    response = api_client.post(REGISTER_URL, {}, format="json")
    assert response.status_code == 400


def test_register_invalid_email_format(api_client):
    payload = {"name": "Alice", "email": "not-an-email", "password": "securepass123", "confirm_password": "securepass123"}
    response = api_client.post(REGISTER_URL, payload, format="json")
    assert response.status_code == 400
