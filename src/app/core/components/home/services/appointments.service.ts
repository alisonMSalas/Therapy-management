import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Appointment {
  id: number;
  name: string;
  dateTime: string;
  isShared: boolean;
  createdAt: string;
  attendanceStatus: string;
  room: {
    id: number;
    name: string;
    createdAt: string;
  };
  client: {
    id: number;
    idNumber: string;
    fullName: string;
    email: string;
    phone: string;
    emergencyPhone: string;
    address: string;
    age: number;
    createdAt: string;
  };
}

export interface CreateAppointmentRequest {
  name: string;
  dateTime: string;
  isShared: boolean;
  roomId: number;
  clientId: number;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentsService {
  private apiUrl = 'http://localhost:3000/appointment';

  constructor(private http: HttpClient) {}

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.apiUrl);
  }

  createAppointment(appointment: CreateAppointmentRequest): Observable<any> {
    return this.http.post(this.apiUrl, appointment);
  }

  updateAttendance(appointmentId: number, attendanceStatus: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${appointmentId}/attendance`, { attendanceStatus });
  }

  deleteAppointment(appointmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${appointmentId}`);
  }
} 