import { Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
 constructor(private confirmationService: ConfirmationService) {}

  confirmDanger(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmationService.confirm({
        message,
        header: '¡Peligro!',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Eliminar',
        rejectLabel: 'Cancelar',
        rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => resolve(true),
        reject: () => resolve(false)
      });
    });
  }

  confirmInfo(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmationService.confirm({
        message,
        header: 'Agregar',
        icon: 'pi pi-user-plus',
        acceptLabel: 'Agregar',
        rejectLabel: 'Cancelar',
        rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
        acceptButtonStyleClass: 'p-button-info',
        accept: () => resolve(true),
        reject: () => resolve(false)
      });
    });
  }
}
