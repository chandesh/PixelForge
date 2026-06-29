import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "pf-navbar",
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="fixed top-0 left-0 right-0 z-50 bg-primary-dark/80 backdrop-blur-md border-b border-border">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-3 text-xl font-bold tracking-tight">
          <span class="diamond-icon"></span>
          <span>PixelForge</span>
        </a>
        <div class="flex items-center gap-4">
          <a routerLink="/login" class="btn-secondary text-sm py-2 px-4">Log in</a>
          <a routerLink="/register" class="btn-primary text-sm py-2 px-4">Get Started</a>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {}
