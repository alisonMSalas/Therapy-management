import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Client {
  idNumber: string;
  fullName: string;
  email: string;
  phone: string;
  emergencyPhone: string;
  address: string;
  age: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private apiUrl = `${environment.baseUrl}/client`;

  constructor(private http: HttpClient) {}

  createClient(client: Client): Observable<any> {
    return this.http.post(this.apiUrl, client);
  }

  getAllClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl);
  }

  getClientById(id: string | number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  updateClient(id: string | number, client: Client): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, client);
  }

  deleteClient(id: string | number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
} 