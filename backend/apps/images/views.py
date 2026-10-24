"""Image views for PixelForge."""
import uuid
import os
import shutil
import tempfile
import zipfile
from django.shortcuts import get_object_or_404
from django.db.models import Count, Prefetch, Q, Sum
from django.utils import timezone
from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from .models import ResizePreset, ResizeJob, ResizeOutput
from .serializers import (
    ResizePresetSerializer,
    CustomPresetSerializer,
    ResizeJobListSerializer,
    ResizeJobDetailSerializer,
    CreateJobSerializer,
)
from core.storage import storage
from .tasks import process_resize_job


def _jobs_with_outputs():
    return ResizeJob.objects.prefetch_related(
        Prefetch(
            "outputs",
            queryset=ResizeOutput.objects.select_related("preset").order_by("created_at"),
        )
    )


class PresetListView(APIView):
    def get(self, request):
        presets = ResizePreset.objects.filter(
            is_active=True,
            is_predefined=True,
            user__isnull=True,
            width__gt=0,
            height__gt=0,
        )
        serializer = ResizePresetSerializer(presets, many=True)
        grouped = {}
        for p in serializer.data:
            grouped.setdefault(p["category"], []).append(p)
        return Response({"success": True, "data": grouped, "message": "", "errors": None})


class CustomPresetListCreateView(ListCreateAPIView):
    serializer_class = CustomPresetSerializer

    def get_queryset(self):
        return ResizePreset.objects.filter(user=self.request.user, is_predefined=False)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, is_predefined=False, slug=uuid.uuid4().hex[:12])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "data": serializer.data, "message": "Custom preset created.", "errors": None},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data, "message": "", "errors": None})


class CustomPresetDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = CustomPresetSerializer

    def get_queryset(self):
        return ResizePreset.objects.filter(user=self.request.user, is_predefined=False)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "data": serializer.data, "message": "", "errors": None})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "data": serializer.data, "message": "Custom preset updated.", "errors": None})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({"success": True, "data": None, "message": "Custom preset deleted.", "errors": None})


class JobListCreateView(APIView):
    def get(self, request):
        jobs = _jobs_with_outputs().filter(user=request.user, is_deleted=False)
        status_filter = request.query_params.get("status")
        search = request.query_params.get("search")
        if status_filter:
            jobs = jobs.filter(status=status_filter)
        if search:
            jobs = jobs.filter(original_filename__icontains=search)

        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 20))
        except (ValueError, TypeError):
            page, page_size = 1, 20
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)

        start = (page - 1) * page_size
        end = start + page_size
        total = jobs.count()
        jobs_page = list(jobs[start:end])

        serializer = ResizeJobListSerializer(jobs_page, many=True)
        return Response({
            "success": True,
            "data": {
                "results": serializer.data,
                "count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size,
            },
            "message": "",
            "errors": None,
        })

    def post(self, request):
        serializer = CreateJobSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        source_type = data["source_type"]
        source_url = data.get("source_url", "")
        uploaded_file = data.get("file")

        if uploaded_file:
            ext = os.path.splitext(uploaded_file.name)[1].lower()
            key = f"uploads/{uuid.uuid4()}{ext}"
            storage.upload_file(uploaded_file, key)
            original_filename = os.path.basename(uploaded_file.name) or f"upload{ext}"
            original_size = uploaded_file.size
        else:
            key = ""
            original_filename = os.path.basename(source_url.rstrip("/")) or "image"
            original_size = 0

        job = ResizeJob.objects.create(
            user=request.user,
            source_type=source_type,
            source_url=source_url,
            source_key=key,
            original_filename=original_filename,
            original_size=original_size,
        )

        try:
            process_resize_job.delay(str(job.id), data.get("preset_ids", []), data.get("custom_sizes", []))
        except Exception:
            job.status = ResizeJob.Status.FAILED
            job.error_message = "Could not queue the image for processing. Please try again."
            job.save(update_fields=["status", "error_message"])

        detail_serializer = ResizeJobDetailSerializer(job)
        return Response(
            {"success": True, "data": detail_serializer.data, "message": "Job created.", "errors": None},
            status=status.HTTP_201_CREATED,
        )


class JobDetailView(APIView):
    def get_object(self, request, job_id):
        return get_object_or_404(
            _jobs_with_outputs(),
            id=job_id,
            user=request.user,
            is_deleted=False,
        )

    def get(self, request, job_id):
        job = self.get_object(request, job_id)
        serializer = ResizeJobDetailSerializer(job)
        return Response({"success": True, "data": serializer.data, "message": "", "errors": None})

    def delete(self, request, job_id):
        job = get_object_or_404(ResizeJob, id=job_id, user=request.user)
        job.is_deleted = True
        job.save()
        return Response({"success": True, "data": None, "message": "Job deleted.", "errors": None})


