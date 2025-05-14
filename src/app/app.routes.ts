import { Routes } from '@angular/router';
import { MainComponent } from './core/components/main/main.component';
import { HomeComponent } from './core/components/home/home.component';
import { PacientsComponent } from './pacients/pacients.component';

export const routes: Routes = [
    {path:'',component:MainComponent, children: [
      { path: '', component: HomeComponent},
      {path:'pacients',component:PacientsComponent}
    ]

    }
];
