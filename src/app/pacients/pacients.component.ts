import { Component, OnInit } from '@angular/core';
import {Patient} from '../core/interfaces/patient';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-pacients',
  imports: [TableModule,ButtonModule,
    IconFieldModule,InputIconModule,InputTextModule,
    DialogModule,CommonModule,FormsModule,InputNumberModule],
  templateUrl: './pacients.component.html',
  styleUrl: './pacients.component.css'
})
export class PacientsComponent implements OnInit{
  patients: Patient[]=[];
  displayAddDialog:boolean = false;
  displayEditDialog: boolean = false;
  newPatient: Partial<Patient> = {
    id: 0,
    identification_number: '',
    full_name: '',
    phone_number: '',
    emergency_phone_number: '',
    email: '',
    address: '',
    age: 0
  };

  ngOnInit(){
    this.patients = [
      {
        id: 1,
        uuid: 'a1b2c3d4',
        identification_number: '12345678',
        full_name: 'Juan Pérez',
        phone_number: '555-1234',
        emergency_phone_number: '555-5678',
        email: 'juan@example.com',
        address: 'Calle 123, Ciudad',
        age: 30,
        created_at: '2025-05-13 10:00:00'
      },
      {
        id: 2,
        uuid: 'e5f6g7h8',
        identification_number: '87654321',
        full_name: 'María López',
        phone_number: '555-9876',
        emergency_phone_number: '555-4321',
        email: 'maria@example.com',
        address: 'Avenida 456, Ciudad',
        age: 25,
        created_at: '2025-05-13 09:30:00'
      }
    ];
  }
  showAddDialog() {
    this.newPatient = {
      id: this.patients.length + 1,
      identification_number: '',
      full_name: '',
      phone_number: '',
      emergency_phone_number: '',
      email: '',
      address: '',
      age: 0
    };
    this.displayAddDialog = true;
  }
  cancelAdd() {
    this.displayAddDialog = false;
  }
}
