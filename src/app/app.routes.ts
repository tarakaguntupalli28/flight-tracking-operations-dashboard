import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    title: 'Flight Tracking Operations Dashboard',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
