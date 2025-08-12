import { Routes } from '@angular/router';
import { MainComponent } from './core/components/main/main.component';
import { HomeComponent } from './core/components/home/home.component';
import { PacientsComponent } from './pacients/pacients.component';
import { LoginComponent } from './core/components/login/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'main', pathMatch: 'full' },
  {
    path: 'main', component: MainComponent, children: [
      { path: '', component: HomeComponent },
      { path: 'pacients', component: PacientsComponent },
      { path: 'appointments-records', loadComponent: () => import('./core/components/appointments-records.component').then(m => m.AppointmentsRecordsComponent) },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
