import { TestBed } from "@angular/core/testing";
import "../../../test-setup";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { ImageService } from "./image.service";

describe("ImageService", () => {
  let service: ImageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        ImageService,
      ],
    });
    service = TestBed.inject(ImageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("getPresets() returns grouped preset data from API", () => {
    const mockResponse = {
      success: true,
      data: {
        WALLPAPER: [{ id: "1", name: "Desktop HD", slug: "dh", width: 1920, height: 1080, category: "WALLPAPER", description: "" }],
      },
      message: "",
      errors: null,
    };

    service.getPresets().subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.data["WALLPAPER"].length).toBe(1);
    });

    const req = httpMock.expectOne("/api/presets/");
    expect(req.request.method).toBe("GET");
    req.flush(mockResponse);
  });

  it("getJobs() returns paginated list", () => {
    const mockResponse = {
      success: true,
      data: { results: [], count: 0, page: 1, page_size: 20, total_pages: 1 },
      message: "",
      errors: null,
    };

    service.getJobs({ page: 1 }).subscribe((res) => {
      expect(res.data.total_pages).toBe(1);
    });

    const req = httpMock.expectOne("/api/jobs/?page=1");
    expect(req.request.method).toBe("GET");
    req.flush(mockResponse);
  });

  it("deleteJob() calls correct DELETE endpoint", () => {
    const mockResponse = { success: true, data: null, message: "Job deleted.", errors: null };

    service.deleteJob("job-123").subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne("/api/jobs/job-123/");
    expect(req.request.method).toBe("DELETE");
    req.flush(mockResponse);
  });

  it("createJob() with file sends FormData", () => {
    const file = new File(["data"], "test.png", { type: "image/png" });
    const payload = { source_type: "UPLOAD" as const, preset_ids: ["p1"], custom_sizes: [] };

    service.createJob(payload, file).subscribe();

    const req = httpMock.expectOne("/api/jobs/");
    expect(req.request.method).toBe("POST");
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ success: true, data: { id: "new-job" }, message: "", errors: null });
  });

  it("createJob() without file sends JSON", () => {
    const payload = {
      source_type: "URL" as const,
      source_url: "https://example.com/img.jpg",
      preset_ids: ["p1"],
      custom_sizes: [],
    };

    service.createJob(payload).subscribe();

    const req = httpMock.expectOne("/api/jobs/");
    expect(req.request.method).toBe("POST");
    expect(req.request.body instanceof FormData).toBe(false);
    expect(req.request.body.source_type).toBe("URL");
    req.flush({ success: true, data: { id: "new-job" }, message: "", errors: null });
  });

  it("getJob() fetches single job by id", () => {
    service.getJob("job-1").subscribe();

    const req = httpMock.expectOne("/api/jobs/job-1/");
    expect(req.request.method).toBe("GET");
    req.flush({ success: true, data: { id: "job-1" }, message: "", errors: null });
  });

  it("getCustomPresets() calls GET /api/presets/custom/", () => {
    service.getCustomPresets().subscribe();

    const req = httpMock.expectOne("/api/presets/custom/");
    expect(req.request.method).toBe("GET");
    req.flush({ success: true, data: [], message: "", errors: null });
  });

  it("createCustomPreset() calls POST /api/presets/custom/", () => {
    service.createCustomPreset({ name: "Test", width: 100, height: 200 }).subscribe();

    const req = httpMock.expectOne("/api/presets/custom/");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ name: "Test", width: 100, height: 200 });
    req.flush({ success: true, data: { id: "new", name: "Test", width: 100, height: 200 }, message: "", errors: null });
  });

  it("updateCustomPreset() calls PUT /api/presets/custom/{id}/", () => {
    service.updateCustomPreset("c1", { name: "Updated", width: 300, height: 400 }).subscribe();

    const req = httpMock.expectOne("/api/presets/custom/c1/");
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({ name: "Updated", width: 300, height: 400 });
    req.flush({ success: true, data: { id: "c1", name: "Updated", width: 300, height: 400 }, message: "", errors: null });
  });

  it("deleteCustomPreset() calls DELETE /api/presets/custom/{id}/", () => {
    service.deleteCustomPreset("c1").subscribe();

    const req = httpMock.expectOne("/api/presets/custom/c1/");
    expect(req.request.method).toBe("DELETE");
    req.flush({ success: true, data: null, message: "Deleted.", errors: null });
  });
});
