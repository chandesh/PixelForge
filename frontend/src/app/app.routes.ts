import { Routes } from "@angular/router";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./pages/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "login",
    loadComponent: () => import("./pages/login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () => import("./pages/register/register.component").then((m) => m.RegisterComponent),
  },
  {
    path: "app",
    loadComponent: () => import("./pages/app/app-shell.component").then((m) => m.AppShellComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: "dashboard",
        loadComponent: () =>
          import("./pages/app/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "resize",
        loadComponent: () =>
          import("./pages/app/resize/resize.component").then((m) => m.ResizeComponent),
      },
      {
        path: "history",
        loadComponent: () =>
          import("./pages/app/history/history.component").then((m) => m.HistoryComponent),
      },
      {
        path: "preview-tester",
        loadComponent: () =>
          import("./pages/app/preview-tester/preview-tester.component").then((m) => m.PreviewTesterComponent),
      },
      {
        path: "jobs/:id",
        loadComponent: () =>
          import("./pages/app/job-detail/job-detail.component").then((m) => m.JobDetailComponent),
      },
      {
        path: "settings/profile",
        loadComponent: () =>
          import("./pages/app/profile/profile.component").then((m) => m.ProfileComponent),
      },
      {
        path: "settings/change-password",
        loadComponent: () =>
          import("./pages/app/change-password/change-password.component").then((m) => m.ChangePasswordComponent),
      },
      {
        path: "",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
    ],
  },
  {
    path: "**",
    redirectTo: "",
  },
];
