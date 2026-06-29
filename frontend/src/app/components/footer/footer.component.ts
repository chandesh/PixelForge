import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "pf-footer",
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="bg-surface border-t border-border py-12 px-6">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div class="flex items-center gap-2 text-lg font-bold mb-4">
              <span class="diamond-icon"></span>
              <span>PixelForge</span>
            </div>
            <p class="text-text-secondary text-sm">Intelligent image resizing for modern teams.</p>
          </div>
          <div>
            <h4 class="font-semibold mb-3 text-sm uppercase tracking-wider text-text-secondary">Product</h4>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">Features</a></li>
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">Pricing</a></li>
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">API</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-3 text-sm uppercase tracking-wider text-text-secondary">Company</h4>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">About</a></li>
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">Blog</a></li>
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-3 text-sm uppercase tracking-wider text-text-secondary">Legal</h4>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">Privacy</a></li>
              <li><a routerLink="/" class="text-text-muted hover:text-accent transition">Terms</a></li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-border text-center text-text-muted text-sm">
          &copy; 2026 PixelForge. All rights reserved.
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
