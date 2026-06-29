from django.urls import path
from .views import UserViewSet

urlpatterns = [
    path("me/", UserViewSet.as_view({"get": "me", "put": "me"}), name="user-me"),
    path("change-password/", UserViewSet.as_view({"post": "change_password"}), name="user-change-password"),
]
