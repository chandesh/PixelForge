"""Tests for token refresh and logout endpoints."""
import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from freezegun import freeze_time

pytestmark = pytest.mark.django_db

REFRESH_URL = reverse("auth-refresh")
LOGOUT_URL = reverse("auth-logout")


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def test_refresh_success(api_client, test_user):
    tokens = _get_tokens(test_user)
    response = api_client.post(REFRESH_URL, {"refresh": tokens["refresh"]}, format="json")
    assert response.status_code == 200
    assert "access" in response.data


def test_refresh_invalid_token(api_client):
    response = api_client.post(REFRESH_URL, {"refresh": "invalid-token"}, format="json")
    assert response.status_code == 401


@freeze_time("2024-01-01")
def test_refresh_expired_token(api_client, test_user):
    with freeze_time("2024-01-01"):
        tokens = _get_tokens(test_user)
    with freeze_time("2024-02-01"):
        response = api_client.post(REFRESH_URL, {"refresh": tokens["refresh"]}, format="json")
    assert response.status_code == 401


def test_logout_success(api_client, test_user):
    tokens = _get_tokens(test_user)
    response = api_client.post(LOGOUT_URL, {"refresh": tokens["refresh"]}, format="json")
    assert response.status_code == 200
    assert response.data["success"] is True


def test_logout_already_invalidated(api_client, test_user):
    tokens = _get_tokens(test_user)
    api_client.post(LOGOUT_URL, {"refresh": tokens["refresh"]}, format="json")
    response = api_client.post(LOGOUT_URL, {"refresh": tokens["refresh"]}, format="json")
    assert response.status_code == 200
    assert response.data["success"] is True
