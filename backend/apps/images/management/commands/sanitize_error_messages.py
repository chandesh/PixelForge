"""Management command to sanitize existing error messages in ResizeJob records.

Replaces any error_message that looks like a raw exception (contains 'Traceback',
'Error:', file paths, or line numbers) with a generic user-friendly message.
"""
import re
from django.core.management.base import BaseCommand
from apps.images.models import ResizeJob


RAW_EXCEPTION_PATTERNS = [
    re.compile(r"Traceback \(most recent call last\)", re.IGNORECASE),
    re.compile(r"File \".*?\", line \d+", re.IGNORECASE),
    re.compile(r"Error: ", re.IGNORECASE),
    re.compile(r"Exception: ", re.IGNORECASE),
    re.compile(r"^\s*\w+Error\b", re.IGNORECASE),
]


def looks_like_raw_exception(message: str) -> bool:
    return any(p.search(message) for p in RAW_EXCEPTION_PATTERNS)


class Command(BaseCommand):
    help = "Sanitizes raw exception messages from existing failed jobs."

    def handle(self, *args, **options):
        failed_jobs = ResizeJob.objects.filter(status=ResizeJob.Status.FAILED)
        updated = 0
        for job in failed_jobs:
            if job.error_message and looks_like_raw_exception(job.error_message):
                job.error_message = (
                    "An unexpected error occurred while processing your image. "
                    "Please try again. If the problem continues, contact support."
                )
                job.save(update_fields=["error_message"])
                updated += 1
                self.stdout.write(f"Sanitized error_message for job {job.id}")

        self.stdout.write(
            self.style.SUCCESS(f"Sanitized {updated} of {failed_jobs.count()} failed jobs.")
        )
