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
import { ClientsService, Client } from './services/clients.service';
import { HttpClientModule } from '@angular/common/http';
import { AppMessageService } from '../core/services/message.service';
import { ConfirmService } from '../core/services/confirm.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-pacients',
  imports: [TableModule,ButtonModule,
    IconFieldModule,InputIconModule,InputTextModule,
    DialogModule,CommonModule,FormsModule,InputNumberModule,ToggleSwitchModule, HttpClientModule],
  templateUrl: './pacients.component.html',
  styleUrl: './pacients.component.css'
})

export class PacientsComponent implements OnInit{
  patients: Patient[]=[];
  filteredPatients: Patient[]=[];
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  displayDialog:boolean = false;
  isEditMode: boolean = false;
  currentPatient: Patient = this.resetPatient();
  checked: boolean = false;
  displayDetailDialog: boolean = false;
  cedulaInvalida: boolean = false;
  telefonoInvalido: boolean = false;

  constructor(
    private clientsService: ClientsService,
    private messageService: AppMessageService,
    private confirmService: ConfirmService
  ) {}

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
    this.getAllPatients();
    this.searchSubject.pipe(debounceTime(300)).subscribe(term => {
      this.filterPatients(term);
    });
  }

  getAllPatients() {
    this.clientsService.getAllClients().subscribe((clients: Client[]) => {
      this.patients = clients.map(client => this.clientToPatient(client));
      this.filterPatients(this.searchTerm);
    });
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  filterPatients(term: string) {
    if (!term) {
      this.filteredPatients = this.patients;
    } else {
      this.filteredPatients = this.patients.filter(p =>
        p.identification_number.toLowerCase().includes(term.toLowerCase())
      );
    }
  }

  showAddDialog() {
    this.isEditMode = false;
    this.currentPatient = this.resetPatient();
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
    if (!this.isValidEcuadorianID(this.currentPatient.identification_number)) {
      this.messageService.showError('La cédula ingresada no es válida.');
      return;
    }
    const client = this.patientToClient(this.currentPatient);
    if (this.isEditMode && this.currentPatient.id) {
      this.clientsService.updateClient(this.currentPatient.id, client).subscribe({
        next: () => {
          this.getAllPatients();
          this.messageService.showSuccess('Paciente actualizado correctamente');
        },
        error: () => {
          this.messageService.showError('Error al actualizar el paciente');
        }
      });
    } else {
      this.clientsService.createClient(client).subscribe({
        next: () => {
          this.getAllPatients();
          this.messageService.showSuccess('Paciente creado correctamente');
        },
        error: () => {
          this.messageService.showError('Error al crear el paciente');
        }
      });
    }
    this.displayDialog = false;
    this.currentPatient = this.resetPatient();
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

  async deletePatient(patient: Patient) {
    const confirmed = await this.confirmService.confirmDanger('¿Estás seguro de eliminar este paciente?');
    if (confirmed && patient.id) {
      this.clientsService.deleteClient(patient.id).subscribe({
        next: () => {
          this.getAllPatients();
          this.messageService.showSuccess('Paciente eliminado correctamente');
        },
        error: () => {
          this.messageService.showError('Error al eliminar el paciente');
        }
      });
    }
  }

  showDetailDialog(patient: Patient) {
    this.currentPatient = { ...patient };
    this.displayDetailDialog = true;
  }

  closeDetailDialog() {
    this.displayDetailDialog = false;
    this.currentPatient = this.resetPatient();
  }

  onCedulaChange(value: string) {
    if (value.length > 10) {
      this.currentPatient.identification_number = value.slice(0, 10);
    }
    this.cedulaInvalida =
      this.currentPatient.identification_number.length === 10 &&
      !this.isValidEcuadorianID(this.currentPatient.identification_number);
  }

  onTelefonoChange(value: string, field: 'phone_number' | 'emergency_phone_number') {
    if (value.length > 10) {
      this.currentPatient[field] = value.slice(0, 10);
    }
    this.telefonoInvalido =
      this.currentPatient.phone_number.length > 0 && this.currentPatient.phone_number.length < 10;
  }

  // Conversión entre Patient (frontend) y Client (backend)
  private clientToPatient(client: Client): Patient {
    return {
      id: (client as any).id, // si el backend devuelve id
      identification_number: client.idNumber,
      full_name: client.fullName,
      phone_number: client.phone,
      emergency_phone_number: client.emergencyPhone,
      email: client.email,
      address: client.address,
      age: client.age,
      created_at: (client as any).created_at || ''
    };
  }

  private patientToClient(patient: Patient): Client {
    return {
      idNumber: patient.identification_number,
      fullName: patient.full_name,
      email: patient.email,
      phone: patient.phone_number,
      emergencyPhone: patient.emergency_phone_number,
      address: patient.address,
      age: patient.age
    };
  }
}
