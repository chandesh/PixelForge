"""Tests for the clean_media management command."""
import pytest
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError

from conftest import ResizeJobFactory, ResizeOutputFactory
from apps.images.models import ResizeJob, ResizeOutput

pytestmark = pytest.mark.django_db


@pytest.fixture
def media_tree(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))

    source = tmp_path / "uploads" / "source.png"
    output = tmp_path / "jobs" / "job-1" / "out.jpg"
    orphan = tmp_path / "jobs" / "orphan" / "orphan.jpg"
    source.parent.mkdir(parents=True)
    output.parent.mkdir(parents=True)
    orphan.parent.mkdir(parents=True)
    source.write_bytes(b"source")
    output.write_bytes(b"output")
    orphan.write_bytes(b"orphan")

    job = ResizeJobFactory.create(source_key="uploads/source.png")
    ResizeOutputFactory.create(job=job, output_key="jobs/job-1/out.jpg")

    return tmp_path, source, output, orphan


def test_orphan_media_dry_run_does_not_delete(media_tree, capsys):
    _, source, output, orphan = media_tree

    call_command("clean_media", "--dry-run")

    captured = capsys.readouterr().out
    assert "Mode: orphan-media" in captured
    assert "would delete jobs/orphan/orphan.jpg" in captured
    assert "Dry run: no files or records were deleted." in captured
    assert source.exists()
    assert output.exists()
    assert orphan.exists()


def test_orphan_media_deletes_only_orphans(media_tree, capsys):
    root, source, output, orphan = media_tree

    call_command("clean_media", "--yes")

    captured = capsys.readouterr().out
    assert "Deleted 1 file(s)." in captured
    assert source.exists()
    assert output.exists()
    assert not orphan.exists()
    assert not (root / "jobs" / "orphan").exists()


def test_all_media_deletes_everything(media_tree, capsys):
    root, source, output, orphan = media_tree

    call_command("clean_media", "all-media", "--yes")

    captured = capsys.readouterr().out
    assert "WARNING" in captured
    assert "Deleted 3 file(s)." in captured
    assert not source.exists()
    assert not output.exists()
    assert not orphan.exists()
    assert list(root.iterdir()) == []
    assert ResizeJob.objects.exists()
    assert ResizeOutput.objects.exists()


def test_orphan_media_cancelled(media_tree, mocker, capsys):
    _, source, output, orphan = media_tree
    mocker.patch("builtins.input", return_value="n")

    call_command("clean_media")

    captured = capsys.readouterr().out
    assert "Cancelled." in captured
    assert source.exists()
    assert output.exists()
    assert orphan.exists()


def test_orphan_media_confirmed_with_input(media_tree, mocker, capsys):
    _, source, output, orphan = media_tree
    mocker.patch("builtins.input", return_value="y")

    call_command("clean_media")

    captured = capsys.readouterr().out
    assert "Deleted 1 file(s)." in captured
    assert source.exists()
    assert output.exists()
    assert not orphan.exists()


