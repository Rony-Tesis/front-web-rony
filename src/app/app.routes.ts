import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Panel principal | Monitor',
    loadComponent: () =>
      import('./waste-classification/presentation/pages/dashboard/dashboard-page.component').then(
        (module) => module.DashboardPageComponent,
      ),
  },
  {
    path: 'monitoring',
    title: 'Monitoreo | Monitor',
    loadComponent: () =>
      import('./waste-classification/presentation/pages/monitoring/monitoring-page.component').then(
        (module) => module.MonitoringPageComponent,
      ),
  },
  {
    path: 'classifications',
    title: 'Clasificaciones | Monitor',
    loadComponent: () =>
      import('./waste-classification/presentation/pages/classifications/classifications-page.component').then(
        (module) => module.ClassificationsPageComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
