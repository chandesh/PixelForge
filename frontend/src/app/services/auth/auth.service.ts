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

export interface RefreshResponse {
  access: string;
  refresh?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export const ACCESS_KEY = "pixelforge_access_token";
export const REFRESH_KEY = "pixelforge_refresh_token";
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

  logout(redirectTo = "/"): void {
    const refresh = localStorage.getItem(REFRESH_KEY);
    const call$ = refresh
      ? this.http.post(`${this.apiUrl}/logout/`, { refresh }).pipe(
          catchError(() => of(null)),
        )
      : of(null);

    call$.subscribe(() => {
      this.clearAuth();
      this.router.navigate([redirectTo]);
    });
  }

  refreshToken(): Observable<RefreshResponse> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return throwError(() => new Error("No refresh token"));
    return this.http
      .post<RefreshResponse>(`${this.apiUrl}/refresh/`, { refresh })
      .pipe(tap((res) => this.storeTokens(res.access, res.refresh)));
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(ACCESS_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  storeTokens(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  }

  private handleAuthResponse(res: LoginResponse): void {
    if (res.success && res.data) {
      this.storeTokens(res.data.access, res.data.refresh);
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
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<AuthUser>;
      if (typeof parsed?.id !== "string" || typeof parsed?.email !== "string") {
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return {
        id: parsed.id,
        email: parsed.email,
        name: typeof parsed.name === "string" ? parsed.name : "",
      };
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
