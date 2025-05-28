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

interface Appointment {
  name: string;
  dni: string;
  email: string;
  phone: string;
  roomNumber: string;
  isCombined: boolean;
  attendance: 'Pendiente' | 'Confirmado' | 'No asistió' | 'Reprogramada';
  time: string;
  date?: string;
}

interface Patient {
  full_name: string;
  identification_number: string;
  email: string;
  phone_number: string;
}

type AppointmentsByDate = {
  [key: string]: Appointment[];
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
    RadioButtonModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  displayAppointmentsModal: boolean = false;
  displayNewAppointmentModal: boolean = false;
  displayAllAppointmentsModal: boolean = false;
  selectedDate: string = '';
  appointments: Appointment[] = [];
  allAppointments: Appointment[] = [];
  minDate: Date = new Date();
  calendarLocale: any = esLocale;
  searchText: string = '';
  
  attendanceOptions = [
    { label: 'Confirmado', value: 'Confirmado' },
    { label: 'No asistió', value: 'No asistió' },
    { label: 'Reprogramada', value: 'Reprogramada' }
  ];

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
    patient: null as Patient | null,
    roomNumber: '',
    isCombined: false
  };

  rooms = [
    { label: 'Sala 1', value: '1' },
    { label: 'Sala 2', value: '2' },
    { label: 'Sala 3', value: '3' }
  ];

  mockPatients: Patient[] = [
    {
      full_name: 'Juan Pérez',
      identification_number: '1234567890',
      email: 'juan@email.com',
      phone_number: '0987654321'
    },
    {
      full_name: 'María García',
      identification_number: '0987654321',
      email: 'maria@email.com',
      phone_number: '1234567890'
    }
  ];

  filteredPatients: Patient[] = [];

  mockAppointments: AppointmentsByDate = {
    [new Date().toISOString().split('T')[0]]: [
      {
        name: 'Ana Martínez',
        dni: '1723456789',
        email: 'ana@email.com',
        phone: '0987654321',
        roomNumber: '101',
        isCombined: false,
        attendance: 'Pendiente',
        time: '09:00',
        date: new Date().toISOString().split('T')[0]
      },
      {
        name: 'Pedro Sánchez',
        dni: '1798765432',
        email: 'pedro@email.com',
        phone: '0912345678',
        roomNumber: '102',
        isCombined: true,
        attendance: 'Confirmado',
        time: '11:30',
        date: new Date().toISOString().split('T')[0]
      }
    ],
    '2024-03-15': [
      {
        name: 'Juan Pérez',
        dni: '1234567890',
        email: 'juan@email.com',
        phone: '0987654321',
        roomNumber: '101',
        isCombined: true,
        attendance: 'Pendiente',
        time: '09:00',
        date: '2024-03-15'
      },
      {
        name: 'María García',
        dni: '0987654321',
        email: 'maria@email.com',
        phone: '1234567890',
        roomNumber: '102',
        isCombined: false,
        attendance: 'Confirmado',
        time: '10:00',
        date: '2024-03-15'
      }
    ],
    '2024-03-20': [
      {
        name: 'Carlos López',
        dni: '5678901234',
        email: 'carlos@email.com',
        phone: '0987123456',
        roomNumber: '103',
        isCombined: true,
        attendance: 'Pendiente',
        time: '11:00',
        date: '2024-03-20'
      }
    ]
  };

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

  ngOnInit() {
    this.loadCalendarEvents();
    this.setInitialTime();
    this.loadAllAppointments();
  }

  loadAllAppointments() {
    this.allAppointments = Object.entries(this.mockAppointments).flatMap(([date, appointments]) => 
      appointments.map(appointment => ({
        ...appointment,
        date
      }))
    ).sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });
  }

  showAllAppointments() {
    this.displayAllAppointmentsModal = true;
  }

  filterAppointments(): Appointment[] {
    if (!this.searchText) return this.allAppointments;

    const searchLower = this.searchText.toLowerCase();
    return this.allAppointments.filter(appointment => 
      appointment.name.toLowerCase().includes(searchLower) ||
      appointment.dni.includes(searchLower) ||
      appointment.email.toLowerCase().includes(searchLower) ||
      appointment.phone.includes(searchLower) ||
      this.formatDate(appointment.date!).toLowerCase().includes(searchLower)
    );
  }

  setInitialTime() {
    const now = new Date();
    now.setHours(8, 0, 0);
    this.newAppointment.time = now;
  }

  loadCalendarEvents() {
    const events: EventSourceInput = [];
    Object.entries(this.mockAppointments).forEach(([date, appointments]) => {
      events.push({
        title: `${appointments.length} citas`,
        start: date,
        display: 'background',
        backgroundColor: '#FF725E33',
        textColor: '#000000',
        classNames: ['appointment-count'],
        extendedProps: {
          appointmentCount: appointments.length
        }
      });
    });
    this.calendarOptions.events = events;
  }

  handleDateClick(info: { dateStr: string }) {
    const dateStr = info.dateStr;
    const appointmentsForDay = this.mockAppointments[dateStr] || [];
    
    if (appointmentsForDay.length > 0) {
      this.selectedDate = dateStr;
      this.appointments = appointmentsForDay.map(appointment => ({
        ...appointment,
        attendance: appointment.attendance as "Pendiente" | "Confirmado" | "No asistió" | "Reprogramada"
      }));
      this.displayAppointmentsModal = true;
    }
  }

  updateAttendance(appointment: Appointment, newAttendance: string) {
    appointment.attendance = newAttendance as Appointment['attendance'];
    console.log('Asistencia actualizada:', appointment);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: string, time: string): string {
    return `${this.formatDate(date)} - ${time}`;
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
      isCombined: false
    };
  }

  searchPatient(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    this.filteredPatients = this.mockPatients.filter(patient => 
      patient.identification_number.toLowerCase().includes(query) ||
      patient.full_name.toLowerCase().includes(query)
    );
  }

  onPatientSelect(event: any) {
    const patient = event.value as Patient;
    this.newAppointment.patient = patient;
    this.newAppointment.patientDni = patient.identification_number;
  }

  createNewPatient() {
    console.log('Abrir modal de crear paciente');
  }

  saveAppointment() {
    console.log('Guardar cita:', this.newAppointment);
    this.displayNewAppointmentModal = false;
    this.resetNewAppointment();
  }
}
