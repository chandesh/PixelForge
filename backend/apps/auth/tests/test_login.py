"""Tests for the login endpoint."""
import pytest
from django.urls import reverse
from apps.users.models import User

pytestmark = pytest.mark.django_db

LOGIN_URL = reverse("auth-login")


def _create_user():
    return User.objects.create_user(email="alice@example.com", name="Alice", password="securepass123")


def test_login_success(api_client):
    _create_user()
    response = api_client.post(LOGIN_URL, {"email": "alice@example.com", "password": "securepass123"}, format="json")
    assert response.status_code == 200
    assert response.data["success"] is True
    assert "access" in response.data["data"]
    assert "refresh" in response.data["data"]
    assert response.data["data"]["user"]["email"] == "alice@example.com"


def test_login_wrong_password(api_client):
    _create_user()
    response = api_client.post(LOGIN_URL, {"email": "alice@example.com", "password": "wrongpass"}, format="json")
    assert response.status_code == 401
    assert response.data["success"] is False


def test_login_nonexistent_user(api_client):
    response = api_client.post(LOGIN_URL, {"email": "nobody@example.com", "password": "securepass123"}, format="json")
    assert response.status_code == 401
    assert response.data["success"] is False


def test_login_missing_fields(api_client):
    response = api_client.post(LOGIN_URL, {}, format="json")
    assert response.status_code == 400


def test_login_returns_consistent_envelope(api_client):
    _create_user()
    response = api_client.post(LOGIN_URL, {"email": "alice@example.com", "password": "securepass123"}, format="json")
    assert "success" in response.data
    assert "data" in response.data
    assert "message" in response.data
