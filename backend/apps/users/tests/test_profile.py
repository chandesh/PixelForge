"""Tests for user profile endpoints."""
import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

PROFILE_URL = reverse("user-me")
CHANGE_PASSWORD_URL = reverse("user-change-password")


def test_get_profile_authenticated(authenticated_client, test_user):
    response = authenticated_client.get(PROFILE_URL)
    assert response.status_code == 200
    assert response.data["success"] is True
    assert response.data["data"]["email"] == test_user.email
    assert "id" in response.data["data"]


def test_get_profile_unauthenticated(api_client):
    response = api_client.get(PROFILE_URL)
    assert response.status_code == 401


def test_update_profile_success(authenticated_client):
    payload = {"name": "Updated Name", "email": "updated@example.com"}
    response = authenticated_client.put(PROFILE_URL, payload, format="json")
    assert response.status_code == 200
    assert response.data["data"]["name"] == "Updated Name"
    assert response.data["data"]["email"] == "updated@example.com"


def test_update_profile_duplicate_email(authenticated_client, another_user):
    payload = {"email": another_user.email}
    response = authenticated_client.put(PROFILE_URL, payload, format="json")
    assert response.status_code == 400


def test_change_password_success(authenticated_client, test_user):
    payload = {"current_password": "testpass123", "new_password": "newpass12345", "confirm_password": "newpass12345"}
    response = authenticated_client.post(CHANGE_PASSWORD_URL, payload, format="json")
    assert response.status_code == 200
    assert response.data["success"] is True
    test_user.refresh_from_db()
    assert test_user.check_password("newpass12345")


def test_change_password_wrong_current(authenticated_client):
    payload = {"current_password": "wrongpassword", "new_password": "newpass12345", "confirm_password": "newpass12345"}
    response = authenticated_client.post(CHANGE_PASSWORD_URL, payload, format="json")
    assert response.status_code == 400
    assert "incorrect" in response.data["message"].lower()


def test_change_password_mismatch(authenticated_client):
    payload = {"current_password": "testpass123", "new_password": "newpass12345", "confirm_password": "differentpass"}
    response = authenticated_client.post(CHANGE_PASSWORD_URL, payload, format="json")
    assert response.status_code == 400


def test_change_password_too_short(authenticated_client):
    payload = {"current_password": "testpass123", "new_password": "short", "confirm_password": "short"}
    response = authenticated_client.post(CHANGE_PASSWORD_URL, payload, format="json")
    assert response.status_code == 400
