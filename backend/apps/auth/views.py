import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, LoginSerializer

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"success": False, "data": None, "message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "success": True,
            "data": {
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                },
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            "message": "Registration successful.",
            "errors": None,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        email=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response(
            {"success": False, "data": None, "message": "Invalid credentials.", "errors": None},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "success": True,
            "data": {
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                },
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            "message": "Login successful.",
            "errors": None,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    from rest_framework_simplejwt.views import TokenRefreshView
    return TokenRefreshView.as_view()(request._request)


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    refresh_token = request.data.get("refresh")
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            logger.warning("Logout with already-invalidated token: %s", refresh_token[:20])
            # Idempotent — always return 200 even if token is invalid/expired
    return Response({"success": True, "data": None, "message": "Logged out.", "errors": None})
