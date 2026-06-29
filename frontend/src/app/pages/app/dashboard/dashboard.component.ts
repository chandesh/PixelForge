import { Component, OnInit, signal, computed } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { DatePipe } from "@angular/common";
import { ImageService, DashboardStats } from "../../../services/image/image.service";

@Component({
  selector: "pf-dashboard",
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Dashboard</h2>
        <a routerLink="/app/resize" class="btn-primary">+ Resize New Image</a>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (_ of [1,2,3,4]; track _) {
            <div class="card h-24 animate-pulse">
              <div class="h-3 bg-surface-light rounded w-20 mb-3 mt-2"></div>
              <div class="h-8 bg-surface-light rounded w-16"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="card text-center py-8">
          <p class="text-red-400">{{ error() }}</p>
          <button (click)="loadStats()" class="btn-secondary mt-4">Retry</button>
        </div>
      } @else if (stats()) {
        @let s = stats()!;
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card">
            <p class="text-text-secondary text-sm mb-1">Total Jobs</p>
            <p class="text-3xl font-bold">{{ s.total_jobs }}</p>
            @if (s.jobs_this_week > 0) {
              <p class="text-xs text-accent mt-1">+{{ s.jobs_this_week }} this week</p>
            }
          </div>
          <div class="card">
            <p class="text-text-secondary text-sm mb-1">Images Processed</p>
            <p class="text-3xl font-bold">{{ s.total_outputs }}</p>
          </div>
          <div class="card">
            <p class="text-text-secondary text-sm mb-1">Storage Used</p>
            <p class="text-3xl font-bold">{{ s.storage_used_display }}</p>
          </div>
          <div class="card">
            <p class="text-text-secondary text-sm mb-1">Status</p>
            @if (statusLabel(); as sl) {
              <p class="text-3xl font-bold" [class]="sl.color">{{ sl.label }}</p>
            }
          </div>
        </div>

        <!-- Status Breakdown -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (item of breakdownItems(); track item.key) {
            <div class="card flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" [class]="item.bg">
                <span class="text-lg font-bold" [class]="item.color">{{ item.count }}</span>
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wider">{{ item.label }}</p>
                @if (s.total_jobs > 0) {
                  <p class="text-xs text-text-muted">{{ (item.count / s.total_jobs * 100).toFixed(0) }}%</p>
                }
              </div>
            </div>
          }
        </div>

        <!-- Most Used -->
        @if (s.most_used_preset || s.most_used_category) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @if (stats()?.most_used_preset; as p) {
              <div class="card">
                <p class="text-xs text-text-secondary uppercase tracking-wider mb-1">Most Used Preset</p>
                <p class="text-lg font-semibold">{{ p.name }}</p>
                <p class="text-xs text-text-muted">{{ p.category }} · {{ p.count }} times</p>
              </div>
            }
            @if (stats()?.most_used_category; as c) {
              <div class="card">
                <p class="text-xs text-text-secondary uppercase tracking-wider mb-1">Most Used Category</p>
                <p class="text-lg font-semibold">{{ c.name }}</p>
                <p class="text-xs text-text-muted">{{ c.count }} outputs</p>
              </div>
            }
          </div>
        }

        <!-- Recent Jobs -->
        <div>
          <h3 class="text-lg font-semibold mb-4">Recent Jobs</h3>
          <div class="card p-0 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border text-text-secondary text-left">
                  <th class="px-6 py-4 font-medium">Filename</th>
                  <th class="px-6 py-4 font-medium hidden sm:table-cell">Thumbnail</th>
                  <th class="px-6 py-4 font-medium">Status</th>
                  <th class="px-6 py-4 font-medium">Date</th>
                  <th class="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (job of stats()?.recent_jobs || []; track job.id) {
                  <tr class="border-b border-border last:border-0 hover:bg-surface-light/30">
                    <td class="px-6 py-4 max-w-[200px] truncate">{{ job.original_filename }}</td>
                    <td class="px-6 py-4 hidden sm:table-cell">
                      @if (job.thumbnail_url) {
                        <img [src]="job.thumbnail_url" alt="" class="w-12 h-8 object-cover rounded" />
                      } @else {
                        <span class="text-text-muted text-xs">—</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="statusClass(job.status)" class="px-2 py-1 rounded text-xs font-medium">{{ job.status }}</span>
                    </td>
                    <td class="px-6 py-4 text-text-secondary">{{ job.created_at | date:'medium' }}</td>
                    <td class="px-6 py-4">
                      <button (click)="viewJob(job.id)" class="text-text-secondary hover:text-accent text-sm">View</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-text-muted">
                      No jobs yet.
                      <a routerLink="/app/resize" class="text-accent hover:underline">Create your first resize</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly stats = signal<DashboardStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");

  readonly breakdownItems = computed(() => {
    const s = this.stats();
    const b = s?.status_breakdown;
    return [
      { key: "DONE", label: "Done", count: b?.DONE || 0, bg: "bg-accent/10", color: "text-accent" },
      { key: "FAILED", label: "Failed", count: b?.FAILED || 0, bg: "bg-red-500/10", color: "text-red-400" },
      { key: "PROCESSING", label: "Processing", count: b?.PROCESSING || 0, bg: "bg-blue-500/10", color: "text-blue-400" },
      { key: "PENDING", label: "Pending", count: b?.PENDING || 0, bg: "bg-yellow-500/10", color: "text-yellow-400" },
    ];
  });

  readonly statusLabel = computed(() => {
    const s = this.stats();
    if (!s) return null;
    const b = s.status_breakdown;
    const hasPending = b.PENDING > 0 || b.PROCESSING > 0;
    const hasFailed = b.FAILED > 0;
    const totalActive = b.PENDING + b.PROCESSING + b.FAILED;
    if (hasFailed && !hasPending) return { label: "Issues", color: "text-red-400" };
    if (hasPending) return { label: "Active", color: "text-blue-400" };
    if (s.total_jobs === 0) return { label: "Idle", color: "text-text-muted" };
    return { label: "Operational", color: "text-accent" };
  });

  constructor(
    private imageService: ImageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set("");

    this.imageService.getDashboardStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.stats.set(res.data);
        } else {
          this.error.set(res.message || "Failed to load stats.");
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Failed to load dashboard stats.");
        this.loading.set(false);
      },
    });
  }

  viewJob(jobId: string): void {
    this.router.navigate(["/app/jobs", jobId]);
  }

  statusClass(status: string): string {
    switch (status.toUpperCase()) {
      case "DONE": return "bg-accent/10 text-accent";
      case "PROCESSING": return "bg-blue-500/10 text-blue-400";
      case "FAILED": return "bg-red-500/10 text-red-400";
      default: return "bg-yellow-500/10 text-yellow-400";
    }
  }
}
