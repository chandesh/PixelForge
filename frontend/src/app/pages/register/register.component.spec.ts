import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { RegisterComponent } from "./register.component";
import { AuthService } from "../../services/auth/auth.service";
import { of, throwError } from "rxjs";

class MockAuthService {
  register(_payload: any) {
    return of({ success: true, data: { user: { id: "1", name: "Alice", email: "a@b.com" }, access: "tok", refresh: "ref" }, message: "" });
  }
}

describe("RegisterComponent", () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: MockAuthService;

  beforeEach(async () => {
    authService = new MockAuthService();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("renders name, email, password, and confirmPassword fields", () => {
    const nameInput = fixture.debugElement.query(By.css("input[formControlName='name']"));
    const emailInput = fixture.debugElement.query(By.css("input[formControlName='email']"));
    const passwordInput = fixture.debugElement.query(By.css("input[formControlName='password']"));
    const confirmInput = fixture.debugElement.query(By.css("input[formControlName='confirmPassword']"));
    expect(nameInput).toBeTruthy();
    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(confirmInput).toBeTruthy();
  });

  it("shows validation errors on empty submit", () => {
    component.registerForm.markAllAsTouched();
    component.onSubmit();
    expect(component.registerForm.invalid).toBe(true);
  });

  it("calls AuthService.register with correct payload on valid submit", () => {
    const spy = vi.spyOn(authService, "register");
    component.registerForm.setValue({ name: "Alice", email: "a@b.com", password: "Pass123!", confirmPassword: "Pass123!" });
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith({
      name: "Alice",
      email: "a@b.com",
      password: "Pass123!",
      confirm_password: "Pass123!",
    });
  });

  it("shows error message on API failure", () => {
    const errResponse = { error: { errors: { confirm_password: ["Passwords don't match"] } } };
    vi.spyOn(authService, "register").mockReturnValue(throwError(() => errResponse));
    component.registerForm.setValue({ name: "A", email: "taken@b.com", password: "Pass123!", confirmPassword: "Pass123!" });
    component.onSubmit();
    fixture.detectChanges();
    expect(component.error()).toContain("Passwords don't match");
  });

  it("fails validation when passwords do not match", () => {
    component.registerForm.setValue({ name: "A", email: "a@b.com", password: "Pass123!", confirmPassword: "Different1!" });
    expect(component.registerForm.hasError("mismatch")).toBe(true);
  });

  it("navigates to /app/dashboard on successful registration", () => {
    const routerSpy = vi.spyOn((component as any).router, "navigate");
    component.registerForm.setValue({ name: "A", email: "a@b.com", password: "Pass123!", confirmPassword: "Pass123!" });
    component.onSubmit();
    expect(routerSpy).toHaveBeenCalledWith(["/app/dashboard"]);
  });
});
