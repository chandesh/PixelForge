import { Component, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService, RegisterPayload } from "../../services/auth/auth.service";

@Component({
  selector: "pf-register",
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
          <h1 class="text-2xl font-bold">Create your account</h1>
          <p class="text-text-secondary mt-2">Start resizing images in seconds</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="card space-y-6">
          <div>
            <label for="name">Full name</label>
            <input id="name" type="text" formControlName="name" placeholder="John Doe" />
          </div>
          <div>
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="you@example.com" />
          </div>
          <div>
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" placeholder="Min. 8 characters" />
          </div>
          <div>
            <label for="confirmPassword">Confirm password</label>
            <input id="confirmPassword" type="password" formControlName="confirmPassword" placeholder="Repeat your password" />
          </div>

          @if (error()) {
            <p class="text-red-400 text-sm">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary w-full justify-center" [disabled]="registerForm.invalid">
            Create account
          </button>

          <p class="text-center text-text-secondary text-sm">
            Already have an account?
            <a routerLink="/login" class="text-accent hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  readonly registerForm: FormGroup;
  readonly error = signal("");

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.registerForm = this.fb.group(
      {
        name: ["", Validators.required],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(8)]],
        confirmPassword: ["", Validators.required],
      },
      { validators: this.passwordsMatch },
    );
  }

  private passwordsMatch(g: FormGroup) {
    return g.get("password")?.value === g.get("confirmPassword")?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    this.error.set("");
    const payload: RegisterPayload = {
      name: this.registerForm.value.name,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      confirm_password: this.registerForm.value.confirmPassword,
    };
    this.authService.register(payload).subscribe({
      next: () => this.router.navigate(["/app/dashboard"]),
      error: (err) => {
        const errors = err.error?.errors || err.error;
        const firstError =
          errors?.email?.[0] ||
          errors?.password?.[0] ||
          errors?.confirm_password?.[0] ||
          errors?.name?.[0] ||
          errors?.non_field_errors?.[0] ||
          err.error?.message ||
          "Registration failed. Please try again.";
        this.error.set(firstError);
      },
    });
  }
}
