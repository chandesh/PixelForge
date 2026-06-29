import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface PresetGroup {
  [category: string]: Preset[];
}

export interface Preset {
  id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  category: string;
  label?: string;
  description: string;
  is_predefined?: boolean;
}

export interface CustomPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  label?: string;
}

export interface ResizeOutput {
  id: string;
  preset: Preset | null;
  label: string;
  width: number;
  height: number;
  output_url: string;
  file_size: number;
  file_size_display?: string;
  preset_name?: string;
  preset_category?: string;
  aspect_ratio?: string;
  created_at: string;
}

export interface ResizeJob {
  id: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  source_type: string;
  source_url?: string;
  original_filename: string;
  original_size?: number;
  original_size_display?: string;
  original_width: number | null;
  original_height: number | null;
  original_format: string;
  created_at: string;
  completed_at: string | null;
  output_count?: number;
  outputs?: ResizeOutput[];
  error_message?: string;
  preset_summary?: string[];
  processing_duration_seconds?: number;
  original_dimensions_display?: string;
  thumbnail_url?: string;
}

export interface DashboardStats {
  total_jobs: number;
  total_outputs: number;
  jobs_this_week: number;
  jobs_this_month: number;
  storage_used_bytes: number;
  storage_used_display: string;
  most_used_preset: { name: string; category: string; count: number } | null;
  most_used_category: { name: string; count: number } | null;
  status_breakdown: {
    DONE: number;
    FAILED: number;
    PROCESSING: number;
    PENDING: number;
  };
  recent_jobs: {
    id: string;
    original_filename: string;
    status: string;
    output_count: number;
    thumbnail_url: string | null;
    created_at: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: any;
}

export interface PaginatedData<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateJobPayload {
  source_type: "UPLOAD" | "URL";
  source_url?: string;
  preset_ids?: string[];
  custom_sizes?: { label?: string; width: number; height: number }[];
}

@Injectable({ providedIn: "root" })
export class ImageService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getPresets(): Observable<ApiResponse<PresetGroup>> {
    return this.http.get<ApiResponse<PresetGroup>>(`${this.apiUrl}/presets/`);
  }

  createJob(payload: CreateJobPayload, file?: File): Observable<ApiResponse<ResizeJob>> {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_type", "UPLOAD");
      formData.append("preset_ids", JSON.stringify(payload.preset_ids || []));
      formData.append("custom_sizes", JSON.stringify(payload.custom_sizes || []));
      return this.http.post<ApiResponse<ResizeJob>>(`${this.apiUrl}/jobs/`, formData);
    }
    return this.http.post<ApiResponse<ResizeJob>>(`${this.apiUrl}/jobs/`, payload);
  }

  getJob(id: string): Observable<ApiResponse<ResizeJob>> {
    return this.http.get<ApiResponse<ResizeJob>>(`${this.apiUrl}/jobs/${id}/`);
  }

  getJobs(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Observable<ApiResponse<PaginatedData<ResizeJob>>> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set("page", params.page);
      if (params.page_size) httpParams = httpParams.set("page_size", params.page_size);
      if (params.status) httpParams = httpParams.set("status", params.status);
      if (params.search) httpParams = httpParams.set("search", params.search);
    }
    return this.http.get<ApiResponse<PaginatedData<ResizeJob>>>(`${this.apiUrl}/jobs/`, {
      params: httpParams,
    });
  }

  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/dashboard/stats/`);
  }

  deleteJob(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/jobs/${id}/`);
  }

  downloadJobBlob(id: string, outputId?: string): Observable<Blob> {
    const params = outputId ? new HttpParams().set("output_id", outputId) : undefined;
    return this.http.get(`${this.apiUrl}/jobs/${id}/download/`, {
      params,
      responseType: "blob",
    });
  }

  getCustomPresets(): Observable<ApiResponse<CustomPreset[]>> {
    return this.http.get<ApiResponse<CustomPreset[]>>(`${this.apiUrl}/presets/custom/`);
  }

  createCustomPreset(data: Partial<CustomPreset>): Observable<ApiResponse<CustomPreset>> {
    return this.http.post<ApiResponse<CustomPreset>>(`${this.apiUrl}/presets/custom/`, data);
  }

  updateCustomPreset(id: string, data: Partial<CustomPreset>): Observable<ApiResponse<CustomPreset>> {
    return this.http.put<ApiResponse<CustomPreset>>(`${this.apiUrl}/presets/custom/${id}/`, data);
  }

  deleteCustomPreset(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/presets/custom/${id}/`);
  }
}
