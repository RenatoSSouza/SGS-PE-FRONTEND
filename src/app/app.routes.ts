import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  {
    path: '', canActivate: [authGuard],
    loadComponent: () => import('./shell').then(m => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'registros', loadComponent: () => import('./pages/records/records').then(m => m.Records) },
      { path: 'equipamentos', loadComponent: () => import('./pages/equipments/equipments').then(m => m.Equipments) },
      { path: 'carbono', loadComponent: () => import('./pages/carbon/carbon').then(m => m.CarbonPage) },
      { path: 'benchmark', canActivate: [roleGuard('Admin', 'Manager')], loadComponent: () => import('./pages/benchmark/benchmark').then(m => m.BenchmarkPage) },
      { path: 'empresas', canActivate: [roleGuard('Admin')], loadComponent: () => import('./pages/companies/companies').then(m => m.Companies) },
      { path: 'usuarios', canActivate: [roleGuard('Admin', 'Manager')], loadComponent: () => import('./pages/users/users').then(m => m.Users) },
      { path: 'notificacoes', loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications) },
      { path: 'metas', loadComponent: () => import('./pages/goals/goals').then(m => m.Goals) },
      { path: 'relatorios', canActivate: [roleGuard('Admin', 'Manager')], loadComponent: () => import('./pages/reports/reports').then(m => m.Reports) }
    ]
  },
  { path: '**', redirectTo: '' }
];
