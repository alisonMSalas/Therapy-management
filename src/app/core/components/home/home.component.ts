import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventSourceInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { RadioButtonModule } from 'primeng/radiobutton';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { AppointmentsService, Appointment as BackendAppointment, CreateAppointmentRequest } from './services/appointments.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AppMessageService } from '../../../core/services/message.service';
import { ClientsService, Client } from '../../../pacients/services/clients.service';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ViewChild } from '@angular/core';

interface Patient {
  full_name: string;
  identification_number: string;
  email: string;
  phone_number: string;
}

type AppointmentsByDate = {
  [key: string]: BackendAppointment[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FullCalendarModule,
    DialogModule,
    TableModule,
    ButtonModule,
    CommonModule,
    DropdownModule,
    FormsModule,
    CalendarModule,
    InputTextModule,
    StepsModule,
    AutoCompleteModule,
    RadioButtonModule,
    OverlayPanelModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  displayAppointmentsModal: boolean = false;
  displayNewAppointmentModal: boolean = false;
  displayAllAppointmentsModal: boolean = false;
  selectedDate: string = '';
  appointments: BackendAppointment[] = [];
  allAppointments: BackendAppointment[] = [];
  minDate: Date = new Date();
  calendarLocale: any = esLocale;
  searchText: string = '';
  searchIdNumber: string = '';
  selectedMonth: Date = new Date();
  clients: Client[] = [];
  displayPatientDialog: boolean = false;
  currentPatient: any = {
    identification_number: '',
    full_name: '',
    phone_number: '',
    emergency_phone_number: '',
    email: '',
    address: '',
    age: 0,
    created_at: ''
  };
  cedulaInvalida: boolean = false;
  telefonoInvalido: boolean = false;
  selectedAppointmentForMenu: BackendAppointment | null = null;
  @ViewChild('attendanceMenuDay') attendanceMenuDay: any;
  
  // Opciones de asistencia según el enum del backend
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

  steps: MenuItem[] = [
    { label: 'Cantidad de Citas' },
    { label: 'Fechas, Horas y Salas' },
    { label: 'Datos del Cliente' },
    { label: 'Observaciones' }
  ];
  activeStep: number = 0;
  
  numberOfAppointments: number = 1;
  multipleAppointments: Array<{
    date: Date;
    timeString: string;
    roomNumber: string;
    isCombined: boolean;
  }> = [];
  
  newAppointment = {
    date: new Date(),
    time: new Date(),
    timeString: '08:00',
    patientDni: '',
    patient: null as any,
    roomNumber: '',
    isCombined: false,
    name: '',
    comments: ''
  };

  rooms = [
    { label: 'Sala 1', value: '1' },
    { label: 'Sala 2', value: '2' },
    { label: 'Sala 3', value: '3' }
  ];

  // Eliminar searchPatient y filteredPatients

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: this.calendarLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    editable: false,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    events: [],
    dateClick: this.handleDateClick.bind(this)
  };

  constructor(
    private appointmentsService: AppointmentsService,
    private messageService: AppMessageService,
    private clientsService: ClientsService,
    private confirmService: ConfirmService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.getAllAppointments();
    this.setInitialTime();
    this.clientsService.getAllClients().subscribe(clients => {
      this.clients = clients;
    });
  }

  getAllAppointments() {
    this.appointmentsService.getAppointments().subscribe((appointments: BackendAppointment[]) => {
      this.allAppointments = appointments;
      // Actualizar el calendario inmediatamente
      this.updateCalendarEvents();
    });
  }

  // Función para actualizar el calendario de forma más eficiente
  updateCalendarEvents() {
    // Limpiar eventos existentes
    this.calendarOptions = { ...this.calendarOptions, events: [] };
    // Cargar nuevos eventos
    this.loadCalendarEvents();
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  showAllAppointments() {
    this.displayAllAppointmentsModal = true;
  }

  filterAppointments(): BackendAppointment[] {
    let filteredAppointments = this.allAppointments;

    // Filtro por mes
    if (this.selectedMonth) {
      const selectedYear = this.selectedMonth.getFullYear();
      const selectedMonthIndex = this.selectedMonth.getMonth();
      
      filteredAppointments = filteredAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.dateTime);
        return appointmentDate.getFullYear() === selectedYear && 
               appointmentDate.getMonth() === selectedMonthIndex;
      });
    }

    // Filtro por texto de búsqueda
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filteredAppointments = filteredAppointments.filter(appointment => 
        appointment.name.toLowerCase().includes(searchLower) ||
        appointment.client.idNumber.includes(searchLower) ||
        appointment.client.fullName.toLowerCase().includes(searchLower) ||
        appointment.client.email.toLowerCase().includes(searchLower) ||
        appointment.client.phone.includes(searchLower) ||
        appointment.room.name.toLowerCase().includes(searchLower) ||
        appointment.dateTime.toLowerCase().includes(searchLower)
      );
    }

    return filteredAppointments;
  }

  clearFilters() {
    this.searchText = '';
    this.selectedMonth = new Date();
  }

  onMonthChange() {
    // Forzar detección de cambios para actualizar la tabla
    this.cdr.detectChanges();
  }

  setInitialTime() {
    const now = new Date();
    now.setHours(8, 0, 0);
    this.newAppointment.time = now;
  }

  loadCalendarEvents() {
    const events: EventSourceInput = [];
    // Agrupar citas por fecha (YYYY-MM-DD)
    const grouped: { [date: string]: BackendAppointment[] } = {};
    this.allAppointments.forEach(app => {
      const date = app.dateTime.split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(app);
    });
    Object.entries(grouped).forEach(([date, appointments]) => {
      events.push({
        title: `${appointments.length} citas`,
        start: date,
        display: 'background',
        classNames: ['calendar-has-appointments'],
        extendedProps: {
          appointmentCount: appointments.length
        }
      });
    });
    this.calendarOptions.events = events;
  }

  handleDateClick(info: { dateStr: string }) {
    const dateStr = info.dateStr;
    const appointmentsForDay = this.allAppointments.filter(app => app.dateTime.startsWith(dateStr));
    if (appointmentsForDay.length > 0) {
      this.selectedDate = dateStr;
      this.appointments = appointmentsForDay;
      this.displayAppointmentsModal = true;
    }
  }

  updateAttendance(appointment: BackendAppointment, newAttendance: string) {
    this.appointmentsService.updateAttendance(appointment.id, newAttendance).subscribe({
      next: () => {
        appointment.attendanceStatus = newAttendance;
        this.messageService.showSuccess('Estado de asistencia actualizado');
      },
      error: () => {
        this.messageService.showError('Error al actualizar la asistencia');
      }
    });
  }

  formatDate(date: string): string {
    // Ajuste para evitar desfase de zona horaria
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: string, time: string): string {
    return `${this.formatDate(date)} - ${time}`;
  }

  getLocalDateTime(dateTime: string): string {
    const date = new Date(dateTime);
    return date.toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRawHourMinute(dateTime: string): string {
    // dateTime: "2025-07-17T14:30:00.000Z"
    const [_, timeWithMs] = dateTime.split('T');
    if (!timeWithMs) return '';
    const [hourStr, minuteStr] = timeWithMs.split(':');
    let hour = Number(hourStr);
    const ampm = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${minuteStr} ${ampm}`;
  }

  getHourAMPM(dateTime: string): string {
    const date = new Date(dateTime);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // el 0 debe ser 12
    return `${hours}:${minutes} ${ampm}`;
  }

  showNewAppointmentModal() {
    this.displayNewAppointmentModal = true;
    this.activeStep = 0;
    this.resetNewAppointment();
  }

  nextStep() {
    if (this.activeStep < 3) {
      // Paso 0: Validar cantidad de citas
      if (this.activeStep === 0) {
        if (this.numberOfAppointments < 1 || this.numberOfAppointments > 10) {
          this.messageService.showError('Por favor, ingrese un número válido de citas (1-10)');
          return;
        }
        this.generateMultipleAppointments();
      }
      
      // Paso 1: Validar que todas las citas tengan fecha, hora y sala
      if (this.activeStep === 1) {
        if (this.numberOfAppointments === 1) {
          // Validar cita única
          if (!this.newAppointment.date || !this.newAppointment.timeString || !this.newAppointment.roomNumber) {
            this.messageService.showError('Por favor, complete la fecha, hora y sala de la cita');
            return;
          }
          
          // Validar que la fecha y hora no sea en el pasado
          if (this.isDateTimeInPast(this.newAppointment.date, this.newAppointment.timeString)) {
            this.messageService.showError('No se puede crear una cita en el pasado. Por favor, seleccione una fecha y hora futura.');
            return;
          }
          
          // Validar conflictos para cita única
          if (this.checkForConflict()) {
            return; // No avanzar si hay conflicto
          }
        } else {
          // Validar múltiples citas
          const invalidAppointments = this.multipleAppointments.filter(app => 
            !app.date || !app.timeString || !app.roomNumber
          );
          
          if (invalidAppointments.length > 0) {
            this.messageService.showError('Por favor, complete la fecha, hora y sala para todas las citas');
            return;
          }
          
          // Validar que ninguna cita esté en el pasado
          for (let i = 0; i < this.multipleAppointments.length; i++) {
            const appointment = this.multipleAppointments[i];
            if (this.isDateTimeInPast(appointment.date, appointment.timeString)) {
              this.messageService.showError(`Cita ${i + 1}: No se puede crear una cita en el pasado. Por favor, seleccione una fecha y hora futura.`);
              return;
            }
          }
          
          // Validar conflictos para todas las citas
          let hasConflict = false;
          for (let i = 0; i < this.multipleAppointments.length; i++) {
            const appointment = this.multipleAppointments[i];
            if (this.checkForConflictMultiple(appointment, i)) {
              hasConflict = true;
              break; // Detener en el primer conflicto
            }
          }
          
          if (hasConflict) {
            return; // No avanzar si hay conflicto
          }
        }
      }
      
      // Paso 2: Validar que se haya seleccionado un paciente
      if (this.activeStep === 2) {
        if (!this.newAppointment.patient) {
          this.messageService.showError('Por favor, seleccione un cliente');
          return;
        }
      }
      
      this.activeStep++;
    }
  }

  prevStep() {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  resetNewAppointment() {
    const now = new Date();
    now.setHours(8, 0, 0);
    this.newAppointment = {
      date: new Date(),
      time: now,
      timeString: '08:00',
      patientDni: '',
      patient: null,
      roomNumber: '',
      isCombined: false,
      name: '',
      comments: ''
    };
    this.numberOfAppointments = 1;
    this.multipleAppointments = [];
    this.activeStep = 0;
  }

  onNumberOfAppointmentsChange() {
    this.generateMultipleAppointments();
  }

  generateMultipleAppointments() {
    this.multipleAppointments = [];
    for (let i = 0; i < this.numberOfAppointments; i++) {
      this.multipleAppointments.push({
        date: new Date(),
        timeString: '08:00',
        roomNumber: '',
        isCombined: false
      });
    }
  }

  // Eliminar searchPatient y filteredPatients

  onPatientSelect(event: any) {
    const patient = event.value as Patient;
    this.newAppointment.patient = patient;
    this.newAppointment.patientDni = patient.identification_number;
  }

  createNewPatient() {
    // Abrir modal de crear paciente
  }

  saveAppointment() {
    if (!this.newAppointment.patient) {
      this.messageService.showError('Por favor, seleccione un cliente');
      return;
    }

    // Si es una sola cita, usar la lógica original
    if (this.numberOfAppointments === 1) {
      if (!this.newAppointment.date || !this.newAppointment.timeString || !this.newAppointment.roomNumber) {
        this.messageService.showError('Por favor, complete todos los campos de la cita');
        return;
      }
      this.saveSingleAppointment();
      return;
    }

    // Si son múltiples citas, validar que todas tengan los datos necesarios
    const invalidAppointments = this.multipleAppointments.filter(app => 
      !app.date || !app.timeString || !app.roomNumber
    );
    
    if (invalidAppointments.length > 0) {
      this.messageService.showError('Por favor, complete la fecha, hora y sala para todas las citas');
      return;
    }

    this.saveMultipleAppointments();
  }

  saveSingleAppointment() {
 

    
    const date = this.newAppointment.date;
    const timeString = this.newAppointment.timeString;
    
    // Validar que la fecha no sea en el pasado
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    const appointmentDateTime = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      hours, minutes
    );
    
    if (appointmentDateTime <= now) {
      this.messageService.showError('No se puede crear una cita en el pasado. Por favor, seleccione una fecha y hora futura.');
      return;
    }
    
    // Construir dateTime para validación (hora local sin ajuste)
    const localDateTime = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      hours, minutes
    );
    
    // Construir dateTime para el backend (con ajuste de zona horaria)
    const backendDateTime = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      hours, minutes
    );
    backendDateTime.setHours(backendDateTime.getHours() - 5); // Ajuste por zona horaria Ecuador
    
    const dateTimeForValidation = localDateTime.getFullYear() + '-' +
      String(localDateTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(localDateTime.getDate()).padStart(2, '0') + 'T' +
      String(localDateTime.getHours()).padStart(2, '0') + ':' +
      String(localDateTime.getMinutes()).padStart(2, '0') + ':00';
    
    const dateTimeForBackend = backendDateTime.getFullYear() + '-' +
      String(backendDateTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(backendDateTime.getDate()).padStart(2, '0') + 'T' +
      String(backendDateTime.getHours()).padStart(2, '0') + ':' +
      String(backendDateTime.getMinutes()).padStart(2, '0') + ':00';
    

    
    // Validar que no exista una cita en la misma fecha y hora
    const targetDate = dateTimeForValidation.split('T')[0]; // Obtener solo la fecha (YYYY-MM-DD)
    const targetTime = dateTimeForValidation.split('T')[1]; // Obtener solo la hora (HH:mm:ss)
    
    // Buscar citas existentes en la misma fecha
    const existingAppointmentsOnDate = this.allAppointments.filter(appointment => {
      const appointmentDate = appointment.dateTime.split('T')[0];
      return appointmentDate === targetDate;
    });
    
    // Verificar si ya existe una cita en la misma sala en el mismo horario
    const conflictingRoomAppointment = existingAppointmentsOnDate.find(appointment => {
      const appointmentTime = appointment.dateTime.split('T')[1];
      
      // Normalizar el formato de hora para comparación
      const normalizedAppointmentTime = appointmentTime.split('.')[0]; // Remover milisegundos y Z
      const normalizedTargetTime = targetTime;
      
      const isSameTime = normalizedAppointmentTime === normalizedTargetTime;
      const isSameRoom = appointment.room.id === Number(this.newAppointment.roomNumber);
      
      return isSameTime && isSameRoom;
    });
    
    if (conflictingRoomAppointment) {
      this.messageService.showError(`La sala ${this.newAppointment.roomNumber} ya tiene una cita programada para el ${this.formatDate(targetDate)} a las ${this.getHourAMPM(dateTimeForValidation)}. Por favor, seleccione otra sala u otro horario.`);
      return;
    }
    
    const appointmentReq: CreateAppointmentRequest = {
      name: this.newAppointment.name || 'Cita',
      dateTime: dateTimeForBackend,
      isShared: this.newAppointment.isCombined,
      roomId: Number(this.newAppointment.roomNumber),
      clientId: this.newAppointment.patient.id,
      comments: this.newAppointment.comments
    };
    
    this.appointmentsService.createAppointment(appointmentReq).subscribe({
      next: () => {
        this.messageService.showSuccess('Cita creada correctamente');
        this.displayNewAppointmentModal = false;
        this.resetNewAppointment();
        
        // Recargar completamente las citas y el calendario
        this.getAllAppointments();
        // Forzar actualización del calendario
        this.updateCalendarEvents();
      },
      error: () => {
        this.messageService.showError('Error al crear la cita');
      }
    });
  }

  saveMultipleAppointments() {
    // Validación final antes de crear las citas
    for (let i = 0; i < this.multipleAppointments.length; i++) {
      const appointment = this.multipleAppointments[i];
      if (this.checkForConflictMultiple(appointment, i)) {
        this.messageService.showError('No se pueden crear las citas debido a conflictos. Por favor, corrija los conflictos y vuelva a intentar.');
        return;
      }
    }

    let createdCount = 0;
    let errorCount = 0;
    const totalAppointments = this.multipleAppointments.length;

    this.multipleAppointments.forEach((appointment, index) => {
      const date = appointment.date;
      const timeString = appointment.timeString;
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Construir dateTime para el backend (con ajuste de zona horaria)
      const backendDateTime = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(),
        hours, minutes
      );
      backendDateTime.setHours(backendDateTime.getHours() - 5); // Ajuste por zona horaria Ecuador
      
      const dateTimeForBackend = backendDateTime.getFullYear() + '-' +
        String(backendDateTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(backendDateTime.getDate()).padStart(2, '0') + 'T' +
        String(backendDateTime.getHours()).padStart(2, '0') + ':' +
        String(backendDateTime.getMinutes()).padStart(2, '0') + ':00';
      
      const appointmentReq: CreateAppointmentRequest = {
        name: `Cita ${index + 1}`,
        dateTime: dateTimeForBackend,
        isShared: appointment.isCombined,
        roomId: Number(appointment.roomNumber),
        clientId: this.newAppointment.patient.id,
        comments: this.newAppointment.comments
      };
      
      this.appointmentsService.createAppointment(appointmentReq).subscribe({
        next: () => {
          createdCount++;
          if (createdCount + errorCount === totalAppointments) {
            this.finishMultipleAppointments(createdCount, errorCount);
          }
        },
        error: () => {
          errorCount++;
          if (createdCount + errorCount === totalAppointments) {
            this.finishMultipleAppointments(createdCount, errorCount);
          }
        }
      });
    });
  }

  finishMultipleAppointments(createdCount: number, errorCount: number) {
    if (errorCount === 0) {
      this.messageService.showSuccess(`${createdCount} citas creadas correctamente`);
    } else if (createdCount === 0) {
      this.messageService.showError('Error al crear las citas');
    } else {
      this.messageService.showSuccess(`${createdCount} citas creadas correctamente. ${errorCount} citas con error.`);
    }
    
    this.displayNewAppointmentModal = false;
    this.resetNewAppointment();
    this.getAllAppointments();
    // Forzar actualización del calendario
    this.updateCalendarEvents();
  }

  async buscarClientePorCedula() {
    if (!this.isValidEcuadorianID(this.searchIdNumber)) {
      this.messageService.showError('La cédula ingresada no es válida.');
      this.newAppointment.patient = null;
      return;
    }
    const found = this.clients.find(c => c.idNumber === this.searchIdNumber);
    this.newAppointment.patient = found || null;
    if (!found && this.searchIdNumber) {
      const confirmed = await this.confirmService.confirmInfo('No se encontró el paciente. ¿Desea agregarlo?');
      if (confirmed) {
        this.currentPatient = {
          identification_number: this.searchIdNumber,
          full_name: '',
          phone_number: '',
          emergency_phone_number: '',
          email: '',
          address: '',
          age: 0,
          created_at: ''
        };
        this.displayPatientDialog = true;
      }
    }
  }

  savePatientFromCita() {
    if (!this.isValidEcuadorianID(this.currentPatient.identification_number)) {
      this.messageService.showError('La cédula ingresada no es válida.');
      return;
    }
    
    // Validar que todos los campos obligatorios estén llenos
    if (!this.currentPatient.full_name || !this.currentPatient.full_name.trim()) {
      this.messageService.showError('El nombre completo es obligatorio.');
      return;
    }
    
    if (!this.currentPatient.email || !this.currentPatient.email.trim()) {
      this.messageService.showError('El email es obligatorio.');
      return;
    }
    
    if (!this.currentPatient.phone_number || !this.currentPatient.phone_number.trim()) {
      this.messageService.showError('El teléfono es obligatorio.');
      return;
    }
    
    if (!this.currentPatient.emergency_phone_number || !this.currentPatient.emergency_phone_number.trim()) {
      this.messageService.showError('El teléfono de emergencia es obligatorio.');
      return;
    }
    
    if (!this.currentPatient.address || !this.currentPatient.address.trim()) {
      this.messageService.showError('La dirección es obligatoria.');
      return;
    }
    
    if (!this.currentPatient.age || this.currentPatient.age <= 0) {
      this.messageService.showError('La edad es obligatoria y debe ser mayor a 0.');
      return;
    }
    
    const client = {
      idNumber: this.currentPatient.identification_number,
      fullName: this.currentPatient.full_name,
      email: this.currentPatient.email,
      phone: this.currentPatient.phone_number,
      emergencyPhone: this.currentPatient.emergency_phone_number,
      address: this.currentPatient.address,
      age: this.currentPatient.age
    };
    this.clientsService.createClient(client).subscribe({
      next: () => {
        this.clientsService.getAllClients().subscribe(clients => {
          this.clients = clients;
          const nuevo = this.clients.find(c => c.idNumber === this.currentPatient.identification_number);
          this.newAppointment.patient = nuevo || null;
        });
        this.displayPatientDialog = false;
        this.messageService.showSuccess('Paciente creado correctamente');
      },
      error: () => {
        this.messageService.showError('Error al crear el paciente');
      }
    });
  }

  isValidEcuadorianID(cedula: string): boolean {
    if (!cedula || cedula.length !== 10 || !/^[0-9]+$/.test(cedula)) return false;
    const province = parseInt(cedula.substring(0, 2), 10);
    if (province < 1 || province > 24) return false;
    const thirdDigit = parseInt(cedula[2], 10);
    if (thirdDigit >= 6) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(cedula[i], 10);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const verifier = (10 - (sum % 10)) % 10;
    return verifier === parseInt(cedula[9], 10);
  }

  onCedulaChangeCita(value: string) {
    if (value.length > 10) {
      this.currentPatient.identification_number = value.slice(0, 10);
    }
    this.cedulaInvalida =
      this.currentPatient.identification_number.length === 10 &&
      !this.isValidEcuadorianID(this.currentPatient.identification_number);
  }

  onTelefonoChangeCita(value: string, field: 'phone_number' | 'emergency_phone_number') {
    if (value.length > 10) {
      this.currentPatient[field] = value.slice(0, 10);
    }
    this.telefonoInvalido =
      this.currentPatient.phone_number.length > 0 && this.currentPatient.phone_number.length < 10;
  }

  showAttendanceMenuDay(event: MouseEvent, appointment: BackendAppointment, overlayPanel: any) {
    this.selectedAppointmentForMenu = appointment;
    overlayPanel.toggle(event);
  }

  setAttendanceStatusDay(status: string) {
    if (!this.selectedAppointmentForMenu) return;
    this.updateAttendance(this.selectedAppointmentForMenu, status);
    this.selectedAppointmentForMenu = null;
    if (this.attendanceMenuDay) {
      this.attendanceMenuDay.hide();
    }
  }

  // Función para obtener horarios disponibles en una fecha específica
  getAvailableTimeSlots(date: Date): string[] {
    const targetDate = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
    
    // Buscar citas existentes en la fecha
    const existingAppointmentsOnDate = this.allAppointments.filter(appointment => {
      const appointmentDate = appointment.dateTime.split('T')[0];
      return appointmentDate === targetDate;
    });
    
    // Horarios disponibles (de 8:00 AM a 6:00 PM, cada 30 minutos)
    const availableSlots: string[] = [];
    const startHour = 8;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        
        // Verificar si este horario está ocupado en TODAS las salas
        const occupiedRooms = existingAppointmentsOnDate.filter(appointment => {
          const appointmentTime = appointment.dateTime.split('T')[1];
          return appointmentTime === timeSlot;
        });
        
        // Si hay menos de 3 salas ocupadas, el horario está disponible
        if (occupiedRooms.length < 3) {
          availableSlots.push(timeSlot);
        }
      }
    }
    
    return availableSlots;
  }

  // Función para obtener salas disponibles en un horario específico
  getAvailableRooms(date: Date, time: Date): string[] {
    const targetDate = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
    
    const targetTime = String(time.getHours()).padStart(2, '0') + ':' +
      String(time.getMinutes()).padStart(2, '0') + ':00';
    
    // Buscar citas existentes en la fecha y hora
    const existingAppointmentsOnDateTime = this.allAppointments.filter(appointment => {
      const appointmentDate = appointment.dateTime.split('T')[0];
      const appointmentTime = appointment.dateTime.split('T')[1];
      return appointmentDate === targetDate && appointmentTime === targetTime;
    });
    
    // Obtener las salas ocupadas
    const occupiedRooms = existingAppointmentsOnDateTime.map(appointment => appointment.room.id.toString());
    
    // Retornar las salas disponibles
    return this.rooms
      .filter(room => !occupiedRooms.includes(room.value))
      .map(room => room.value);
  }

  // Función para mostrar horarios disponibles cuando se selecciona una fecha
  onDateChange() {
    // Función vacía - no mostrar toasts
  }

  // Función para mostrar salas disponibles cuando se selecciona hora
  onTimeStringChange() {
    // Función vacía - no mostrar toasts
  }

  // Función para verificar si hay conflicto de sala/horario
  checkForConflict(): boolean {
    const date = this.newAppointment.date;
    const timeString = this.newAppointment.timeString;
    const [hours, minutes] = timeString.split(':').map(Number);

    // Construir dateTime para validación (hora local sin ajuste)
    const localDateTime = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      hours, minutes
    );

    const dateTimeForValidation = localDateTime.getFullYear() + '-' +
      String(localDateTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(localDateTime.getDate()).padStart(2, '0') + 'T' +
      String(localDateTime.getHours()).padStart(2, '0') + ':' +
      String(localDateTime.getMinutes()).padStart(2, '0') + ':00';

    const targetDate = dateTimeForValidation.split('T')[0];
    const targetTime = dateTimeForValidation.split('T')[1];

    // Buscar citas existentes en la misma fecha
    const existingAppointmentsOnDate = this.allAppointments.filter(appointment => {
      const appointmentDate = appointment.dateTime.split('T')[0];
      return appointmentDate === targetDate;
    });

    // Verificar si ya existe una cita en la misma sala en el mismo horario
    const conflictingRoomAppointment = existingAppointmentsOnDate.find(appointment => {
      const appointmentTime = appointment.dateTime.split('T')[1];
      
      // Normalizar el formato de hora para comparación
      const normalizedAppointmentTime = appointmentTime.split('.')[0];
      const normalizedTargetTime = targetTime;
      
      const isSameTime = normalizedAppointmentTime === normalizedTargetTime;
      const isSameRoom = appointment.room.id === Number(this.newAppointment.roomNumber);
      
      return isSameTime && isSameRoom;
    });

    if (conflictingRoomAppointment) {
      this.messageService.showError(`La sala ${this.newAppointment.roomNumber} ya tiene una cita programada para el ${this.formatDate(targetDate)} a las ${this.getHourAMPM(dateTimeForValidation)}. Por favor, seleccione otra sala u otro horario.`);
      return true; // Hay conflicto
    }

    return false; // No hay conflicto
  }

  // Función para verificar si una fecha y hora está en el pasado
  isDateTimeInPast(date: Date, timeString: string): boolean {
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Crear la fecha y hora de la cita
    const appointmentDateTime = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      hours, minutes
    );
    
    // Comparar con el momento actual
    return appointmentDateTime <= now;
  }

  // Función para verificar conflicto en citas múltiples
  checkForConflictMultiple(appointment: any, index: number): boolean {
    if (!appointment.date || !appointment.timeString || !appointment.roomNumber) {
      return false;
    }

    const date = appointment.date;
    const timeString = appointment.timeString;
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Construir dateTime para validación (hora local sin ajuste)
    const localDateTime = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      hours, minutes
    );
    
    const dateTimeForValidation = localDateTime.getFullYear() + '-' +
      String(localDateTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(localDateTime.getDate()).padStart(2, '0') + 'T' +
      String(localDateTime.getHours()).padStart(2, '0') + ':' +
      String(localDateTime.getMinutes()).padStart(2, '0') + ':00';
    
    // Validar que no exista una cita en la misma fecha y hora
    const targetDate = dateTimeForValidation.split('T')[0];
    const targetTime = dateTimeForValidation.split('T')[1];
    
    // Buscar citas existentes en la misma fecha
    const existingAppointmentsOnDate = this.allAppointments.filter(existingAppointment => {
      const appointmentDate = existingAppointment.dateTime.split('T')[0];
      return appointmentDate === targetDate;
    });
    
    // Verificar si ya existe una cita en la misma sala en el mismo horario
    const conflictingRoomAppointment = existingAppointmentsOnDate.find(existingAppointment => {
      const appointmentTime = existingAppointment.dateTime.split('T')[1];
      
      // Normalizar el formato de hora para comparación
      const normalizedAppointmentTime = appointmentTime.split('.')[0];
      const normalizedTargetTime = targetTime;
      
      const isSameTime = normalizedAppointmentTime === normalizedTargetTime;
      const isSameRoom = existingAppointment.room.id === Number(appointment.roomNumber);
      
      return isSameTime && isSameRoom;
    });
    
    if (conflictingRoomAppointment) {
      this.messageService.showError(`Cita ${index + 1}: La sala ${appointment.roomNumber} ya tiene una cita programada para el ${this.formatDate(targetDate)} a las ${this.getHourAMPM(dateTimeForValidation)}. Por favor, seleccione otra sala u otro horario.`);
      return true;
    }
    
    // Verificar conflictos con otras citas que se están creando en el mismo proceso
    for (let i = 0; i < this.multipleAppointments.length; i++) {
      if (i === index) continue; // No comparar consigo mismo
      
      const otherAppointment = this.multipleAppointments[i];
      if (!otherAppointment.date || !otherAppointment.timeString || !otherAppointment.roomNumber) continue;
      
      const otherDate = otherAppointment.date;
      const otherTimeString = otherAppointment.timeString;
      const [otherHours, otherMinutes] = otherTimeString.split(':').map(Number);
      
      const otherLocalDateTime = new Date(
        otherDate.getFullYear(), otherDate.getMonth(), otherDate.getDate(),
        otherHours, otherMinutes
      );
      
      const otherDateTimeForValidation = otherLocalDateTime.getFullYear() + '-' +
        String(otherLocalDateTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(otherLocalDateTime.getDate()).padStart(2, '0') + 'T' +
        String(otherLocalDateTime.getHours()).padStart(2, '0') + ':' +
        String(otherLocalDateTime.getMinutes()).padStart(2, '0') + ':00';
      
      const otherTargetDate = otherDateTimeForValidation.split('T')[0];
      const otherTargetTime = otherDateTimeForValidation.split('T')[1];
      
      // Verificar si hay conflicto entre las citas que se están creando
      if (targetDate === otherTargetDate && targetTime === otherTargetTime && appointment.roomNumber === otherAppointment.roomNumber) {
        this.messageService.showError(`Cita ${index + 1}: Conflicto con Cita ${i + 1}. Ambas están programadas para la misma sala (${appointment.roomNumber}) en la misma fecha y hora. Por favor, seleccione otra sala u otro horario.`);
        return true;
      }
    }
    
    return false;
  }
}
