import { Routes } from '@angular/router';
import { AdminUsersPageComponent } from './admin-users-page.component';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';
import { DashboardPageComponent } from './dashboard-page.component';
import { LoginPageComponent } from './login-page.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    component: AdminUsersPageComponent,
  },
  {
    path: '',
    canActivate: [authGuard],
    component: DashboardPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
