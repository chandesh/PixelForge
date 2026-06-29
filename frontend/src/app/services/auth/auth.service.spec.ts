import { TestBed } from "@angular/core/testing";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("login() stores tokens in localStorage on success", () => {
    service.login("alice@example.com", "pass123").subscribe(() => {
      expect(localStorage.getItem("pixelforge_access_token")).toBe("mock-access");
      expect(localStorage.getItem("pixelforge_refresh_token")).toBe("mock-refresh");
    });

    const req = httpMock.expectOne("/api/auth/login/");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ email: "alice@example.com", password: "pass123" });
    req.flush({
      success: true,
      data: {
        user: { id: "1", email: "alice@example.com", name: "Alice" },
        access: "mock-access",
        refresh: "mock-refresh",
      },
      message: "",
    });
  });

  it("login() throws on 401 response", () => {
    let error: any;
    service.login("alice@example.com", "wrong").subscribe({
      error: (e) => (error = e),
    });

    const req = httpMock.expectOne("/api/auth/login/");
    req.flush({ success: false, message: "Invalid credentials" }, { status: 401, statusText: "Unauthorized" });
    expect(error).toBeTruthy();
  });

  it("register() sends RegisterPayload and stores tokens", () => {
    const payload = {
      name: "Alice",
      email: "a@b.com",
      password: "Pass123!",
      confirm_password: "Pass123!",
    };
    service.register(payload).subscribe(() => {
      expect(localStorage.getItem("pixelforge_access_token")).toBe("reg-access");
    });

    const req = httpMock.expectOne("/api/auth/register/");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(payload);
    req.flush({
      success: true,
      data: {
        user: { id: "2", email: "a@b.com", name: "Alice" },
        access: "reg-access",
        refresh: "reg-refresh",
      },
      message: "",
    });
  });

  it("logout() POSTs refresh token, clears auth, and navigates to /", () => {
    localStorage.setItem("pixelforge_access_token", "tok");
    localStorage.setItem("pixelforge_refresh_token", "ref");
    localStorage.setItem("pixelforge_user", JSON.stringify({ id: "1", email: "a", name: "A" }));

    service.logout();
    const req = httpMock.expectOne("/api/auth/logout/");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ refresh: "ref" });
    req.flush({ success: true, data: null, message: "Logged out.", errors: null });

    expect(localStorage.getItem("pixelforge_access_token")).toBeNull();
    expect(localStorage.getItem("pixelforge_refresh_token")).toBeNull();
    expect(localStorage.getItem("pixelforge_user")).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(["/"]);
  });

  it("logout() navigates to / even when API call fails", () => {
    localStorage.setItem("pixelforge_access_token", "tok");
    localStorage.setItem("pixelforge_refresh_token", "ref");

    service.logout();
    const req = httpMock.expectOne("/api/auth/logout/");
    req.flush({ message: "Server error" }, { status: 500, statusText: "Server Error" });

    expect(localStorage.getItem("pixelforge_access_token")).toBeNull();
    expect(localStorage.getItem("pixelforge_refresh_token")).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(["/"]);
  });

  it("logout() emits null on currentUser$", () => {
    localStorage.setItem("pixelforge_access_token", "tok");
    localStorage.setItem("pixelforge_refresh_token", "ref");
    localStorage.setItem("pixelforge_user", JSON.stringify({ id: "1", email: "a", name: "A" }));

    let currentUser: any = "not-called";
    service.currentUser$.subscribe((u) => (currentUser = u));

    service.logout();
    const req = httpMock.expectOne("/api/auth/logout/");
    req.flush({ success: true, data: null, message: "Logged out.", errors: null });

    expect(currentUser).toBeNull();
  });

  it("logout() works when no refresh token is stored", () => {
    localStorage.setItem("pixelforge_access_token", "tok");

    service.logout();

    httpMock.expectNone("/api/auth/logout/");
    expect(localStorage.getItem("pixelforge_access_token")).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(["/"]);
  });

  it("isLoggedIn() returns true when token exists", () => {
    localStorage.setItem("pixelforge_access_token", "some-token");
    expect(service.isLoggedIn()).toBe(true);
  });

  it("isLoggedIn() returns false when token missing", () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it("isLoggedIn() returns false immediately after logout", () => {
    localStorage.setItem("pixelforge_access_token", "tok");
    localStorage.setItem("pixelforge_refresh_token", "ref");
    expect(service.isLoggedIn()).toBe(true);

    service.logout();
    const req = httpMock.expectOne("/api/auth/logout/");
    req.flush({ success: true, data: null, message: "Logged out.", errors: null });

    expect(service.isLoggedIn()).toBe(false);
  });

  it("getAccessToken() returns stored token string", () => {
    localStorage.setItem("pixelforge_access_token", "my-token");
    expect(service.getAccessToken()).toBe("my-token");
  });

  it("getAccessToken() returns null when no token stored", () => {
    expect(service.getAccessToken()).toBeNull();
  });
});
