import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { DialogModule } from 'primeng/dialog';
import { RescheduleAppointmentDto } from './home/services/appointments.service';

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
  @ViewChild('rescheduleCalendar') rescheduleCalendar: any;

  // Propiedades para editar comentarios
  displayEditCommentsModal: boolean = false;
  selectedAppointmentForEdit: BackendAppointment | null = null;
  editComments: string = '';

  // Propiedades para reprogramar citas
  displayRescheduleModal: boolean = false;
  selectedAppointmentForReschedule: BackendAppointment | null = null;
  newDateTime: Date = new Date();
  newTimeString: string = '08:00';
  minDateForReschedule: Date = new Date();

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
    private confirmService: ConfirmService,
    private cdr: ChangeDetectorRef
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

  // Métodos para reprogramar citas
  showRescheduleModal(appointment: BackendAppointment) {
    console.log('=== DEBUG: Abriendo modal de reprogramación ===');
    console.log('Appointment completo:', appointment);
    console.log('Appointment.dateTime:', appointment.dateTime);
    console.log('Tipo de appointment.dateTime:', typeof appointment.dateTime);
    
    this.selectedAppointmentForReschedule = appointment;
    
    try {
      // Verificar que appointment.dateTime existe y es válido
      if (!appointment.dateTime) {
        console.error('❌ La cita no tiene fecha válida:', appointment);
        this.messageService.showError('La cita seleccionada no tiene una fecha válida');
        return;
      }

      // Parsear la fecha y hora actual de la cita
      console.log('🔄 Parseando fecha:', appointment.dateTime);
      const appointmentDateTime = new Date(appointment.dateTime);
      console.log('📅 Fecha parseada:', appointmentDateTime);
      console.log('📅 Timestamp:', appointmentDateTime.getTime());
      console.log('📅 Es válida:', !isNaN(appointmentDateTime.getTime()));
      
      // Verificar que la fecha se parseó correctamente
      if (isNaN(appointmentDateTime.getTime())) {
        console.error('❌ Error al parsear la fecha:', appointment.dateTime);
        this.messageService.showError('Error al procesar la fecha de la cita');
        return;
      }
      
      // Crear una nueva instancia de Date para evitar problemas de referencia
      this.newDateTime = new Date(appointmentDateTime.getTime());
      console.log('🆕 Nueva fecha para el modal:', this.newDateTime);
      
      // Extraer la hora directamente del string ISO sin conversiones de zona horaria
      // appointment.dateTime: "2025-07-17T14:30:00.000Z"
      console.log('⏰ Extrayendo hora del string ISO...');
      const [datePart, timePart] = appointment.dateTime.split('T');
      console.log('📅 Date part:', datePart);
      console.log('⏰ Time part:', timePart);
      
      if (timePart) {
        const [hour, minute] = timePart.split(':');
        console.log('🕐 Hour:', hour, 'Minute:', minute);
        console.log('🔢 Hour es número:', !isNaN(Number(hour)), 'Minute es número:', !isNaN(Number(minute)));
        
        // Verificar que hour y minute son números válidos
        if (hour && minute && !isNaN(Number(hour)) && !isNaN(Number(minute))) {
          // Usar la hora exacta del string, no la convertida
          this.newTimeString = `${hour}:${minute}`;
          console.log('✅ Hora extraída del string ISO:', this.newTimeString);
        } else {
          // Fallback: usar la hora del objeto Date parseado
          const hours = appointmentDateTime.getHours().toString().padStart(2, '0');
          const minutes = appointmentDateTime.getMinutes().toString().padStart(2, '0');
          this.newTimeString = `${hours}:${minutes}`;
          console.log('🔄 Fallback: hora del Date parseado:', this.newTimeString);
        }
      } else {
        // Fallback: usar la hora del objeto Date parseado
        const hours = appointmentDateTime.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateTime.getMinutes().toString().padStart(2, '0');
        this.newTimeString = `${hours}:${minutes}`;
        console.log('🔄 Fallback: hora del Date parseado (sin timePart):', this.newTimeString);
      }
      
      // Establecer la fecha mínima como la fecha actual
      this.minDateForReschedule = new Date();
      console.log('📅 Fecha mínima establecida:', this.minDateForReschedule);
      
      this.displayRescheduleModal = true;
      console.log('✅ Modal abierto correctamente');
      
      // Forzar la detección de cambios para asegurar que el p-calendar se actualice
      setTimeout(() => {
        console.log('🔄 Forzando detección de cambios...');
        this.cdr.detectChanges();
        
        // Forzar la actualización del p-calendar
        if (this.rescheduleCalendar) {
          console.log('📅 Forzando actualización del p-calendar...');
          
          // Método 1: Actualizar el modelo interno
          this.rescheduleCalendar.updateModel(this.newDateTime);
          
          // Método 2: Forzar la actualización del input
          this.rescheduleCalendar.updateInputfield();
          
          // Método 3: Trigger manual del input usando el valor formateado
          if (this.rescheduleCalendar.inputfieldViewChild && this.rescheduleCalendar.inputfieldViewChild.nativeElement) {
            const formattedDate = this.formatDateForInput(this.newDateTime);
            this.rescheduleCalendar.inputfieldViewChild.nativeElement.value = formattedDate;
            console.log('📅 Valor manual establecido en input:', formattedDate);
          }
          
          // Método 4: Forzar la detección de cambios del componente
          if (this.rescheduleCalendar.cd) {
            this.rescheduleCalendar.cd.detectChanges();
          }
        }
        
        console.log('✅ Detección de cambios completada');
      }, 100);
      
    } catch (error) {
      console.error('❌ Error al abrir el modal de reprogramación:', error);
      this.messageService.showError('Error al procesar la información de la cita');
    }
  }

  saveReschedule() {
    if (!this.selectedAppointmentForReschedule) return;

    // Construir la fecha y hora completa para validación
    const [hours, minutes] = this.newTimeString.split(':').map(Number);
    const completeDateTime = new Date(
      this.newDateTime.getFullYear(),
      this.newDateTime.getMonth(),
      this.newDateTime.getDate(),
      hours,
      minutes
    );

    // Validar que la nueva fecha y hora no esté en el pasado
    const now = new Date();
    if (completeDateTime <= now) {
      this.messageService.showError('La nueva fecha y hora debe ser en el futuro');
      return;
    }

    // Validar conflictos de sala
    if (this.checkRescheduleConflict()) {
      return;
    }

    // Construir el dateTime para el backend
    const backendDateTime = new Date(
      this.newDateTime.getFullYear(),
      this.newDateTime.getMonth(),
      this.newDateTime.getDate(),
      hours,
      minutes
    );

    const dateTimeForBackend = backendDateTime.getFullYear() + '-' +
      String(backendDateTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(backendDateTime.getDate()).padStart(2, '0') + 'T' +
      String(backendDateTime.getHours()).padStart(2, '0') + ':' +
      String(backendDateTime.getMinutes()).padStart(2, '0') + ':00';

    const rescheduleDto: RescheduleAppointmentDto = {
      dateTime: dateTimeForBackend
    };

    this.appointmentsService.rescheduleAppointment(this.selectedAppointmentForReschedule.id, rescheduleDto).subscribe({
      next: () => {
        // Actualizar la cita en la lista local
        if (this.selectedAppointmentForReschedule) {
          this.selectedAppointmentForReschedule.dateTime = dateTimeForBackend;
        }
        
        this.messageService.showSuccess('Cita reprogramada exitosamente');
        this.displayRescheduleModal = false;
        this.selectedAppointmentForReschedule = null;
        
        // Recargar las citas para asegurar sincronización
        this.getAllAppointments();
      },
      error: (error) => {
        const errorMessage = error.error?.message || 'Error al reprogramar la cita';
        this.messageService.showError(errorMessage);
      }
    });
  }

  cancelReschedule() {
    this.displayRescheduleModal = false;
    this.selectedAppointmentForReschedule = null;
  }

  checkRescheduleConflict(): boolean {
    if (!this.selectedAppointmentForReschedule) return false;

    const [hours, minutes] = this.newTimeString.split(':').map(Number);
    const targetDateTime = new Date(
      this.newDateTime.getFullYear(),
      this.newDateTime.getMonth(),
      this.newDateTime.getDate(),
      hours,
      minutes
    );

    const dateTimeForValidation = targetDateTime.getFullYear() + '-' +
      String(targetDateTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(targetDateTime.getDate()).padStart(2, '0') + 'T' +
      String(targetDateTime.getHours()).padStart(2, '0') + ':' +
      String(targetDateTime.getMinutes()).padStart(2, '0') + ':00';

    const targetDate = dateTimeForValidation.split('T')[0];
    const targetTime = dateTimeForValidation.split('T')[1];

    // Buscar citas existentes en la misma fecha (excluyendo la cita actual)
    const existingAppointmentsOnDate = this.allAppointments.filter(appointment => {
      const appointmentDate = appointment.dateTime.split('T')[0];
      return appointmentDate === targetDate && appointment.id !== this.selectedAppointmentForReschedule!.id;
    });

    // Verificar si ya existe una cita en la misma sala en el mismo horario
    const conflictingRoomAppointment = existingAppointmentsOnDate.find(appointment => {
      const appointmentTime = appointment.dateTime.split('T')[1];
      
      // Normalizar el formato de hora para comparación
      const normalizedAppointmentTime = appointmentTime.split('.')[0];
      const normalizedTargetTime = targetTime;
      
      const isSameTime = normalizedAppointmentTime === normalizedTargetTime;
      const isSameRoom = appointment.room.id === this.selectedAppointmentForReschedule!.room.id;
      
      return isSameTime && isSameRoom;
    });

    if (conflictingRoomAppointment) {
      this.messageService.showError(`La sala ${this.selectedAppointmentForReschedule!.room.name} ya tiene una cita programada para el ${this.formatDate(targetDate)} a las ${this.getHourAMPM(dateTimeForValidation)}. Por favor, seleccione otra fecha u otro horario.`);
      return true;
    }

    return false;
  }

  formatDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getHourAMPM(dateTime: string): string {
    const [_, timePart] = dateTime.split('T');
    if (!timePart) return dateTime;
    
    const [hourStr, minuteStr] = timePart.split(':');
    let hours = Number(hourStr);
    const minutes = minuteStr.split('.')[0];
    
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  private formatDateForInput(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Solo los últimos 2 dígitos del año
    return `${day}/${month}/${year}`;
  }
}
