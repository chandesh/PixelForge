import { Component, OnInit, OnDestroy, signal, computed } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { ImageService, ResizeJob } from "../../../services/image/image.service";

@Component({
  selector: "pf-job-detail",
  standalone: true,
  imports: [RouterLink, DatePipe, MatIconModule, MatButtonModule],
  styles: `
    .error-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 24px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-left: 4px solid #EF4444;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .error-icon {
      color: #EF4444;
      font-size: 24px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .error-content { flex: 1; }
    .error-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--pf-text-primary);
      margin: 0 0 8px 0;
    }
    .error-message {
      font-size: 14px;
      color: var(--pf-text-secondary);
      margin: 0 0 8px 0;
      line-height: 1.5;
    }
    .error-hint {
      font-size: 12px;
      color: var(--pf-text-muted);
      margin: 0 0 16px 0;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 4px;
      border-left: 2px solid var(--pf-accent);
    }
    .error-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .error-time {
      font-size: 11px;
      color: var(--pf-text-muted);
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 4px;
    }
  `,
  template: `
    <div class="page-content--wide space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-4">
          <a routerLink="/app/history" class="text-text-secondary hover:text-text-primary transition">&larr; Back</a>
          <div>
            <h2 class="text-2xl font-bold">{{ job()?.original_filename || 'Loading...' }}</h2>
            <p class="text-text-secondary text-sm mt-1">
              {{ job()?.created_at | date:'medium' }}
              @if (job()?.processing_duration_seconds != null) {
                · {{ job()?.processing_duration_seconds }}s processing time
              }
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span [class]="statusClass() + ' px-3 py-1 rounded text-xs font-medium'">{{ job()?.status || '—' }}</span>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-6 animate-pulse">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card h-40"></div>
            <div class="card h-40"></div>
          </div>
          <div class="card h-64"></div>
        </div>
      } @else if (error()) {
        <div class="card text-center py-12">
          <p class="text-red-400">{{ error() }}</p>
          <button (click)="loadJob()" class="btn-secondary mt-4">Retry</button>
        </div>
      } @else {
        @let j = job()!;
        <!-- Original File Card -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="card">
            <h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Original File</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-text-secondary text-sm">Filename</span>
                <span class="text-sm font-medium">{{ j.original_filename }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary text-sm">Format</span>
                <span class="text-sm font-medium">{{ j.original_format || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary text-sm">Dimensions</span>
                <span class="text-sm font-medium">{{ j.original_dimensions_display || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary text-sm">Size</span>
                <span class="text-sm font-medium">{{ j.original_size_display || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Source</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-text-secondary text-sm">Type</span>
                <span class="text-sm font-medium">{{ j.source_type === 'UPLOAD' ? 'Upload' : 'URL' }}</span>
              </div>
              @if (j.source_type === 'URL' && j.source_url) {
                <div>
                  <span class="text-text-secondary text-sm block mb-1">URL</span>
                  <a [href]="j.source_url" target="_blank" rel="noopener noreferrer"
                     class="text-accent text-sm hover:underline break-all">{{ j.source_url }}</a>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-text-secondary text-sm">Created</span>
                <span class="text-sm font-medium">{{ j.created_at | date:'medium' }}</span>
              </div>
              @if (j.completed_at) {
                <div class="flex justify-between">
                  <span class="text-text-secondary text-sm">Completed</span>
                  <span class="text-sm font-medium">{{ j.completed_at | date:'medium' }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Error Message -->
        @if (j.status === 'FAILED' && j.error_message) {
          <div class="error-card">
            <mat-icon class="error-icon">error_outline</mat-icon>
            <div class="error-content">
              <h3 class="error-title">Processing Failed</h3>
              <p class="error-message">{{ j.error_message }}</p>
              @if (j.source_type === 'URL') {
                <p class="error-hint">
                  Tip: Make sure the image URL is publicly accessible and points directly to an image file (JPG, PNG, WebP).
                </p>
              }
              @if (j.source_type === 'UPLOAD') {
                <p class="error-hint">
                  Tip: Try re-uploading the file. Ensure it is a valid image under 50MB.
                </p>
              }
              <div class="error-actions">
                <button mat-flat-button color="primary" (click)="retryWithSameSettings()">
                  <mat-icon>refresh</mat-icon>
                  Try Again
                </button>
                <button mat-stroked-button (click)="navigateToResize()">
                  <mat-icon>add_photo_alternate</mat-icon>
                  Start New Resize
                </button>
              </div>
            </div>
            <span class="error-time">Failed {{ j.completed_at | date:'medium' }}</span>
          </div>
        }

        <!-- Outputs Section -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Outputs ({{ j.output_count || 0 }})</h3>
            @if (j.outputs?.length) {
              <button (click)="downloadAll()" class="btn-primary text-sm">Download All as ZIP</button>
            }
          </div>

          @if (j.outputs && j.outputs.length > 0) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (output of j.outputs; track output.id) {
                <div class="card overflow-hidden">
                  <div class="aspect-video bg-surface-light relative overflow-hidden">
                    <img [src]="output.output_url" [alt]="output.label"
                         class="w-full h-full object-contain"
                         loading="lazy" />
                  </div>
                  <div class="p-4 space-y-2">
                    <p class="text-sm font-medium">{{ output.label }}</p>
                    <div class="flex items-center gap-3 text-xs text-text-secondary">
                      <span>{{ output.width }} × {{ output.height }}</span>
                      @if (output.aspect_ratio) {
                        <span class="text-text-muted">({{ output.aspect_ratio }})</span>
                      }
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-text-muted">{{ output.file_size_display || formatFileSize(output.file_size) }}</span>
                      <div class="flex items-center gap-2">
                        <a [routerLink]="['/app/preview-tester']"
                           [queryParams]="{ jobId: j.id, outputId: output.id }"
                           class="text-xs text-accent hover:underline">Test Preview</a>
                        <button (click)="downloadOutput(output.id)" class="text-accent text-xs hover:underline">Download</button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          @if (j.status === 'DONE' && (!j.outputs || j.outputs.length === 0)) {
            <div class="card text-center py-12">
              <p class="text-text-muted">No outputs found for this job.</p>
            </div>
          }

          @if (j.status === 'PROCESSING' || j.status === 'PENDING') {
            <div class="card text-center py-12">
              <div class="spinner-icon mx-auto mb-4"></div>
              <p class="text-text-secondary">Processing your images...</p>
            </div>
          }
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center justify-between p-4 bg-surface rounded-lg border border-border">
          <span class="text-sm text-text-secondary">Job ID: {{ j.id }}</span>
          <div class="flex items-center gap-3">
            @if (j.status === 'DONE') {
              <button (click)="downloadAll()" class="btn-secondary text-sm">Download ZIP</button>
            }
            <button (click)="deleteJob()" class="text-red-400 hover:text-red-300 text-sm">Delete Job</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class JobDetailComponent implements OnInit, OnDestroy {
  readonly job = signal<ResizeJob | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly statusClass = computed(() => {
    const status = this.job()?.status;
    switch (status) {
      case "DONE": return "bg-accent/10 text-accent";
      case "PROCESSING": return "bg-blue-500/10 text-blue-400";
      case "FAILED": return "bg-red-500/10 text-red-400";
      default: return "bg-yellow-500/10 text-yellow-400";
    }
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private imageService: ImageService,
  ) {}

  ngOnInit(): void {
    this.loadJob();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadJob(): void {
    const jobId = this.route.snapshot.paramMap.get("id");
    if (!jobId) {
      this.error.set("Job ID not found.");
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set("");

    this.imageService.getJob(jobId).subscribe({
      next: (res) => {
        if (res.success) {
          this.job.set(res.data);
          this.loading.set(false);

          if (res.data.status === "PENDING" || res.data.status === "PROCESSING") {
            this.startPolling(jobId);
          }
        } else {
          this.error.set(res.message || "Failed to load job.");
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to load job details.");
        this.loading.set(false);
      },
    });
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.imageService.getJob(jobId).subscribe((res) => {
        if (res.success) {
          this.job.set(res.data);
          if (res.data.status === "DONE" || res.data.status === "FAILED") {
            this.stopPolling();
          }
        }
      });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  deleteJob(): void {
    const j = this.job();
    if (!j) return;
    if (!confirm(`Delete job for "${j.original_filename}"?`)) return;

    this.imageService.deleteJob(j.id).subscribe({
      next: () => {
        this.router.navigate(["/app/history"]);
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to delete job.");
      },
    });
  }

  downloadAll(): void {
    const j = this.job();
    if (!j) return;

    this.imageService.downloadJobBlob(j.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${j.original_filename || "images"}-resized.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error.set("Failed to download ZIP.");
      },
    });
  }

  downloadOutput(outputId: string): void {
    const j = this.job();
    if (!j) return;

    this.imageService.downloadJobBlob(j.id, outputId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = blob.type.split("/").pop() || "jpg";
        a.download = `output-${outputId.slice(0, 8)}.${ext}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error.set("Failed to download output.");
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  retryWithSameSettings(): void {
    const j = this.job();
    if (!j) return;
    const params: Record<string, string> = {};
    if (j.source_type === "URL" && j.source_url) {
      params["source_url"] = j.source_url;
    }
    this.router.navigate(["/app/resize"], { queryParams: params });
  }

  navigateToResize(): void {
    this.router.navigate(["/app/resize"]);
  }
}
