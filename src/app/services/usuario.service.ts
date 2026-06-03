import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Usuario {
  id?: string;
  name?: string;
  email: string;
  password?: string;
  old_password?: string;
  password_confirmation?: string;
  role?: string;
  uid?: string;
  nome?: string;
  tipo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obterUsuarios(): Observable<Usuario[]> {
    return forkJoin({
      secretarias: this.http.get<Usuario[]>(`${this.apiUrl}/secretarys`).pipe(catchError(() => of([]))),
      professores: this.http.get<Usuario[]>(`${this.apiUrl}/professors`).pipe(catchError(() => of([]))),
      estagiarios: this.http.get<Usuario[]>(`${this.apiUrl}/interns`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ secretarias, professores, estagiarios }) => {
        const secMapped = secretarias.map(s => ({ ...s, tipo: 'Secretaria', nome: s.name || s.nome, id: s.id || s.uid }));
        const profMapped = professores.map(p => ({ ...p, tipo: 'Professor', nome: p.name || p.nome, id: p.id || p.uid }));
        const estagMapped = estagiarios.map(e => ({ ...e, tipo: 'Estagiário', nome: e.name || e.nome, id: e.id || e.uid }));

        return [...secMapped, ...profMapped, ...estagMapped];
      })
    );
  }

  excluirUsuario(id: string, tipo?: string): Observable<void> {
    if (tipo === 'Estagiário') return this.http.delete<void>(`${this.apiUrl}/interns/${id}`);
    if (tipo === 'Professor') return this.http.delete<void>(`${this.apiUrl}/professors/${id}`);
    return this.http.delete<void>(`${this.apiUrl}/secretarys/${id}`);
  }

  obterProfessores(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/professors`);
  }

  obterUsuariosPorTipo(tipo: string): Observable<Usuario[]> {
    if (tipo === 'Estagiário') return this.http.get<Usuario[]>(`${this.apiUrl}/interns`);
    if (tipo === 'Professor') return this.http.get<Usuario[]>(`${this.apiUrl}/professors`);
    return this.http.get<Usuario[]>(`${this.apiUrl}/secretarys`);
  }

  obterEstagiariosDoProfessor(professorId: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/interns/professor/${professorId}`);
  }

  criarEstagiario(dados: any): Promise<any> {
    return firstValueFrom(this.http.post(`${this.apiUrl}/interns`, dados));
  }
}
