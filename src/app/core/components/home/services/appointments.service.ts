import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface Appointment {
  id: number;
  name: string;
  dateTime: string;
  isShared: boolean;
  createdAt: string;
  attendanceStatus: string;
  comments?: string;
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
  comments?: string;
}

export interface UpdateCommentsDto {
  comments: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentsService {
  private apiUrl = `${environment.baseUrl}/appointment`;

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

  updateComments(appointmentId: number, updateCommentsDto: UpdateCommentsDto): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${appointmentId}/comments`, updateCommentsDto);
  }

  deleteAppointment(appointmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${appointmentId}`);
  }
} 