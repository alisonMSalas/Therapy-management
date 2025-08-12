import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment as BackendAppointment } from './home/services/appointments.service';
import { AppMessageService } from '../../core/services/message.service';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmService } from '../../core/services/confirm.service';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ViewChild } from '@angular/core';


@Component({
  selector: 'app-appointments-records',
  standalone: true,
  imports: [CommonModule, TableModule, DropdownModule, FormsModule, InputTextModule, OverlayPanelModule],
  templateUrl: './appointments-records.component.html',
  styleUrl: './appointments-records.component.css'
})
export class AppointmentsRecordsComponent implements OnInit {
  allAppointments: BackendAppointment[] = [];
  searchText: string = '';
  selectedRoom: string = '';
  selectedAttendance: string = '';
  selectedAppointmentForMenu: BackendAppointment | null = null;
  @ViewChild('attendanceMenu') attendanceMenu: any;

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
    return uniqueRooms.map(room => ({ label: room, value: room }));
  }

  filterAppointments(): BackendAppointment[] {
    let filtered = this.allAppointments;
    const searchLower = this.searchText.toLowerCase();
    if (this.searchText) {
      filtered = filtered.filter(appointment => 
        appointment.client.idNumber.includes(searchLower) ||
        appointment.client.fullName.toLowerCase().includes(searchLower)
      );
    }
    if (this.selectedRoom) {
      filtered = filtered.filter(appointment => appointment.room.name === this.selectedRoom);
    }
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
      error: () => {
        this.messageService.showError('Error al actualizar el estado de asistencia');
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
      error: () => {
        this.messageService.showError('Error al eliminar la cita');
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
}
