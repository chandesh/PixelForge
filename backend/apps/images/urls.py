from django.urls import path
from . import views

urlpatterns = [
    path("presets/", views.PresetListView.as_view(), name="presets-list"),
    path("presets/custom/", views.CustomPresetListCreateView.as_view(), name="custom-presets-list"),
    path("presets/custom/<uuid:preset_id>/", views.CustomPresetDetailView.as_view(), name="custom-preset-detail"),
    path("jobs/", views.JobListCreateView.as_view(), name="jobs-handler"),
    path("jobs/<uuid:job_id>/", views.JobDetailView.as_view(), name="job-detail-handler"),
    path("jobs/<uuid:job_id>/download/", views.JobDownloadView.as_view(), name="jobs-download"),
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
]
