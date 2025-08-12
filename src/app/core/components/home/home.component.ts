import { Component, OnInit } from '@angular/core';
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
    { label: 'Agenda' },
    { label: 'Datos del Cliente' },
    { label: 'Información de Cita' }
  ];
  activeStep: number = 0;
  
  newAppointment = {
    date: new Date(),
    time: new Date(),
    patientDni: '',
    patient: null as any,
    roomNumber: '',
    isCombined: false,
    name: '' // nuevo campo para el nombre de la cita
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
    private confirmService: ConfirmService
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
      // Forzar actualización del calendario
      this.calendarOptions = { ...this.calendarOptions, events: [] };
      setTimeout(() => this.loadCalendarEvents(), 0);
    });
  }

  showAllAppointments() {
    this.displayAllAppointmentsModal = true;
  }

  filterAppointments(): BackendAppointment[] {
    if (!this.searchText) return this.allAppointments;
    const searchLower = this.searchText.toLowerCase();
    return this.allAppointments.filter(appointment => 
      appointment.name.toLowerCase().includes(searchLower) ||
      appointment.client.idNumber.includes(searchLower) ||
      appointment.client.fullName.toLowerCase().includes(searchLower) ||
      appointment.client.email.toLowerCase().includes(searchLower) ||
      appointment.client.phone.includes(searchLower) ||
      appointment.room.name.toLowerCase().includes(searchLower) ||
      appointment.dateTime.toLowerCase().includes(searchLower)
    );
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
    if (this.activeStep < 2) {
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
      patientDni: '',
      patient: null,
      roomNumber: '',
      isCombined: false,
      name: ''
    };
  }

  // Eliminar searchPatient y filteredPatients

  onPatientSelect(event: any) {
    const patient = event.value as Patient;
    this.newAppointment.patient = patient;
    this.newAppointment.patientDni = patient.identification_number;
  }

  createNewPatient() {
    console.log('Abrir modal de crear paciente');
  }

  saveAppointment() {
    if (!this.newAppointment.patient || !this.newAppointment.date || !this.newAppointment.time) return;
    const date = this.newAppointment.date;
    const time = this.newAppointment.time;
    // Construir dateTime en formato local (YYYY-MM-DDTHH:mm:ss) y restar 5 horas para UTC-5
    const localDate = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      time.getHours(), time.getMinutes()
    );
    localDate.setHours(localDate.getHours() - 5); // Ajuste por zona horaria Ecuador
    const dateTime = localDate.getFullYear() + '-' +
      String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
      String(localDate.getDate()).padStart(2, '0') + 'T' +
      String(localDate.getHours()).padStart(2, '0') + ':' +
      String(localDate.getMinutes()).padStart(2, '0') + ':00';
    const appointmentReq: CreateAppointmentRequest = {
      name: this.newAppointment.name || 'Cita',
      dateTime,
      isShared: this.newAppointment.isCombined,
      roomId: Number(this.newAppointment.roomNumber),
      clientId: this.newAppointment.patient.id
    };
    this.appointmentsService.createAppointment(appointmentReq).subscribe({
      next: () => {
        this.getAllAppointments();
        this.displayNewAppointmentModal = false;
        this.resetNewAppointment();
        this.messageService.showSuccess('Cita creada correctamente');
      },
      error: () => {
        this.messageService.showError('Error al crear la cita');
      }
    });
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
}
