import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MenuComponent } from '../menu/menu.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main',
  imports: [RouterModule,MenuComponent,HeaderComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {

}
