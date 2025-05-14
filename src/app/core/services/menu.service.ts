import { Injectable } from '@angular/core';

export interface IMenu{
  title: string;
  url: string;
  icon: string;
  }

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private listMenu: IMenu[] = [
    { title: 'Inicio', url: '/', icon: 'pi pi-home' },
    { title: 'Pacientes', url: '/pacients', icon: 'pi pi-plus-circle' },
    
  ]
  getMenu(){
    return [...this.listMenu];
  }

  getMenuByURL(url: string): IMenu{
    return this.listMenu.find(menu => menu.url.toLowerCase() === url.toLocaleLowerCase()) as IMenu
  }
}
