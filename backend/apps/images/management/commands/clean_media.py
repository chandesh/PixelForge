"""Management command to clean media files and broken database records."""
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, transaction

from apps.images.models import ResizeJob, ResizeOutput

MODE_ORPHAN = "orphan-media"
MODE_ALL = "all-media"
MODE_RECORDS = "prune-records"
MODES = (MODE_ORPHAN, MODE_ALL, MODE_RECORDS)


@dataclass
class RecordPlan:
    missing_outputs: list
    broken_jobs: list
    jobs_with_missing_source: list
    kept_missing_source: list
    jobs_with_missing_outputs: list
    no_source_jobs: list


def _normalize_key(key: str) -> str:
    return str(key).replace("\\", "/").lstrip("/")


def _relative_key(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def _human_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            if unit == "B":
                return f"{int(value)} B"
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} TB"


def _total_size(paths) -> int:
    total = 0
    for path in paths:
        try:
            total += path.stat().st_size
        except OSError:
            pass
    return total


class Command(BaseCommand):
    help = "Remove orphaned media files and database records whose files are missing."

    def add_arguments(self, parser):
        parser.add_argument(
            "mode",
            nargs="?",
            default=MODE_ORPHAN,
            choices=MODES,
            help="orphan-media (default), all-media, or prune-records",
        )
        parser.add_argument(
            "--prune-records",
            action="store_true",
            help="Also delete database records whose files are missing.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List files and records that would be deleted without deleting them.",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Skip the confirmation prompt.",
        )

    def handle(self, *args, **options):
        mode = options["mode"]
        dry_run = options["dry_run"]
        assume_yes = options["yes"]
        prune_records = options["prune_records"] or mode == MODE_RECORDS
        file_mode = mode in (MODE_ORPHAN, MODE_ALL)

        storage_backend = getattr(settings, "STORAGE_BACKEND", "local")
        if storage_backend != "local":
            raise CommandError(
                "clean_media only supports the local storage backend "
                f"(current: {storage_backend})."
            )

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.is_dir():
            if prune_records:
                raise CommandError(
                    "Media directory not found; refusing to prune database records."
                )
            self.stdout.write(f"Media directory not found: {media_root}")
            return

        disk_files = sorted(path for path in media_root.rglob("*") if path.is_file())
        disk_keys = {_relative_key(path, media_root) for path in disk_files}

        try:
            referenced_keys = self._referenced_keys()
        except OperationalError as exc:
            raise CommandError(
                f"Could not read media references from the database: {exc}"
            ) from exc

        if mode == MODE_ALL:
            file_targets = disk_files
        elif mode == MODE_ORPHAN:
            file_targets = [
                path
                for path in disk_files
                if _relative_key(path, media_root) not in referenced_keys
            ]
        else:
            file_targets = []

        target_keys = {_relative_key(path, media_root) for path in file_targets}
        effective_disk_keys = disk_keys - target_keys

        record_plan = None
        if prune_records:
            record_plan = self._build_record_plan(effective_disk_keys)

        if file_mode:
            self._print_file_summary(
                mode=mode,
                media_root=media_root,
                disk_files=disk_files,
                referenced_keys=referenced_keys,
                file_targets=file_targets,
                prune_records=prune_records,
            )
        if record_plan:
            self._print_record_summary(record_plan)

        file_count = len(file_targets)
        output_count = len(record_plan.missing_outputs) if record_plan else 0
        job_count = len(record_plan.broken_jobs) if record_plan else 0

        if file_count == 0 and output_count == 0 and job_count == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to delete."))
            return

        if dry_run:
            for path in file_targets:
                self.stdout.write(f"  would delete {_relative_key(path, media_root)}")
            if record_plan:
                for output in record_plan.missing_outputs:
                    self.stdout.write(
                        f"  would delete output {_normalize_key(output.output_key)}"
                    )
                for job in record_plan.broken_jobs:
                    self.stdout.write(
                        f"  would delete job {job.id} "
                        f"({job.original_filename or 'unnamed'}, {job.status})"
                    )
            self.stdout.write("Dry run: no files or records were deleted.")
            return

        if not assume_yes:
            answer = input(
                self._confirmation_prompt(file_count, output_count, job_count)
            ).strip().lower()
            if answer not in ("y", "yes"):
                self.stdout.write("Cancelled.")
                return

        if file_mode and file_targets:
            file_errors = self._delete_files(file_targets, media_root)
            self._remove_empty_directories(media_root)
            if file_errors:
                raise CommandError(
                    f"{file_errors} file(s) could not be deleted; "
                    "database records were not pruned."
                )

        if record_plan:
            self._delete_records(record_plan)

        if file_mode and file_targets:
            self.stdout.write(
                self.style.SUCCESS(f"Deleted {len(file_targets)} file(s).")
            )
        if record_plan:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Deleted {len(record_plan.missing_outputs)} output record(s) "
                    f"and {len(record_plan.broken_jobs)} job record(s)."
                )
            )

    def _referenced_keys(self):
        keys = set(
            ResizeJob.objects.exclude(source_key="").values_list(
                "source_key", flat=True
            )
        )
        keys.update(
            ResizeOutput.objects.exclude(output_key="").values_list(
                "output_key", flat=True
            )
        )
        return {_normalize_key(key) for key in keys if key}

    def _build_record_plan(self, effective_disk_keys) -> RecordPlan:
        jobs = list(ResizeJob.objects.prefetch_related("outputs").all())
        missing_outputs = []
        broken_jobs = []
        jobs_with_missing_source = []
        kept_missing_source = []
        jobs_with_missing_outputs = []
        no_source_jobs = []

        for job in jobs:
            source_key = _normalize_key(job.source_key)
            source_missing = bool(source_key) and source_key not in effective_disk_keys
            outputs = list(job.outputs.all())
            missing = [
                output
                for output in outputs
                if _normalize_key(output.output_key) not in effective_disk_keys
            ]
            present = [
                output
                for output in outputs
                if _normalize_key(output.output_key) in effective_disk_keys
            ]

            if not source_key:
                no_source_jobs.append(job)
            if source_missing:
                jobs_with_missing_source.append(job)
            if missing:
                jobs_with_missing_outputs.append(job)
                missing_outputs.extend(missing)
            if source_missing and not present:
                broken_jobs.append(job)
            elif source_missing and present:
                kept_missing_source.append(job)

        return RecordPlan(
            missing_outputs=missing_outputs,
            broken_jobs=broken_jobs,
            jobs_with_missing_source=jobs_with_missing_source,
            kept_missing_source=kept_missing_source,
            jobs_with_missing_outputs=jobs_with_missing_outputs,
            no_source_jobs=no_source_jobs,
        )

    def _print_file_summary(
        self,
        mode,
        media_root,
        disk_files,
        referenced_keys,
        file_targets,
        prune_records,
    ):
        disk_keys = {_relative_key(path, media_root) for path in disk_files}
        orphan_files = [
            path
            for path in disk_files
            if _relative_key(path, media_root) not in referenced_keys
        ]

        self.stdout.write(f"Media directory: {media_root}")
        self.stdout.write(f"Mode: {mode}")
        self.stdout.write(
            f"Files on disk: {len(disk_files)} ({_human_size(_total_size(disk_files))})"
        )
        self.stdout.write(f"Referenced keys in database: {len(referenced_keys)}")
        self.stdout.write(f"  present on disk: {len(referenced_keys & disk_keys)}")
        self.stdout.write(f"  missing on disk: {len(referenced_keys - disk_keys)}")
        self.stdout.write(
            f"Orphan files: {len(orphan_files)} ({_human_size(_total_size(orphan_files))})"
        )

        if mode == MODE_ALL:
            if prune_records:
                self.stdout.write(
                    self.style.WARNING(
                        f"WARNING: this deletes all {len(disk_files)} file(s) and "
                        "prunes database records whose files are missing."
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"WARNING: this deletes all {len(disk_files)} file(s), including "
                        f"{len(referenced_keys & disk_keys)} referenced by the database. "
                        "Database rows will not be changed."
                    )
                )

        self.stdout.write(
            f"Files to delete: {len(file_targets)} "
            f"({_human_size(_total_size(file_targets))})"
        )

    def _print_record_summary(self, plan: RecordPlan):
        self.stdout.write("Database records:")
        self.stdout.write(
            f"  jobs without a source_key (kept): {len(plan.no_source_jobs)}"
        )
        self.stdout.write(
            f"  jobs with a missing source: {len(plan.jobs_with_missing_source)}"
        )
        self.stdout.write(
            "  jobs to delete (source missing, no remaining outputs): "
            f"{len(plan.broken_jobs)}"
        )
        self.stdout.write(
            "  jobs kept (source missing, outputs remain): "
            f"{len(plan.kept_missing_source)}"
        )
        self.stdout.write(
            f"  jobs with missing outputs: {len(plan.jobs_with_missing_outputs)}"
        )
        self.stdout.write(
            f"  output records to delete: {len(plan.missing_outputs)}"
        )

    def _confirmation_prompt(self, file_count, output_count, job_count) -> str:
        parts = []
        if file_count:
            parts.append(f"{file_count} file(s)")
        if output_count:
            parts.append(f"{output_count} output record(s)")
        if job_count:
            parts.append(f"{job_count} job record(s)")
        return f"Delete {' and '.join(parts)}? [y/N] "

    def _delete_files(self, paths, media_root: Path) -> int:
        errors = 0
        for path in paths:
            key = _relative_key(path, media_root)
            try:
                path.unlink()
            except OSError as exc:
                errors += 1
                self.stderr.write(f"  failed {key}: {exc}")
                continue
            self.stdout.write(f"  deleted {key}")
        return errors

    def _delete_records(self, plan: RecordPlan):
        output_ids = [output.id for output in plan.missing_outputs]
        job_ids = [job.id for job in plan.broken_jobs]

        with transaction.atomic():
            if output_ids:
                ResizeOutput.objects.filter(id__in=output_ids).delete()
            if job_ids:
                ResizeJob.objects.filter(id__in=job_ids).delete()

        for output in plan.missing_outputs:
            self.stdout.write(
                f"  deleted output {_normalize_key(output.output_key)}"
            )
        for job in plan.broken_jobs:
            self.stdout.write(
                f"  deleted job {job.id} "
                f"({job.original_filename or 'unnamed'}, {job.status})"
            )

    def _remove_empty_directories(self, media_root: Path):
        directories = sorted(
            (path for path in media_root.rglob("*") if path.is_dir()),
            key=lambda path: len(path.parts),
            reverse=True,
        )
        for directory in directories:
            try:
                directory.rmdir()
            except OSError:
                pass
