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
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-pacients',
  imports: [TableModule,ButtonModule,
    IconFieldModule,InputIconModule,InputTextModule,
    DialogModule,CommonModule,FormsModule,InputNumberModule,ToggleSwitchModule],
  templateUrl: './pacients.component.html',
  styleUrl: './pacients.component.css'
})
export class PacientsComponent implements OnInit{
  patients: Patient[]=[];
  displayDialog:boolean = false;
  isEditMode: boolean = false;
  currentPatient: Patient = this.resetPatient();
  checked: boolean = false;
  displayDetailDialog: boolean = false;

  private resetPatient(): Patient {
    return {
      identification_number: '',
      full_name: '',
      phone_number: '',
      emergency_phone_number: '',
      email: '',
      address: '',
      age: 0,
      created_at: ''
    };
  }
  

  ngOnInit(){
    this.patients = [
      {
        id: 1,
        uuid: 'a1b2c3d4',
        identification_number: '12345678',
        full_name: 'Juan Pérez',
        phone_number: '5551234',
        emergency_phone_number: '5555678',
        email: 'juan@example.com',
        address: '3',
        age: 30,
        created_at: '2025-05-13 10:00:00'
      },
      {
        id: 2,
        uuid: 'e5f6g7h8',
        identification_number: '87654321',
        full_name: 'María López',
        phone_number: '5559876',
        emergency_phone_number: '5554321',
        email: 'maria@example.com',
        address: '5',
        age: 25,
        created_at: '2025-05-13 09:30:00'
      }
    ];
  }
  showAddDialog() {
    this.isEditMode = false;
    this.currentPatient = this.resetPatient();
    this.currentPatient.id = this.patients.length + 1;
    this.currentPatient.uuid = crypto.randomUUID(); 
    this.currentPatient.created_at = new Date().toISOString(); 
    this.displayDialog = true;
  }

    showEditDialog(patient: Patient) {
    this.isEditMode = true;
    this.currentPatient = { ...patient }; 
    this.displayDialog = true;
  }

   cancelDialog() {
    this.displayDialog = false;
    this.currentPatient = this.resetPatient();
  }
  
  savePatient() {
    if (this.isEditMode) {
     
    } else {
     
      
    }
    this.displayDialog = false;
    this.currentPatient = this.resetPatient();
  }

  showDetailDialog(patient: Patient) {
    this.currentPatient = { ...patient };
    this.displayDetailDialog = true;
  }

  closeDetailDialog() {
    this.displayDetailDialog = false;
    this.currentPatient = this.resetPatient(); 
  }
}
