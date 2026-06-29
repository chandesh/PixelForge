"""Request logging middleware for PixelForge."""
import time
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """Logs request method, path, duration, and status code."""

    def process_request(self, request):
        request._start_time = time.time()

    def process_response(self, request, response):
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time
            logger.info(
                "%s %s → %s (%.2fs)",
                request.method,
                request.path,
                response.status_code,
                duration,
            )
        return response
