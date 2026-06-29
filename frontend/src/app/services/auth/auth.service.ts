/**
 * Complete logout flow:
 *
 * 1. User clicks Logout button in AppShellComponent → calls authService.logout()
 * 2. AuthService.logout() POSTs refresh token to /api/auth/logout/
 * 3. Backend blacklists the refresh token (idempotent — always returns 200)
 * 4. On success OR failure (catchError), AuthService:
 *    a. Clears pixelforge_access_token and pixelforge_refresh_token from localStorage
 *    b. Clears pixelforge_user from localStorage
 *    c. Emits null on currentUser$ BehaviorSubject
 *    d. Navigates to / (home/landing page) via Angular Router
 * 5. HTTP interceptor does NOT intercept /auth/* endpoints for token refresh
 * 6. AuthGuard sees isLoggedIn() === false → redirects protected routes to /login
 * 7. HomePage (/) sees isLoggedIn() === false → shows public landing page
 */

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { BehaviorSubject, Observable, of, throwError, tap } from "rxjs";
import { catchError } from "rxjs/operators";
import { environment } from "../../../environments/environment";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: AuthUser;
    access: string;
    refresh: string;
  };
  message: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export const ACCESS_KEY = "pixelforge_access_token";
const REFRESH_KEY = "pixelforge_refresh_token";
const USER_KEY = "pixelforge_user";

@Injectable({ providedIn: "root" })
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login/`, { email, password })
      .pipe(tap((res) => this.handleAuthResponse(res)));
  }

  register(payload: RegisterPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/register/`, payload)
      .pipe(tap((res) => this.handleAuthResponse(res)));
  }

  logout(): void {
    const refresh = localStorage.getItem(REFRESH_KEY);
    const call$ = refresh
      ? this.http.post(`${this.apiUrl}/logout/`, { refresh }).pipe(
          catchError(() => of(null)),
        )
      : of(null);
    call$.subscribe(() => {
      this.clearAuth();
      this.router.navigate(["/"]);
    });
  }

  refreshToken(): Observable<any> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return throwError(() => new Error("No refresh token"));
    return this.http.post(`${this.apiUrl}/refresh/`, { refresh });
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(ACCESS_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  private handleAuthResponse(res: LoginResponse): void {
    if (res.success && res.data) {
      localStorage.setItem(ACCESS_KEY, res.data.access);
      localStorage.setItem(REFRESH_KEY, res.data.refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      this.currentUserSubject.next(res.data.user);
    }
  }

  clearAuth(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  private getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