def test_prune_records_deletes_broken_jobs_and_outputs(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    (tmp_path / "uploads").mkdir()
    (tmp_path / "jobs" / "good").mkdir(parents=True)
    (tmp_path / "uploads" / "good.png").write_bytes(b"source")
    (tmp_path / "jobs" / "good" / "out.jpg").write_bytes(b"output")

    good_job = ResizeJobFactory.create(source_key="uploads/good.png")
    good_output = ResizeOutputFactory.create(
        job=good_job, output_key="jobs/good/out.jpg"
    )
    broken_job = ResizeJobFactory.create(source_key="uploads/missing.png")
    broken_output = ResizeOutputFactory.create(
        job=broken_job, output_key="jobs/broken/missing.jpg"
    )

    call_command("clean_media", "prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "Deleted 1 output record(s) and 1 job record(s)." in captured
    assert not ResizeJob.objects.filter(id=broken_job.id).exists()
    assert not ResizeOutput.objects.filter(id=broken_output.id).exists()
    assert ResizeJob.objects.filter(id=good_job.id).exists()
    assert ResizeOutput.objects.filter(id=good_output.id).exists()


def test_prune_records_dry_run_does_not_delete(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    broken_job = ResizeJobFactory.create(source_key="uploads/missing.png")
    broken_output = ResizeOutputFactory.create(
        job=broken_job, output_key="jobs/broken/missing.jpg"
    )

    call_command("clean_media", "prune-records", "--dry-run")

    captured = capsys.readouterr().out
    assert "would delete output jobs/broken/missing.jpg" in captured
    assert f"would delete job {broken_job.id}" in captured
    assert "Dry run: no files or records were deleted." in captured
    assert ResizeJob.objects.filter(id=broken_job.id).exists()
    assert ResizeOutput.objects.filter(id=broken_output.id).exists()


def test_prune_records_keeps_job_with_present_source(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    (tmp_path / "uploads").mkdir()
    (tmp_path / "uploads" / "source.png").write_bytes(b"source")

    job = ResizeJobFactory.create(source_key="uploads/source.png")
    output = ResizeOutputFactory.create(
        job=job, output_key="jobs/job/missing.jpg"
    )

    call_command("clean_media", "prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "Deleted 1 output record(s) and 0 job record(s)." in captured
    assert ResizeJob.objects.filter(id=job.id).exists()
    assert not ResizeOutput.objects.filter(id=output.id).exists()


def test_prune_records_keeps_job_with_present_output(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    (tmp_path / "jobs" / "partial").mkdir(parents=True)
    (tmp_path / "jobs" / "partial" / "present.jpg").write_bytes(b"present")

    job = ResizeJobFactory.create(source_key="uploads/gone.png")
    present_output = ResizeOutputFactory.create(
        job=job, output_key="jobs/partial/present.jpg"
    )
    missing_output = ResizeOutputFactory.create(
        job=job, output_key="jobs/partial/missing.jpg"
    )

    call_command("clean_media", "prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "jobs kept (source missing, outputs remain): 1" in captured
    assert ResizeJob.objects.filter(id=job.id).exists()
    assert ResizeOutput.objects.filter(id=present_output.id).exists()
    assert not ResizeOutput.objects.filter(id=missing_output.id).exists()


def test_prune_records_keeps_jobs_without_source(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    job = ResizeJobFactory.create(
        source_type=ResizeJob.SourceType.URL, source_key=""
    )
    output = ResizeOutputFactory.create(
        job=job, output_key="jobs/url/missing.jpg"
    )

    call_command("clean_media", "prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "jobs without a source_key (kept): 1" in captured
    assert ResizeJob.objects.filter(id=job.id).exists()
    assert not ResizeOutput.objects.filter(id=output.id).exists()


def test_orphan_media_with_prune_records(media_tree, capsys):
    root, source, output, orphan = media_tree
    broken_job = ResizeJobFactory.create(source_key="uploads/gone.png")
    broken_output = ResizeOutputFactory.create(
        job=broken_job, output_key="jobs/broken/missing.jpg"
    )

    call_command("clean_media", "--prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "Deleted 1 file(s)." in captured
    assert "Deleted 1 output record(s) and 1 job record(s)." in captured
    assert not orphan.exists()
    assert source.exists()
    assert output.exists()
    assert not ResizeJob.objects.filter(id=broken_job.id).exists()
    assert not ResizeOutput.objects.filter(id=broken_output.id).exists()


def test_all_media_with_prune_records(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    (tmp_path / "uploads").mkdir()
    (tmp_path / "jobs" / "good").mkdir(parents=True)
    (tmp_path / "uploads" / "good.png").write_bytes(b"source")
    (tmp_path / "jobs" / "good" / "out.jpg").write_bytes(b"output")

    good_job = ResizeJobFactory.create(source_key="uploads/good.png")
    ResizeOutputFactory.create(job=good_job, output_key="jobs/good/out.jpg")
    no_source_job = ResizeJobFactory.create(
        source_type=ResizeJob.SourceType.URL, source_key=""
    )

    call_command("clean_media", "all-media", "--prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "Deleted 2 file(s)." in captured
    assert "Deleted 1 output record(s) and 1 job record(s)." in captured
    assert not (tmp_path / "uploads" / "good.png").exists()
    assert not (tmp_path / "jobs" / "good" / "out.jpg").exists()
    assert not ResizeJob.objects.filter(id=good_job.id).exists()
    assert ResizeJob.objects.filter(id=no_source_job.id).exists()


def test_nothing_to_delete(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))

    call_command("clean_media", "prune-records", "--yes")

    captured = capsys.readouterr().out
    assert "Nothing to delete." in captured


def test_missing_referenced_files_are_reported(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    ResizeJobFactory.create(source_key="uploads/missing.png")

    call_command("clean_media", "--dry-run")

    captured = capsys.readouterr().out
    assert "missing on disk: 1" in captured
    assert "Nothing to delete." in captured


def test_non_local_storage_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")

    with pytest.raises(CommandError, match="local storage backend"):
        call_command("clean_media", "--yes")


def test_invalid_mode_is_rejected():
    with pytest.raises(CommandError):
        call_command("clean_media", "invalid")
