import { Component, OnInit, signal } from "@angular/core";
import { DatePipe, SlicePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ImageService, ResizeJob } from "../../../services/image/image.service";

@Component({
  selector: "pf-history",
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule, MatTooltipModule],
  styles: `
    .filename-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filename-thumb {
      width: 36px;
      height: 36px;
      object-fit: cover;
      border-radius: 6px;
      flex-shrink: 0;
      background: var(--pf-surface-light);
    }
    .filename-thumb--fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--pf-text-muted);
    }
    .filename-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
  `,
  template: `
    <div class="page-content--wide">
      <h2 class="text-2xl font-bold mb-6">Job History</h2>

      <div class="flex gap-4 mb-6 flex-wrap">
        <input type="text" placeholder="Search by filename..." [(ngModel)]="search" (input)="loadJobs()"
               class="max-w-xs" />
        <select [(ngModel)]="statusFilter" (change)="loadJobs()" class="max-w-[160px]">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="DONE">Done</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div class="card p-0 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-text-secondary text-left">
              <th class="px-6 py-4 font-medium">Filename</th>
              <th class="px-6 py-4 font-medium">Status</th>
              <th class="px-6 py-4 font-medium">Dimensions</th>
              <th class="px-6 py-4 font-medium">Outputs</th>
              <th class="px-6 py-4 font-medium">Date</th>
              <th class="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (job of jobs(); track job.id) {
              <tr class="border-b border-border hover:bg-surface-light/30 cursor-pointer" (click)="toggleExpand(job)">
                <td class="px-6 py-4">
                  <div class="filename-cell">
                    @if (job.thumbnail_url) {
                      <img [src]="job.thumbnail_url" class="filename-thumb"
                           (error)="onThumbError($event)" />
                    } @else {
                      <div class="filename-thumb filename-thumb--fallback">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                    }
                    <span class="filename-text">{{ job.original_filename }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span [class]="statusClass(job.status)" class="px-2 py-1 rounded text-xs font-medium"
                        [matTooltip]="job.status === 'FAILED' ? (job.error_message | slice:0:120) : ''"
                        [matTooltipDisabled]="job.status !== 'FAILED'"
                        matTooltipPosition="above">{{ job.status }}</span>
                </td>
                <td class="px-6 py-4 text-text-secondary">
                  {{ job.original_width || '—' }} × {{ job.original_height || '—' }}
                </td>
                <td class="px-6 py-4 text-text-secondary">{{ job.output_count }}</td>
                <td class="px-6 py-4 text-text-secondary">{{ job.created_at | date:'medium' }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <button (click)="viewJob(job); $event.stopPropagation()" class="text-text-secondary hover:text-accent text-sm">View</button>
                    <button (click)="deleteJob(job); $event.stopPropagation()" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
                  </div>
                </td>
              </tr>
              @if (expandedId() === job.id) {
                <tr>
                  <td colspan="6" class="px-6 py-4 bg-surface-light/20">
                    <p class="text-text-muted text-xs">Output details not yet loaded.</p>
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="6" class="px-6 py-8 text-center text-text-muted">No jobs found.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="flex items-center justify-between mt-6">
          <button class="btn-secondary text-sm py-2 px-4" (click)="prevPage()"
                  [class.opacity-50]="page() <= 1">← Previous</button>
          <span class="text-text-secondary text-sm">Page {{ page() }} of {{ totalPages() }}</span>
          <button class="btn-secondary text-sm py-2 px-4" (click)="nextPage()"
                  [class.opacity-50]="page() >= totalPages()">Next →</button>
        </div>
      }
    </div>
  `,
})
export class HistoryComponent implements OnInit {
  readonly jobs = signal<ResizeJob[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly expandedId = signal<string | null>(null);

  search = "";
  statusFilter = "";

  constructor(
    private imageService: ImageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.imageService
      .getJobs({
        page: this.page(),
        page_size: 10,
        status: this.statusFilter || undefined,
        search: this.search || undefined,
      })
      .subscribe((res) => {
        if (res.success) {
          this.jobs.set(res.data.results);
          this.totalPages.set(res.data.total_pages);
        }
      });
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadJobs();
    }
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadJobs();
    }
  }

  toggleExpand(job: ResizeJob): void {
    this.expandedId.update((id) => (id === job.id ? null : job.id));
  }

  viewJob(job: ResizeJob): void {
    this.router.navigate(["/app/jobs", job.id]);
  }

  deleteJob(job: ResizeJob): void {
    if (confirm(`Delete job for "${job.original_filename}"?`)) {
      this.imageService.deleteJob(job.id).subscribe(() => this.loadJobs());
    }
  }

  onThumbError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = "none";
  }

  statusClass(status: string): string {
    switch (status) {
      case "DONE": return "bg-accent/10 text-accent";
      case "PROCESSING": return "bg-blue-500/10 text-blue-400";
      case "FAILED": return "bg-red-500/10 text-red-400";
      default: return "bg-yellow-500/10 text-yellow-400";
    }
  }
}
