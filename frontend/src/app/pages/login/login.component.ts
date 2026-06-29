import { Component, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth/auth.service";

@Component({
  selector: "pf-login",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-primary-dark flex items-center justify-center px-6">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <a routerLink="/" class="inline-flex items-center gap-2 text-2xl font-bold mb-6">
            <span class="diamond-icon"></span>
            <span>PixelForge</span>
          </a>
          <h1 class="text-2xl font-bold">Welcome back</h1>
          <p class="text-text-secondary mt-2">Sign in to your account</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="card space-y-6">
          <div>
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="you@example.com" />
          </div>
          <div>
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" placeholder="Enter your password" />
          </div>

          @if (error()) {
            <p class="text-red-400 text-sm">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary w-full justify-center" [disabled]="loginForm.invalid">
            Sign in
          </button>

          <p class="text-center text-text-secondary text-sm">
            Don't have an account?
            <a routerLink="/register" class="text-accent hover:underline">Create one</a>
          </p>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly loginForm: FormGroup;
  readonly error = signal("");

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.error.set("");
    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: () => this.router.navigate(["/app/dashboard"]),
      error: () => this.error.set("Invalid email or password."),
    });
  }
}
