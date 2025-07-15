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
    { title: 'Inicio', url: '/main', icon: 'pi pi-home' },
    { title: 'Pacientes', url: '/main/pacients', icon: 'pi pi-plus-circle' },
    { title: 'Registro de Citas', url: '/main/appointments-records', icon: 'pi pi-file' },
  ]
  getMenu(){
    return [...this.listMenu];
  }

  getMenuByURL(url: string): IMenu{
    return this.listMenu.find(menu => menu.url.toLowerCase() === url.toLocaleLowerCase()) as IMenu
  }
}
