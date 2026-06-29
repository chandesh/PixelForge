import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "../services/auth/auth.service";

class MockAuthService {
  private _loggedIn = false;
  isLoggedIn() {
    return this._loggedIn;
  }
  setLoggedIn(val: boolean) {
    this._loggedIn = val;
  }
}

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let authService: MockAuthService;
  let router: Router;

  beforeEach(() => {
    authService = new MockAuthService();
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: { parseUrl: (url: string) => url },
        },
      ],
    });
    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it("allows navigation when isLoggedIn() returns true", () => {
    authService.setLoggedIn(true);
    const result = guard.canActivate();
    expect(result).toBe(true);
  });

  it("redirects to /login when isLoggedIn() returns false", () => {
    authService.setLoggedIn(false);
    const result = guard.canActivate();
    expect(result).toBe("/login");
  });
});
