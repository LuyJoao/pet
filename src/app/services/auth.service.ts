import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private usuarioLogadoSubject = new BehaviorSubject<any | null>(null);
  public usuarioLogado$ = this.usuarioLogadoSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const storedUser = localStorage.getItem('@ConectaSUS:user');
    const storedToken = localStorage.getItem('@ConectaSUS:token');

    if (storedUser && storedToken) {
      this.usuarioLogadoSubject.next(JSON.parse(storedUser));
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/sessions`, { email, password })
      );

      const { user, token } = response;

      localStorage.setItem('@ConectaSUS:token', token);
      localStorage.setItem('@ConectaSUS:user', JSON.stringify(user));

      this.usuarioLogadoSubject.next(user);
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('@ConectaSUS:token');
    localStorage.removeItem('@ConectaSUS:user');
    this.usuarioLogadoSubject.next(null);
    this.router.navigate(['/login']);
  }

  async registerInterno(email: string, password: string, departamento: string, nome: string, tipo: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/interns`, { email, password, departamento, nome, tipo })
    );
  }

  async atualizarUsuario(id: string, nome: string, tipo: string, departamento: string, email: string): Promise<void> {
    let rota = 'secretarys';
    const payload: any = {
      name: nome,
      email: email
    };

    if (tipo === 'Estagiário') {
      rota = 'interns';
      if (departamento) {
        payload.departament = departamento;
      }
    } else if (tipo === 'Professor') {
      rota = 'professors';
      if (departamento) {
        payload.departament = departamento;
      }
    }

    await firstValueFrom(
      this.http.put(`${this.apiUrl}/${rota}/${id}`, payload)
    );
  }

  async enviarEmailRedefinicaoSenha(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/password/forgot`, { email })
    );
  }

  async getUsuarioLogado(): Promise<any | null> {
    return firstValueFrom(this.usuarioLogado$);
  }

  async getTipoUsuario(): Promise<string | null> {
    const user = await this.getUsuarioLogado();
    return user?.tipo || null;
  }

  getTipoUsuarioLocal(): string | null {
    return this.usuarioLogadoSubject.getValue()?.tipo || null;
  }

  getUser(): Observable<any> {
    return this.usuarioLogado$;
  }

  podeGerenciarUsuarios(): Observable<boolean> {
    return this.usuarioLogado$.pipe(map(user => user?.tipo === 'Secretaria'));
  }

  podeGerenciarEstagiarios(): Observable<boolean> {
    return this.usuarioLogado$.pipe(map(user => user?.tipo === 'Professor' || user?.tipo === 'Secretaria'));
  }

  private handleAuthError(error: HttpErrorResponse): void {
    let errorMsg = "Erro ao processar a solicitação. Tente novamente.";

    if (error.status === 401) {
      errorMsg = "Email ou senha incorretos.";
    } else if (error.status === 400) {
      errorMsg = "Dados inválidos fornecidos.";
    } else if (error.error && error.error.message) {
      errorMsg = error.error.message;
    }

    Swal.fire({
      icon: 'error',
      title: 'Erro de autenticação',
      text: errorMsg,
      confirmButtonColor: '#0d47a1'
    });
  }
}
