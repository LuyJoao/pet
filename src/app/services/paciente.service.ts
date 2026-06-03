import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom , of} from 'rxjs';
import { map , catchError} from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Paciente {
  id?: string;
  nome: string;
  dataNascimento: string;
  cpf: string;
  numeroSus: string;
  telefone: string;
  email: string;
  cep: string;
  cidade: string;
  rua: string;
  bairro: string;
  numero: string;
  complemento: string;
  gender?: string; // Adicionado pois o backend exige
}

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  criarPaciente(paciente: Paciente): Promise<void> {
    const payload = this.mapFrontendToBackend(paciente);
    return firstValueFrom(this.http.post<void>(this.apiUrl, payload));
  }

  obterPacientes(): Observable<Paciente[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(pacientes => pacientes.map(p => this.mapBackendToFrontend(p)))
    );
  }

  obterPacientePorId(id: string): Observable<Paciente | undefined> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(p => p ? this.mapBackendToFrontend(p) : undefined)
    );
  }

  atualizarPaciente(id: string, paciente: Paciente): Promise<void> {
    const payload = this.mapFrontendToBackend(paciente);
    return firstValueFrom(this.http.put<void>(`${this.apiUrl}/${id}`, payload));
  }

  deletarPaciente(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
  }

  buscarPacientePorNome(nome: string): Observable<Paciente[]> {
    return this.http.get<any>(`${this.apiUrl}/name/${nome}`).pipe(
      map(p => p ? [this.mapBackendToFrontend(p)] : [])
    );
  }

  buscarPorCPF(cpf: string): Observable<Paciente[]> {
    return this.http.get<any>(`${this.apiUrl}/cpf/${cpf}`).pipe(
      map(p => p ? [this.mapBackendToFrontend(p)] : []),
      catchError(err => {
        return of([]);
      })
    );
  }

  buscarPorNumeroSus(susnumber: string): Observable<Paciente[]> {
    return this.http.get<any>(`${this.apiUrl}/susnumber/${susnumber}`).pipe(
      map(p => p ? [this.mapBackendToFrontend(p)] : [])
    );
  }

  // --- Funções de Mapeamento (Tradução de Chaves) ---

  private mapBackendToFrontend(backendData: any): Paciente {
    let dataFormatada = '';

    if (backendData.birth_date) {
      const dateObj = new Date(backendData.birth_date);
      dataFormatada = dateObj.toISOString().split('T')[0];
    }

    return {
      id: backendData.id,
      nome: backendData.name,
      dataNascimento: dataFormatada || backendData.dataNascimento,
      cpf: backendData.cpf,
      numeroSus: backendData.susnumber || backendData.numeroSus,
      telefone: backendData.phone || backendData.telefone,
      email: backendData.email,
      cep: backendData.cep,
      cidade: backendData.city || backendData.cidade,
      rua: backendData.street || backendData.rua,
      bairro: backendData.district || backendData.bairro,
      numero: backendData.number || backendData.numero,
      complemento: backendData.complement || backendData.complemento || '',
      gender: backendData.gender
    };
  }

  private mapFrontendToBackend(frontendData: Paciente): any {
    return {
      name: frontendData.nome,
      cpf: frontendData.cpf.replace(/\D/g, ''), // Garante envio de apenas números para a regra length(11) do Joi
      susnumber: frontendData.numeroSus,
      email: frontendData.email || undefined,
      birth_date: frontendData.dataNascimento,
      phone: frontendData.telefone,
      gender: frontendData.gender || 'Não informado', // Fallback caso o form do front não tenha esse campo
      cep: frontendData.cep,
      city: frontendData.cidade,
      street: frontendData.rua,
      district: frontendData.bairro,
      number: frontendData.numero,
      complement: frontendData.complemento || undefined
    };
  }
}
