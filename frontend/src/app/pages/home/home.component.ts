import { Component, OnInit } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth/auth.service";
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { FooterComponent } from "../../components/footer/footer.component";

interface PresetCategory {
  name: string;
  iconClass: string;
  presets: { name: string; dimensions: string }[];
}

@Component({
  selector: "pf-home",
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  template: `
    <pf-navbar></pf-navbar>

    <main>
      <section class="min-h-[90vh] flex items-center justify-center px-6 pt-16">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Resize images at<br />
            <span class="text-accent">the speed of thought</span>
          </h1>
          <p class="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            Upload once, export in every size you need. 40+ presets, batch processing,
            and cloud storage — all in one streamlined workflow.
          </p>
          <div class="flex items-center justify-center gap-4">
            <a routerLink="/register" class="btn-primary text-lg px-8 py-4">Get Started Free</a>
            <a routerLink="/login" class="btn-secondary text-lg px-8 py-4">View Demo</a>
          </div>
        </div>
      </section>

      <section class="py-24 px-6">
        <div class="max-w-7xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-16">Resize for any platform</h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (cat of categories; track cat.name) {
              <div class="card">
                <div class="cat-icon {{ cat.iconClass }}"></div>
                <h3 class="text-lg font-semibold mb-3">{{ cat.name }}</h3>
                <ul class="space-y-2">
                  @for (p of cat.presets; track p.name) {
                    <li class="text-sm text-text-secondary flex justify-between">
                      <span>{{ p.name }}</span>
                      <span class="text-text-muted">{{ p.dimensions }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-24 px-6 bg-surface">
        <div class="max-w-5xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-16">How it works</h2>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="w-14 h-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                <span class="text-accent font-bold text-xl">1</span>
              </div>
              <h3 class="text-lg font-semibold mb-2">Upload your image</h3>
              <p class="text-text-secondary text-sm">Drag and drop or paste a URL. We support JPG, PNG, WebP, and more.</p>
            </div>
            <div class="text-center">
              <div class="w-14 h-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                <span class="text-accent font-bold text-xl">2</span>
              </div>
              <h3 class="text-lg font-semibold mb-2">Select your sizes</h3>
              <p class="text-text-secondary text-sm">Pick from 40+ presets or define custom dimensions. Select as many as you need.</p>
            </div>
            <div class="text-center">
              <div class="w-14 h-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                <span class="text-accent font-bold text-xl">3</span>
              </div>
              <h3 class="text-lg font-semibold mb-2">Download results</h3>
              <p class="text-text-secondary text-sm">Your resized images are ready in seconds. Download individually or as a ZIP.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="py-24 px-6">
        <div class="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card text-center">
            <div class="feature-icon feature-icon-batch"></div>
            <h3 class="font-semibold mb-2">Batch Resize</h3>
            <p class="text-text-secondary text-sm">Resize one image to multiple sizes in a single operation.</p>
          </div>
          <div class="card text-center">
            <div class="feature-icon feature-icon-presets"></div>
            <h3 class="font-semibold mb-2">40+ Presets</h3>
            <p class="text-text-secondary text-sm">Pre-configured sizes for every major platform and format.</p>
          </div>
          <div class="card text-center">
            <div class="feature-icon feature-icon-custom"></div>
            <h3 class="font-semibold mb-2">Custom Sizes</h3>
            <p class="text-text-secondary text-sm">Define your own dimensions with pixel-perfect control.</p>
          </div>
          <div class="card text-center">
            <div class="feature-icon feature-icon-cloud"></div>
            <h3 class="font-semibold mb-2">Cloud Storage</h3>
            <p class="text-text-secondary text-sm">Results stored securely. Download anytime from your history.</p>
          </div>
        </div>
      </section>

      <section class="py-24 px-6 bg-surface border-t border-border">
        <div class="max-w-3xl mx-auto text-center">
          <h2 class="text-3xl font-bold mb-4">Ready to simplify your image workflow?</h2>
          <p class="text-text-secondary mb-8">Start resizing in seconds. No credit card required.</p>
          <a routerLink="/register" class="btn-primary text-lg px-8 py-4">Get Started Free</a>
        </div>
      </section>
    </main>

    <pf-footer></pf-footer>
  `,
})
export class HomeComponent implements OnInit {
  readonly categories: PresetCategory[] = [
    {
      name: "Wallpaper",
      iconClass: "cat-icon-monitor",
      presets: [
        { name: "Desktop HD", dimensions: "1920×1080" },
        { name: "Desktop 4K", dimensions: "3840×2160" },
        { name: "Mobile", dimensions: "1080×1920" },
        { name: "Tablet", dimensions: "1668×2388" },
      ],
    },
    {
      name: "Social Media",
      iconClass: "cat-icon-mobile",
      presets: [
        { name: "Instagram Post", dimensions: "1080×1080" },
        { name: "Facebook Post", dimensions: "1200×630" },
        { name: "Twitter/X Post", dimensions: "1200×675" },
        { name: "TikTok", dimensions: "1080×1920" },
      ],
    },
    {
      name: "Document",
      iconClass: "cat-icon-doc",
      presets: [
        { name: "A4 72dpi", dimensions: "595×842" },
        { name: "A4 300dpi", dimensions: "2480×3508" },
        { name: "Letter 72dpi", dimensions: "612×792" },
        { name: "Letter 300dpi", dimensions: "2550×3300" },
      ],
    },
    {
      name: "Thumbnail",
      iconClass: "cat-icon-image",
      presets: [
        { name: "YouTube", dimensions: "1280×720" },
        { name: "Blog", dimensions: "800×450" },
        { name: "Article Card", dimensions: "600×400" },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(["/app/dashboard"]);
    }
  }
}
