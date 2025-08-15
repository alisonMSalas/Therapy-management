import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { AppointmentsService, Appointment as BackendAppointment, UpdateCommentsDto } from './home/services/appointments.service';
import { AppMessageService } from '../../core/services/message.service';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmService } from '../../core/services/confirm.service';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ViewChild } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-appointments-records',
  standalone: true,
  imports: [CommonModule, TableModule, DropdownModule, FormsModule, CalendarModule, ButtonModule, InputTextModule, OverlayPanelModule, DialogModule],
  templateUrl: './appointments-records.component.html',
  styleUrl: './appointments-records.component.css'
})
export class AppointmentsRecordsComponent implements OnInit {
  allAppointments: BackendAppointment[] = [];
  searchText: string = '';
  selectedRoom: string = '';
  selectedAttendance: string = '';
  selectedMonth: Date = new Date();
  selectedAppointmentForMenu: BackendAppointment | null = null;
  @ViewChild('attendanceMenu') attendanceMenu: any;

  // Propiedades para editar comentarios
  displayEditCommentsModal: boolean = false;
  selectedAppointmentForEdit: BackendAppointment | null = null;
  editComments: string = '';

  attendanceOptions = [
    { label: 'Confirmado', value: 'confirmed' },
    { label: 'No asistió', value: 'no_attendance' },
    { label: 'Reprogramada', value: 'reprogrammed' }
  ];

  attendanceStatusMap: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    no_attendance: 'No asistió',
    reprogrammed: 'Reprogramada'
  };

  constructor(
    private appointmentsService: AppointmentsService,
    private messageService: AppMessageService,
    private confirmService: ConfirmService
  ) {}

  ngOnInit() {
    this.getAllAppointments();
  }

  getAllAppointments() {
    this.appointmentsService.getAppointments().subscribe((appointments: BackendAppointment[]) => {
      this.allAppointments = appointments;
    });
  }

  getRooms(): { label: string, value: string }[] {
    // Extrae las salas únicas de las citas
    const uniqueRooms = Array.from(new Set(this.allAppointments.map(a => a.room.name)));
    
    // Ordenar las salas numéricamente (Sala 1, Sala 2, Sala 3...)
    const sortedRooms = uniqueRooms.sort((a, b) => {
      // Extraer el número de la sala (ej: "Sala 1" -> 1)
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
    
    return sortedRooms.map(room => ({ label: room, value: room }));
  }

  filterAppointments(): BackendAppointment[] {
    let filtered = this.allAppointments;

    // Filtro por mes
    if (this.selectedMonth) {
      const selectedYear = this.selectedMonth.getFullYear();
      const selectedMonthIndex = this.selectedMonth.getMonth();
      
      filtered = filtered.filter(appointment => {
        // Extraer fecha directamente del string ISO sin crear objeto Date
        const [datePart] = appointment.dateTime.split('T');
        if (!datePart) return false;
        const [year, month, day] = datePart.split('-').map(Number);
        return year === selectedYear && month === selectedMonthIndex + 1;
      });
    }

    // Filtro por texto de búsqueda
    const searchLower = this.searchText.toLowerCase();
    if (this.searchText) {
      filtered = filtered.filter(appointment => 
        appointment.client.idNumber.includes(searchLower) ||
        appointment.client.fullName.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por sala
    if (this.selectedRoom) {
      filtered = filtered.filter(appointment => appointment.room.name === this.selectedRoom);
    }

    // Filtro por asistencia
    if (this.selectedAttendance) {
      filtered = filtered.filter(appointment => appointment.attendanceStatus === this.selectedAttendance);
    }

    return filtered;
  }

  updateAttendance(appointment: BackendAppointment, newAttendance: string) {
    this.appointmentsService.updateAttendance(appointment.id, newAttendance).subscribe({
      next: () => {
        appointment.attendanceStatus = newAttendance;
        this.messageService.showSuccess('Estado de asistencia actualizado');
      },
      error: (error) => {
        // Capturar el mensaje de error del backend
        const errorMessage = error.error?.message || 'Error al actualizar el estado de asistencia';
        this.messageService.showError(errorMessage);
      }
    });
  }

  async deleteAppointment(appointmentId: number) {
    const confirmed = await this.confirmService.confirmDanger('¿Está seguro de que desea eliminar esta cita?');
    if (!confirmed) return;
    this.appointmentsService.deleteAppointment(appointmentId).subscribe({
      next: () => {
        this.getAllAppointments();
        this.messageService.showSuccess('Cita eliminada correctamente');
      },
      error: (error) => {
        // Capturar el mensaje de error del backend
        const errorMessage = error.error?.message || 'Error al eliminar la cita';
        this.messageService.showError(errorMessage);
      }
    });
  }

  showAttendanceMenu(event: MouseEvent, appointment: BackendAppointment, overlayPanel: any) {
    this.selectedAppointmentForMenu = appointment;
    overlayPanel.toggle(event);
  }

  setAttendanceStatus(status: string) {
    if (!this.selectedAppointmentForMenu) return;
    this.updateAttendance(this.selectedAppointmentForMenu, status);
    this.selectedAppointmentForMenu = null;
    if (this.attendanceMenu) {
      this.attendanceMenu.hide();
    }
  }

  // Métodos para editar comentarios
  showEditCommentsModal(appointment: BackendAppointment) {
    this.selectedAppointmentForEdit = appointment;
    this.editComments = appointment.comments || '';
    this.displayEditCommentsModal = true;
  }

  saveComments() {
    if (!this.selectedAppointmentForEdit) return;

    const updateCommentsDto: UpdateCommentsDto = {
      comments: this.editComments
    };

    this.appointmentsService.updateComments(this.selectedAppointmentForEdit.id, updateCommentsDto).subscribe({
      next: () => {
        // Actualizar el comentario en la lista local
        if (this.selectedAppointmentForEdit) {
          this.selectedAppointmentForEdit.comments = this.editComments;
        }
        this.messageService.showSuccess('Comentarios actualizados correctamente');
        this.displayEditCommentsModal = false;
        this.selectedAppointmentForEdit = null;
        this.editComments = '';
      },
      error: (error) => {
        // Capturar el mensaje de error del backend
        const errorMessage = error.error?.message || 'Error al actualizar los comentarios';
        this.messageService.showError(errorMessage);
      }
    });
  }

  cancelEditComments() {
    this.displayEditCommentsModal = false;
    this.selectedAppointmentForEdit = null;
    this.editComments = '';
  }

  clearFilters() {
    this.searchText = '';
    this.selectedRoom = '';
    this.selectedAttendance = '';
    this.selectedMonth = new Date();
  }

  // Función para mostrar fecha y hora sin conversión de zona horaria
  getLocalDateTimeNoConversion(dateTime: string): string {
    // dateTime: "2025-07-17T14:30:00.000Z"
    // Extraer fecha y hora directamente del string ISO
    const [datePart, timePart] = dateTime.split('T');
    if (!datePart || !timePart) return dateTime;
    
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    
    // Formatear como dd/MM/yyyy HH:mm
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = `${hour}:${minute}`;
    
    return `${formattedDate} ${formattedTime}`;
  }
}
