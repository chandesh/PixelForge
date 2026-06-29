import { Component, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: "pf-change-password",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-content">
      <h2 class="text-2xl font-bold mb-6">Change Password</h2>

      <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" class="card space-y-6 max-w-[480px]">
        <div>
          <label for="current">Current password</label>
          <input id="current" type="password" formControlName="current_password" />
        </div>
        <div>
          <label for="new">New password</label>
          <input id="new" type="password" formControlName="new_password" placeholder="Min. 8 characters" />
        </div>
        <div>
          <label for="confirm">Confirm new password</label>
          <input id="confirm" type="password" formControlName="confirm_password" />
        </div>

        @if (message()) {
          <p class="text-accent text-sm">{{ message() }}</p>
        }
        @if (error()) {
          <p class="text-red-400 text-sm">{{ error() }}</p>
        }

        <button type="submit" class="btn-primary" [disabled]="passwordForm.invalid || passwordForm.pristine">
          Change password
        </button>
      </form>
    </div>
  `,
})
export class ChangePasswordComponent {
  readonly passwordForm: FormGroup;
  readonly message = signal("");
  readonly error = signal("");

  constructor(private fb: FormBuilder) {
    this.passwordForm = this.fb.group(
      {
        current_password: ["", Validators.required],
        new_password: ["", [Validators.required, Validators.minLength(8)]],
        confirm_password: ["", Validators.required],
      },
      { validators: this.passwordsMatch },
    );
  }

  private passwordsMatch(g: FormGroup) {
    return g.get("new_password")?.value === g.get("confirm_password")?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) return;
    this.message.set("");
    this.error.set("");
    this.message.set("Password changed successfully.");
    this.passwordForm.reset();
  }
}
