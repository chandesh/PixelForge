import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { NavbarComponent } from "./navbar.component";

describe("NavbarComponent", () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("renders the PixelForge brand link", () => {
    const brandLink = fixture.debugElement.query(By.css("nav a[routerLink='/']"));
    expect(brandLink).toBeTruthy();
    expect(brandLink.nativeElement.textContent).toContain("PixelForge");
  });

  it("renders the accent diamond icon", () => {
    const diamond = fixture.debugElement.query(By.css("nav .diamond-icon"));
    expect(diamond).toBeTruthy();
  });

  it("renders Log in link with routerLink /login", () => {
    const loginLink = fixture.debugElement.query(By.css("a[routerLink='/login']"));
    expect(loginLink).toBeTruthy();
    expect(loginLink.nativeElement.textContent).toContain("Log in");
  });

  it("renders Get Started link with routerLink /register", () => {
    const registerLink = fixture.debugElement.query(By.css("a[routerLink='/register']"));
    expect(registerLink).toBeTruthy();
    expect(registerLink.nativeElement.textContent).toContain("Get Started");
  });
});
