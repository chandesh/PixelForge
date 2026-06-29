import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { LoginComponent } from "./login.component";
import { AuthService } from "../../services/auth/auth.service";
import { of, throwError } from "rxjs";

class MockAuthService {
  login(email: string, password: string) {
    return of({ success: true, data: { user: { id: "1", email, name: "Test" }, access: "tok", refresh: "ref" }, message: "" });
  }
}

describe("LoginComponent", () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: MockAuthService;

  beforeEach(async () => {
    authService = new MockAuthService();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("renders email and password fields", () => {
    const emailInput = fixture.debugElement.query(By.css("input[type='email']"));
    const passwordInput = fixture.debugElement.query(By.css("input[type='password']"));
    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
  });

  it("shows validation errors on empty submit", () => {
    component.loginForm.markAllAsTouched();
    component.onSubmit();
    expect(component.loginForm.invalid).toBe(true);
  });

  it("calls AuthService.login with correct credentials on valid submit", () => {
    const spy = vi.spyOn(authService, "login");
    component.loginForm.setValue({ email: "a@b.com", password: "secret" });
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith("a@b.com", "secret");
  });

  it("shows error message on 401 response", () => {
    vi.spyOn(authService, "login").mockReturnValue(throwError(() => new Error("Invalid")));
    component.loginForm.setValue({ email: "a@b.com", password: "wrong" });
    component.onSubmit();
    fixture.detectChanges();
    expect(component.error()).toBe("Invalid email or password.");
  });

  it("disables submit button while form is invalid", () => {
    component.loginForm.setValue({ email: "", password: "" });
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css("button[type='submit']"));
    expect(btn.nativeElement.disabled).toBe(true);
  });

  it("navigates to /app/dashboard on successful login", () => {
    const routerSpy = vi.spyOn((component as any).router, "navigate");
    component.loginForm.setValue({ email: "a@b.com", password: "pass" });
    component.onSubmit();
    expect(routerSpy).toHaveBeenCalledWith(["/app/dashboard"]);
  });
});
