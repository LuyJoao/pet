import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Agendamento {
  id?: string;
  agendamentoId?: string;
  data?: string | Date;
  hora?: string;
  nome?: string;
  idade?: number;
  pacienteId: string;
  estagiarioNome?: string;
  estagiarioUid: string;
  professorResponsavelUid?: string;
  professorResponsavelNome?: string;
  anamnese?: string;
  exameFisico?: string;
  solicitacaoExames?: string;
  orientacao?: string;
  prescricao?: string;
  conduta?: string;
  cid10?: string;
  status?: 'pendente' | 'aceito' | 'rejeitado' | 'finalizado';
  observacaoProfessor?: string;
  documento?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgendamentoService {
  private apiUrlAppointments = `${environment.apiUrl}/appointments`;
  private apiUrlRecords = `${environment.apiUrl}/records`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private extrairDataLocal(data: Date | string): string {
    if (typeof data === 'string') return data.split('T')[0];

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  obterTodosPendentes(): Observable<Agendamento[]> {
    return this.http.get<any[]>(this.apiUrlAppointments).pipe(
      map(agendamentos => agendamentos.filter(a => a.status === 'pendente').map(a => this.mapAppointmentToFrontend(a))),
      catchError(() => of([]))
    );
  }

  obterPendentesDoEstagiario(estagiarioUid: string): Observable<Agendamento[]> {
    return this.http.get<any[]>(`${this.apiUrlAppointments}/intern/${estagiarioUid}`).pipe(
      map(agendamentos => agendamentos
        .map(a => this.mapAppointmentToFrontend(a))
        .filter(a => a.status === 'pendente')
      ),
      catchError(() => of([]))
    );
  }

  obterPendentesDoProfessor(professorUid: string): Observable<Agendamento[]> {
    return this.http.get<any[]>(this.apiUrlAppointments).pipe(
      map(agendamentos => agendamentos
        .map(a => this.mapAppointmentToFrontend(a))
        .filter(a => a.status === 'pendente' && a.professorResponsavelUid === professorUid)
      ),
      catchError(() => of([]))
    );
  }

  obterAgendamentosPorProfessorResponsavel(professorUid: string, data: Date | string): Observable<Agendamento[]> {
    const dataFormatada = this.extrairDataLocal(data);
    return this.http.get<any[]>(`${this.apiUrlAppointments}/date/${dataFormatada}`).pipe(
      map(agend => agend
        .map(a => this.mapAppointmentToFrontend(a))
        .filter(a => a.professorResponsavelUid === professorUid)
      ),
      catchError(() => of([]))
    );
  }

  obterAgendamentosPorData(data: Date | string): Observable<Agendamento[]> {
    const dataFormatada = this.extrairDataLocal(data);
    return this.http.get<any[]>(`${this.apiUrlAppointments}/date/${dataFormatada}`).pipe(
      map(agendamentos => agendamentos.map(a => this.mapAppointmentToFrontend(a))),
      catchError(() => of([]))
    );
  }

  obterMeusAgendamentosPorData(estagiarioUid: string, data: Date | string): Observable<Agendamento[]> {
    const dataFormatada = this.extrairDataLocal(data);
    return this.http.get<any[]>(`${this.apiUrlAppointments}/date/${dataFormatada}`).pipe(
      map(agendamentos => agendamentos
        .map(a => this.mapAppointmentToFrontend(a))
        .filter(a => a.estagiarioUid === estagiarioUid)
      ),
      catchError(() => of([]))
    );
  }

  salvarAgendamento(agendamento: Agendamento): Promise<any> {
    const payload = this.mapAppointmentToBackend(agendamento);
    return firstValueFrom(this.http.post(this.apiUrlAppointments, payload));
  }

  atualizarAgendamento(agendamento: Agendamento): Promise<any> {
    const payload = this.mapAppointmentToBackend(agendamento);
    return firstValueFrom(this.http.put(`${this.apiUrlAppointments}/${agendamento.id}`, payload));
  }

  excluirAgendamento(id: string): Promise<any> {
    return firstValueFrom(this.http.delete(`${this.apiUrlAppointments}/${id}`));
  }

  async marcarAgendamentoComoFinalizado(id: string): Promise<any> {
    const b = await firstValueFrom(this.http.get<any>(`${this.apiUrlAppointments}/${id}`));
    if (b) {
      const payload = {
        date_time: b.date_time,
        status: 'finalizado',
        intern_id: b.intern_id || b.intern?.id,
        patient_id: b.patient_id || b.patient?.id,
        professor_id: b.professor_id || b.professor?.id
      };
      return firstValueFrom(this.http.put(`${this.apiUrlAppointments}/${id}`, payload));
    }
    throw new Error('Agendamento não encontrado.');
  }

  private formatarDataLocal(data: Date | string): string {
    if (typeof data === 'string') return data.split('T')[0];

    const year = data.getFullYear();
    const month = String(data.getMonth() + 1).padStart(2, '0');
    const day = String(data.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  obterAtendimentoPorId(id: string): Observable<Agendamento> {
    return this.http.get<any>(`${this.apiUrlRecords}/${id}`).pipe(map(a => this.mapRecordToFrontend(a)));
  }

  getAtendimentoById(id: string): Observable<Agendamento> {
    return this.obterAtendimentoPorId(id);
  }

  async getAtendimentoPorAgendamentoId(agendamentoId: string): Promise<Agendamento | null> {
    try {
      const res = await firstValueFrom(this.http.get<any>(`${this.apiUrlRecords}/appointment/${agendamentoId}`));
      return this.mapRecordToFrontend(res);
    } catch { return null; }
  }

  async obterAtendimentosPorPaciente(pacienteId: string): Promise<Agendamento[]> {
    try {
      const res = await firstValueFrom(this.http.get<any[]>(`${this.apiUrlRecords}/patient/${pacienteId}`));
      return res.map(r => this.mapRecordToFrontend(r));
    } catch { return []; }
  }

  obterAtendimentosAvaliadosPorEstagiario(uid: string): Observable<Agendamento[]> {
    return this.http.get<any[]>(`${this.apiUrlRecords}/intern`).pipe(
      map(records => records
        .map(r => this.mapRecordToFrontend(r))
        .filter(r => r.status === 'aceito' || r.status === 'rejeitado')
      ),
      catchError(() => of([]))
    );
  }

  obterAtendimentosAvaliadosPorProfessor(uid: string): Observable<Agendamento[]> {
    return this.http.get<any[]>(this.apiUrlRecords).pipe(
      map(records => records
        .map(r => this.mapRecordToFrontend(r))
        .filter(r => r.professorResponsavelUid === uid && (r.status === 'aceito' || r.status === 'rejeitado'))
      ),
      catchError(() => of([]))
    );
  }

  criarAtendimento(atendimento: Agendamento): Promise<any> {
    const payload = this.mapRecordToBackend(atendimento);
    return firstValueFrom(this.http.post(this.apiUrlRecords, payload));
  }

  async atualizarAtendimento(id: string, dados: Partial<Agendamento>): Promise<void> {
    const payload = this.mapRecordToBackend(dados as Agendamento);
    await firstValueFrom(this.http.put(`${this.apiUrlRecords}/${id}`, payload));
  }

  async avaliarEFinalizar(atendimentoId: string, agendamentoId: string, novoStatus: 'aceito' | 'rejeitado', observacao: string): Promise<void> {
    const aproved = novoStatus === 'aceito';

    await firstValueFrom(this.http.patch(`${this.apiUrlRecords}/approve/${atendimentoId}`, {
      aproved,
      observacaoProfessor: observacao
    }));

    const b = await firstValueFrom(this.http.get<any>(`${this.apiUrlAppointments}/${agendamentoId}`));

    if (b) {
      const payload = {
        date_time: b.date_time,
        status: novoStatus,
        intern_id: b.intern_id || b.intern?.id,
        patient_id: b.patient_id || b.patient?.id,
        professor_id: b.professor_id || b.professor?.id
      };

      await firstValueFrom(this.http.put(`${this.apiUrlAppointments}/${agendamentoId}`, payload));
    }
  }

  private mapAppointmentToFrontend(backendData: any): Agendamento {
    let dataFormatada = ''; let horaFormatada = '';

    if (backendData.date_time) {
      const dateObj = new Date(backendData.date_time);
      dataFormatada = dateObj.toISOString().split('T')[0];
      horaFormatada = dateObj.toISOString().split('T')[1].substring(0, 5);
    }

    let idadeCalculada: number | undefined;
    const dataNasc = backendData.patient?.birth_date || backendData.patient?.birthDate || backendData.patient?.dataNascimento;

    if (dataNasc) {
      const nascimento = new Date(dataNasc);
      const diff = Date.now() - nascimento.getTime();
      idadeCalculada = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }

    return {
      ...backendData,
      id: backendData.id,
      data: backendData.data || dataFormatada,
      hora: backendData.hora || horaFormatada,

      pacienteId: backendData.patient_id || backendData.patient?.id || backendData.pacienteId,
      estagiarioUid: backendData.intern_id || backendData.intern?.id || backendData.estagiarioUid,
      professorResponsavelUid: backendData.professor_id || backendData.professor?.id || backendData.professorResponsavelUid,

      nome: backendData.patient?.name || backendData.nome || 'Paciente',
      idade: backendData.idade || idadeCalculada,
      estagiarioNome: backendData.intern?.name || 'Não informado',
      professorResponsavelNome: backendData.professor?.name || backendData.professorResponsavelNome || 'Não informado',
      status: backendData.status || 'pendente'
    };
  }

  private mapAppointmentToBackend(frontendData: Agendamento): any {
    return {
      date_time: `${frontendData.data}T${frontendData.hora}:00.000Z`,
      status: frontendData.status || 'pendente',
      intern_id: frontendData.estagiarioUid,
      patient_id: frontendData.pacienteId,
      professor_id: frontendData.professorResponsavelUid
    };
  }

  private mapRecordToFrontend(b: any): Agendamento {
    let dataFormatada = '';
    if (b.appointment?.date_time) {
      const dateObj = new Date(b.appointment.date_time);
      dataFormatada = dateObj.toISOString().split('T')[0];
    }

    return {
      id: b.id,
      anamnese: b.anamnesis,
      exameFisico: b.physicalExam,
      solicitacaoExames: b.solicitedTests,
      orientacao: b.instructions,
      prescricao: b.prescription,
      conduta: b.conduct,
      cid10: b.cid10,
      status: b.aproved === true ? 'aceito' : b.aproved === false ? 'rejeitado' : 'pendente',
      observacaoProfessor: b.professor_observation,
      agendamentoId: b.appointment_id || b.appointment?.id,
      pacienteId: b.patient_id || b.patient?.id || b.appointment?.patient_id,
      estagiarioUid: b.intern_id || b.intern?.id || b.appointment?.intern_id,
      professorResponsavelUid: b.appointment?.professor_id || b.appointment?.professor?.id,
      nome: b.patient?.name || b.appointment?.patient?.name || b.nome || 'Paciente',
      estagiarioNome: b.intern?.name || b.appointment?.intern?.name || b.estagiarioNome || 'Não informado',
      professorResponsavelNome: b.appointment?.professor?.name || b.professorResponsavelNome || 'Não informado',
      data: b.data || dataFormatada,
      documento: b.document
    };
  }

  private mapRecordToBackend(f: Agendamento): any {
    return {
      anamnesis: f.anamnese,
      physicalExam: f.exameFisico,
      solicitedTests: f.solicitacaoExames,
      instructions: f.orientacao,
      prescription: f.prescricao,
      conduct: f.conduta,
      cid10: f.cid10,
      aproved: f.status === 'aceito' ? true : f.status === 'rejeitado' ? false : null,
      intern_id: f.estagiarioUid,
      patient_id: f.pacienteId,
      appointment_id: f.agendamentoId
    };
  }

  uploadDocumentoAtendimento(recordId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('document', file);
    return firstValueFrom(this.http.patch(`${this.apiUrlRecords}/${recordId}/document`, formData));
  }

}

