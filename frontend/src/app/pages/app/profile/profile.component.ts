import { Component, OnInit, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "../../../services/auth/auth.service";

@Component({
  selector: "pf-profile",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-content">
      <h2 class="text-2xl font-bold mb-6">Profile</h2>

      <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="card space-y-6 max-w-[560px]">
        <div>
          <label for="name">Full name</label>
          <input id="name" type="text" formControlName="name" />
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" />
        </div>

        @if (message()) {
          <p class="text-accent text-sm">{{ message() }}</p>
        }
        @if (error()) {
          <p class="text-red-400 text-sm">{{ error() }}</p>
        }

        <button type="submit" class="btn-primary" [disabled]="profileForm.invalid || profileForm.pristine">
          Save changes
        </button>
      </form>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  readonly profileForm: FormGroup;
  readonly message = signal("");
  readonly error = signal("");

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.profileForm = this.fb.group({
      name: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.profileForm.patchValue({ name: user.name, email: user.email });
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid || this.profileForm.pristine) return;
    this.message.set("");
    this.error.set("");
  }
}
