import { TestBed } from "@angular/core/testing";
import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { authInterceptor } from "./auth.interceptor";

describe("authInterceptor", () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("shares one refresh request across concurrent 401 responses", () => {
    localStorage.setItem("pixelforge_access_token", "expired-access");
    localStorage.setItem("pixelforge_refresh_token", "old-refresh");

    let firstStatus: number | undefined;
    let secondStatus: number | undefined;
    http.get("/api/jobs/1").subscribe({
      next: (response) => (firstStatus = (response as { status?: number }).status),
    });
    http.get("/api/jobs/2").subscribe({
      next: (response) => (secondStatus = (response as { status?: number }).status),
    });

    const first = httpMock.expectOne("/api/jobs/1");
    const second = httpMock.expectOne("/api/jobs/2");
    expect(first.request.headers.get("Authorization")).toBe("Bearer expired-access");

    first.flush({}, { status: 401, statusText: "Unauthorized" });
    second.flush({}, { status: 401, statusText: "Unauthorized" });

    const refresh = httpMock.expectOne("/api/auth/refresh/");
    expect(refresh.request.body).toEqual({ refresh: "old-refresh" });
    refresh.flush({ access: "new-access", refresh: "new-refresh" });

    const retriedFirst = httpMock.expectOne("/api/jobs/1");
    const retriedSecond = httpMock.expectOne("/api/jobs/2");
    expect(retriedFirst.request.headers.get("Authorization")).toBe("Bearer new-access");
    expect(retriedSecond.request.headers.get("Authorization")).toBe("Bearer new-access");

    retriedFirst.flush({ status: 200 });
    retriedSecond.flush({ status: 200 });

    expect(firstStatus).toBe(200);
    expect(secondStatus).toBe(200);
    expect(localStorage.getItem("pixelforge_access_token")).toBe("new-access");
    expect(localStorage.getItem("pixelforge_refresh_token")).toBe("new-refresh");
  });

  it("logs out and redirects when refresh fails", () => {
    localStorage.setItem("pixelforge_access_token", "expired-access");
    localStorage.setItem("pixelforge_refresh_token", "old-refresh");

    let errored = false;
    http.get("/api/jobs/1").subscribe({ error: () => (errored = true) });

    httpMock.expectOne("/api/jobs/1").flush({}, { status: 401, statusText: "Unauthorized" });
    httpMock.expectOne("/api/auth/refresh/").flush(
      { detail: "Token is invalid or expired" },
      { status: 401, statusText: "Unauthorized" },
    );

    const logout = httpMock.expectOne("/api/auth/logout/");
    logout.flush({ success: true, data: null, message: "Logged out.", errors: null });

    expect(errored).toBe(true);
    expect(authService.getAccessToken()).toBeNull();
  });
});
