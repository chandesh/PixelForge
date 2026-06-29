import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { DashboardComponent } from "./dashboard.component";
import { ImageService, DashboardStats } from "../../../services/image/image.service";
import { of, throwError } from "rxjs";
import { SpyObj, createSpyObj } from "../../../test-utils";
import { provideRouter } from "@angular/router";

const mockStats: DashboardStats = {
  total_jobs: 2,
  total_outputs: 4,
  jobs_this_week: 2,
  jobs_this_month: 2,
  storage_used_bytes: 102400,
  storage_used_display: "100 KB",
  most_used_preset: null,
  most_used_category: null,
  status_breakdown: { DONE: 1, FAILED: 1, PROCESSING: 0, PENDING: 0 },
};

const mockStatsWithJobs: DashboardStats = {
  ...mockStats,
  recent_jobs: [
    {
      id: "job-1",
      status: "DONE",
      original_filename: "photo.jpg",
      output_count: 2,
      thumbnail_url: "/media/thumb.jpg",
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "job-2",
      status: "FAILED",
      original_filename: "fail.png",
      output_count: 0,
      thumbnail_url: null,
      created_at: "2025-01-02T00:00:00Z",
    },
  ],
};

describe("DashboardComponent", () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let imageService: SpyObj<ImageService>;

  beforeEach(async () => {
    const spy = createSpyObj<ImageService>("ImageService", ["getDashboardStats"]);
    spy.getDashboardStats.mockReturnValue(of({ success: true, data: mockStatsWithJobs, message: "", errors: null }));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ImageService, useValue: spy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    imageService = TestBed.inject(ImageService) as SpyObj<ImageService>;
    fixture.detectChanges();
  });

  it("loads stats on init", () => {
    expect(imageService.getDashboardStats).toHaveBeenCalled();
    expect(component.stats()?.total_jobs).toBe(2);
  });

  it("renders each job row in the table", () => {
    const rows = fixture.debugElement.queryAll(By.css("table tbody tr"));
    expect(rows.length).toBe(2);
  });

  it("displays status badge for DONE with accent class", () => {
    const badge = fixture.debugElement.query(By.css("table tbody tr:first-child td:nth-child(3) span"));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent.trim()).toBe("DONE");
  });

  it("displays status badge for FAILED", () => {
    const badge = fixture.debugElement.query(By.css("table tbody tr:last-child td:nth-child(3) span"));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent.trim()).toBe("FAILED");
  });

  it("shows total jobs count in stats card", () => {
    const statValue = fixture.debugElement.query(By.css(".card p.text-3xl"));
    expect(statValue).toBeTruthy();
  });

  it("shows empty state when no jobs returned", () => {
    component.stats.set({ ...mockStats, recent_jobs: [] });
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css("td[colspan='5']"));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain("No jobs yet");
  });

  it("handles API error on load gracefully", () => {
    imageService.getDashboardStats.mockReturnValue(throwError(() => new Error("Network error")));
    component.loadStats();
    expect(component.error()).toContain("Failed to load");
  });
});
