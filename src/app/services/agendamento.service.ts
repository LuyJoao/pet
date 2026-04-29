import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Agendamento {
  id?: string;
  agendamentoId?: string;
  data: string | Date;
  hora: string;
  nome: string;
  idade: number;
  pacienteId: string;
  estagiarioNome: string;
  estagiarioUid: string;
  professorResponsavelUid: string;
  professorResponsavelNome: string;
  anamnese?: string;
  exameFisico?: string;
  solicitacaoExames?: string;
  orientacao?: string;
  prescricao?: string;
  conduta?: string;
  cid10?: string;
  status?: 'pendente' | 'aceito' | 'rejeitado' | 'finalizado';
  observacaoProfessor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgendamentoService {
  private agendamentosCollection: AngularFirestoreCollection<Agendamento>;
  private atendimentosCollection: AngularFirestoreCollection<Agendamento>;

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {
    this.agendamentosCollection = this.firestore.collection<Agendamento>('agendamentos');
    this.atendimentosCollection = this.firestore.collection<Agendamento>('atendimentos');
  }

  // NOVA FUNÇÃO: Busca todos os pendentes no banco inteiro (passados e futuros)
  obterTodosPendentes(): Observable<Agendamento[]> {
    return this.firestore.collection<Agendamento>('agendamentos', ref =>
      ref.where('status', '==', 'pendente')
        .orderBy('data', 'asc') // Ordena do mais antigo para o mais novo
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() })))
    );
  }

  obterPendentesDoEstagiario(estagiarioUid: string): Observable<Agendamento[]> {
    return this.firestore.collection<Agendamento>('agendamentos', ref =>
      ref.where('status', '==', 'pendente')
        .where('estagiarioUid', '==', estagiarioUid)
        .orderBy('data', 'asc')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() })))
    );
  }

  obterPendentesDoProfessor(professorUid: string): Observable<Agendamento[]> {
    return this.firestore.collection<Agendamento>('agendamentos', ref =>
      ref.where('status', '==', 'pendente')
        .where('professorResponsavelUid', '==', professorUid)
        .orderBy('data', 'asc')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() })))
    );
  }

  obterAgendamentosPorData(data: Date): Observable<Agendamento[]> {
    const dataFormatada = data.toISOString().split('T')[0];
    return this.firestore.collection<Agendamento>('agendamentos', ref => ref.where('data', '==', dataFormatada))
      .snapshotChanges().pipe(map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() }))));
  }

  async obterMeusAgendamentosPorData(data: Date): Promise<Observable<Agendamento[]>> {
    const usuarioLogado = await this.authService.getUsuarioLogado();
    if (!usuarioLogado) return of([]);
    const dataFormatada = data.toISOString().split('T')[0];
    return this.firestore.collection<Agendamento>('agendamentos', ref => ref
      .where('data', '==', dataFormatada)
      .where('estagiarioUid', '==', usuarioLogado.uid)
    ).snapshotChanges().pipe(map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() }))));
  }

  async obterAgendamentosPorProfessorResponsavel(professorUid: string, data: Date): Promise<Observable<Agendamento[]>> {
    const dataFormatada = data.toISOString().split('T')[0];
    return this.firestore.collection<Agendamento>('agendamentos', ref => ref
      .where('data', '==', dataFormatada)
      .where('professorResponsavelUid', '==', professorUid)
    ).snapshotChanges().pipe(map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() }))));
  }

  async obterAtendimentosPorPaciente(pacienteId: string): Promise<Agendamento[]> {
    const snapshot = await this.atendimentosCollection.ref.where('pacienteId', '==', pacienteId).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Agendamento }));
  }

  getAtendimentoById(id: string): Observable<Agendamento | undefined> {
    return this.atendimentosCollection.doc<Agendamento>(id).snapshotChanges().pipe(
      map(action => {
        if (!action.payload.exists) return undefined;
        const data = action.payload.data();
        return { id, ...data };
      })
    );
  }

  async getAtendimentoPorAgendamentoId(agendamentoId: string): Promise<Agendamento | null> {
    const snapshot = await this.atendimentosCollection.ref.where('agendamentoId', '==', agendamentoId).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  salvarAgendamento(agendamento: Agendamento): Promise<any> {
    return this.agendamentosCollection.add(agendamento);
  }

  atualizarAgendamento(agendamento: Agendamento): Promise<void> {
    return this.agendamentosCollection.doc(agendamento.id).update(agendamento);
  }

  excluirAgendamento(id: string): Promise<void> {
    return this.agendamentosCollection.doc(id).delete();
  }

  criarAtendimento(atendimento: Agendamento): Promise<any> {
    const { id, ...data } = atendimento;
    return this.atendimentosCollection.add(data);
  }

  async obterAtendimentoPorId(id: string): Promise<Agendamento | undefined> {
    try {
      const doc = await this.atendimentosCollection.doc(id).ref.get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Agendamento;
    } catch (error) {
      console.error('Erro ao obter atendimento por ID:', error);
      return undefined;
    }
  }

  async atualizarAtendimento(id: string, dados: Partial<Agendamento>): Promise<void> {
    try {
      await this.atendimentosCollection.doc(id).update(dados);
      console.log(`Atendimento ${id} atualizado com sucesso.`);
    } catch (error) {
      console.error('Erro ao atualizar atendimento:', error);
      throw error;
    }
  }

  marcarAgendamentoComoFinalizado(id: string): Promise<void> {
    return this.agendamentosCollection.doc(id).update({ status: 'finalizado' });
  }

  avaliarAtendimento(id: string, status: 'aceito' | 'rejeitado', observacao: string): Promise<void> {
    return this.atendimentosCollection.doc(id).update({ status, observacaoProfessor: observacao });
  }

  async avaliarEFinalizar(atendimentoId: string, agendamentoId: string, novoStatus: 'aceito' | 'rejeitado', observacao: string): Promise<void> {
    const batch = this.firestore.firestore.batch();
    const atendimentoRef = this.atendimentosCollection.doc(atendimentoId).ref;
    batch.update(atendimentoRef, { status: novoStatus, observacaoProfessor: observacao });
    const agendamentoRef = this.agendamentosCollection.doc(agendamentoId).ref;
    batch.update(agendamentoRef, { status: novoStatus });
    return batch.commit();
  }

  obterAtendimentosAvaliadosPorEstagiario(estagiarioUid: string): Observable<Agendamento[]> {
    return this.atendimentosCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() }))
        .filter(atendimento =>
          atendimento.estagiarioUid === estagiarioUid &&
          (atendimento.status === 'aceito' || atendimento.status === 'rejeitado')
        )
      )
    );
  }

  obterAtendimentosAvaliadosPorProfessor(professorUid: string): Observable<Agendamento[]> {
    return this.atendimentosCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => ({ id: a.payload.doc.id, ...a.payload.doc.data() }))
        .filter(atendimento =>
          atendimento.professorResponsavelUid === professorUid &&
          (atendimento.status === 'aceito' || atendimento.status === 'rejeitado')
        )
      )
    );
  }
}