import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
@Injectable({
  providedIn: 'root'
})
export class AppMessageService {
constructor(private messageService: MessageService) {}

  showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: '¡Éxito!',
      detail: message,
      life: 5000,
    });
  }

  showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: '¡Error!',
      detail: message,
      life: 5000,
    });
  }

  showInfo(message: string) {
    this.messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: message,
      life: 5000,
    });
  }
}
