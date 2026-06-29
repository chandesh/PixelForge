import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { HomeComponent } from "./home.component";
import { AuthService } from "../../services/auth/auth.service";

class MockAuthService {
  isLoggedIn() {
    return false;
  }
}

describe("HomeComponent", () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([{ path: "", component: HomeComponent }]),
        { provide: AuthService, useClass: MockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("renders call-to-action heading", () => {
    const heading = fixture.debugElement.query(By.css("h1"));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.textContent).toContain("speed of thought");
  });

  it("shows login and register CTA buttons for unauthenticated users", () => {
    const buttons = fixture.debugElement.queryAll(By.css("a"));
    const text = buttons.map((b) => b.nativeElement.textContent.toLowerCase());
    expect(text.some((t) => t.includes("get started") || t.includes("sign up"))).toBe(true);
  });

  it("renders feature section with at least one feature card", () => {
    const cards = fixture.debugElement.queryAll(By.css(".card"));
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });
});
