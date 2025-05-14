import { Component,inject } from '@angular/core';
import { MenuService,IMenu } from '../../services/menu.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [RouterModule,CommonModule,],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
   listMenu: IMenu[];
  menuSrv = inject(MenuService);
  router = inject(Router);
  constructor(){
    this.listMenu = this.menuSrv.getMenu();
  }

  logout(){
    //aqui va el cerrar sesion
  }

}