class JobDownloadView(APIView):
    def get(self, request, job_id):
        job = get_object_or_404(ResizeJob, id=job_id, user=request.user, is_deleted=False)
        if job.status != "DONE":
            return Response(
                {"success": False, "data": None, "message": "Job is not complete.", "errors": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_id = request.query_params.get("output_id")
        outputs = list(job.outputs.all())

        if output_id:
            output = next((item for item in outputs if str(item.id) == str(output_id)), None)
            if output is None:
                return Response(
                    {"success": False, "data": None, "message": "Output not found.", "errors": None},
                    status=status.HTTP_404_NOT_FOUND,
                )
            try:
                file_obj = storage.open_file(output.output_key)
            except (FileNotFoundError, OSError):
                return Response(
                    {"success": False, "data": None, "message": "Output file not found.", "errors": None},
                    status=status.HTTP_404_NOT_FOUND,
                )
            filename = os.path.basename(output.output_key) or f"output-{output.id}"
            return FileResponse(file_obj, as_attachment=True, filename=filename)

        if not outputs:
            return Response(
                {"success": False, "data": None, "message": "No outputs available.", "errors": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        archive = tempfile.SpooledTemporaryFile(max_size=10 * 1024 * 1024, mode="w+b")
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for index, output in enumerate(outputs, start=1):
                try:
                    file_obj = storage.open_file(output.output_key)
                except (FileNotFoundError, OSError):
                    continue
                try:
                    arcname = os.path.basename(output.output_key) or f"output-{index}.jpg"
                    with zip_file.open(arcname, "w") as dest:
                        shutil.copyfileobj(file_obj, dest, length=64 * 1024)
                finally:
                    close = getattr(file_obj, "close", None)
                    if callable(close):
                        close()
        archive.seek(0)

        base_name = os.path.splitext(os.path.basename(job.original_filename))[0] or "images"
        return FileResponse(archive, as_attachment=True, filename=f"{base_name}-resized.zip")


CATEGORY_LABELS = dict(ResizePreset.Category.choices)


class DashboardStatsView(APIView):
    def get(self, request):
        user = request.user
        jobs = ResizeJob.objects.filter(user=user, is_deleted=False)
        outputs = ResizeOutput.objects.filter(job__user=user, job__is_deleted=False)

        status_counts = jobs.aggregate(
            total=Count("id"),
            done=Count("id", filter=Q(status=ResizeJob.Status.DONE)),
            failed=Count("id", filter=Q(status=ResizeJob.Status.FAILED)),
            processing=Count("id", filter=Q(status=ResizeJob.Status.PROCESSING)),
            pending=Count("id", filter=Q(status=ResizeJob.Status.PENDING)),
        )
        total_jobs = status_counts["total"]
        total_outputs = outputs.count()

        now = timezone.now()
        week_start = now - timezone.timedelta(days=7)
        month_start = now - timezone.timedelta(days=30)

        jobs_this_week = jobs.filter(created_at__gte=week_start).count()
        jobs_this_month = jobs.filter(created_at__gte=month_start).count()

        storage_result = outputs.aggregate(total=Sum("file_size"))
        storage_used_bytes = storage_result["total"] or 0

        fmt_bytes = lambda b: (
            f"{b} B" if b < 1024
            else f"{b / 1024:.1f} KB" if b < 1024 * 1024
            else f"{b / (1024 * 1024):.1f} MB"
        )

        most_used_preset_data = None
        most_used_category_data = None

        preset_counts = (
            ResizePreset.objects.filter(resizeoutput__job__user=user, resizeoutput__job__is_deleted=False)
            .values("name", "category")
            .annotate(cnt=Count("resizeoutput"))
            .order_by("-cnt")
            .first()
        )
        if preset_counts:
            most_used_preset_data = {
                "name": preset_counts["name"],
                "category": CATEGORY_LABELS.get(preset_counts["category"], preset_counts["category"]),
                "count": preset_counts["cnt"],
            }

        cat_counts = (
            outputs.values("preset__category")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")
            .first()
        )
        if cat_counts and cat_counts["preset__category"]:
            most_used_category_data = {
                "name": CATEGORY_LABELS.get(cat_counts["preset__category"], cat_counts["preset__category"]),
                "count": cat_counts["cnt"],
            }

        status_breakdown = {
            "DONE": status_counts["done"],
            "FAILED": status_counts["failed"],
            "PROCESSING": status_counts["processing"],
            "PENDING": status_counts["pending"],
        }

        recent_jobs_qs = jobs.order_by("-created_at")[:5].prefetch_related(
            Prefetch(
                "outputs",
                queryset=ResizeOutput.objects.order_by("created_at"),
            )
        )
        recent_jobs_data = []
        for j in recent_jobs_qs:
            job_outputs = list(j.outputs.all())
            first_output = next((output for output in job_outputs if output.output_url), None)
            recent_jobs_data.append({
                "id": str(j.id),
                "original_filename": j.original_filename,
                "status": j.status.lower(),
                "output_count": len(job_outputs),
                "thumbnail_url": first_output.output_url if first_output else None,
                "created_at": j.created_at.isoformat(),
            })

        data = {
            "total_jobs": total_jobs,
            "total_outputs": total_outputs,
            "jobs_this_week": jobs_this_week,
            "jobs_this_month": jobs_this_month,
            "storage_used_bytes": storage_used_bytes,
            "storage_used_display": fmt_bytes(storage_used_bytes),
            "most_used_preset": most_used_preset_data,
            "most_used_category": most_used_category_data,
            "status_breakdown": status_breakdown,
            "recent_jobs": recent_jobs_data,
        }

        return Response({"success": True, "data": data, "message": "", "errors": None})
