import { Component, inject } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { AuthService } from "../../services/auth/auth.service";

@Component({
  selector: "pf-app-shell",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-primary-dark">
      <aside class="w-64 bg-surface border-r border-border flex flex-col shrink-0">
        <div class="p-6 border-b border-border">
          <a routerLink="/app/dashboard" class="flex items-center gap-2 text-xl font-bold">
            <span class="diamond-icon"></span>
            <span>PixelForge</span>
          </a>
        </div>

        <nav class="flex-1 p-4 space-y-1">
          <a routerLink="/app/dashboard"
             routerLinkActive="bg-surface-light border-l-2 border-accent text-accent"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all">
            <span class="nav-icon-grid"></span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/app/resize"
             routerLinkActive="bg-surface-light border-l-2 border-accent text-accent"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all">
            <span class="nav-icon-resize"></span>
            <span>Resize</span>
          </a>
          <a routerLink="/app/history"
             routerLinkActive="bg-surface-light border-l-2 border-accent text-accent"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all">
            <span class="nav-icon-history"></span>
            <span>History</span>
          </a>
          <a routerLink="/app/preview-tester"
             routerLinkActive="bg-surface-light border-l-2 border-accent text-accent"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all">
            <span class="nav-icon-preview"></span>
            <span>Preview Tester</span>
          </a>
          <a routerLink="/app/settings/profile"
             routerLinkActive="bg-surface-light border-l-2 border-accent text-accent"
             class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all">
            <span class="nav-icon-settings"></span>
            <span>Settings</span>
          </a>
        </nav>

        <div class="p-4 border-t border-border">
          @if (user(); as user) {
            <div class="flex items-center gap-3 px-4 py-3">
              <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ user.name }}</p>
                <p class="text-xs text-text-muted truncate">{{ user.email }}</p>
              </div>
            </div>
          }
          <div class="mt-2 space-y-1">
            <a routerLink="/app/settings/profile" class="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg">Profile</a>
            <a routerLink="/app/settings/change-password" class="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg">Change Password</a>
            <hr class="border-border my-1" />
            <button (click)="logout()" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg">Log out</button>
          </div>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-16 border-b border-border flex items-center px-8 shrink-0">
        </header>

        <main class="flex-1 overflow-y-auto p-8">
          <router-outlet />
        </main>

        <footer class="border-t border-border py-3 px-8 text-xs text-text-muted text-center shrink-0">
          PixelForge v0.1.0
        </footer>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  private authService = inject(AuthService);
  readonly user = toSignal(this.authService.currentUser$);

  logout(): void {
    this.authService.logout();
  }
}
