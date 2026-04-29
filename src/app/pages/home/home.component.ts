import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AgendamentoModalComponent } from '../home/agendamento-modal/agendamento-modal.component';
import { Agendamento, AgendamentoService } from '../../services/agendamento.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  selected: Date | null = new Date();
  agendamentos: Agendamento[] = [];
  hoje = new Date();
  dataNoPassado: boolean = false;

  tipoUsuario: string | null = null;
  usuarioLogado: any = null;

  // Variável para armazenar a lista da Secretaria
  atendimentosPendentes$!: Observable<Agendamento[]>;

  constructor(
    public dialog: MatDialog,
    private agendamentoService: AgendamentoService,
    private router: Router,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioLogado$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(usuario => {
      if (usuario) {
        this.usuarioLogado = usuario;
        this.tipoUsuario = usuario.tipo;

        if (this.tipoUsuario === 'Estagiário') {
          this.atendimentosPendentes$ = this.agendamentoService.obterPendentesDoEstagiario(this.usuarioLogado.uid);
        } else if (this.tipoUsuario === 'Professor') {
          this.atendimentosPendentes$ = this.agendamentoService.obterPendentesDoProfessor(this.usuarioLogado.uid);
        }

        if (this.selected) {
          this.buscarAgendamentos(this.selected);
        }
      } else {
        this.usuarioLogado = null;
        this.tipoUsuario = null;
        this.agendamentos = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async buscarAgendamentos(data: Date | null): Promise<void> {
    if (!data || !this.tipoUsuario) return;

    const hojeSemHoras = new Date();
    hojeSemHoras.setHours(0, 0, 0, 0);
    const dataSelecionadaSemHoras = new Date(data);
    dataSelecionadaSemHoras.setHours(0, 0, 0, 0);
    this.dataNoPassado = dataSelecionadaSemHoras < hojeSemHoras;

    let busca$: Observable<Agendamento[]>;

    if (this.tipoUsuario === 'Secretaria') {
      busca$ = this.agendamentoService.obterAgendamentosPorData(data);
    } else if (this.tipoUsuario === 'Estagiário') {
      busca$ = await this.agendamentoService.obterMeusAgendamentosPorData(data);
    } else if (this.tipoUsuario === 'Professor') {
      busca$ = await this.agendamentoService.obterAgendamentosPorProfessorResponsavel(this.usuarioLogado.uid, data);
    } else {
      this.agendamentos = [];
      return;
    }

    busca$.pipe(takeUntil(this.destroy$)).subscribe((agendamentos: Agendamento[]) => {
      this.agendamentos = agendamentos.sort((a, b) => a.hora.localeCompare(b.hora));
    });
  }

  iniciarAtendimento(agendamento: Agendamento): void {
    this.router.navigate(['/atendimento'], {
      queryParams: {
        id: agendamento.id,
        pacienteId: agendamento.pacienteId,
        nome: agendamento.nome,
        idade: agendamento.idade,
        data: agendamento.data,
        professorNome: agendamento.professorResponsavelNome,
        professorUid: agendamento.professorResponsavelUid
      }
    });
  }

  abrirModalAgendamento(agendamento?: Agendamento): void {
    if (!this.selected) {
      Swal.fire('Atenção!', 'Selecione uma data no calendário antes de agendar!', 'warning');
      return;
    }

    const dialogRef = this.dialog.open(AgendamentoModalComponent, {
      width: '800px',
      data: { dataSelecionada: this.selected, agendamento: agendamento || null, autoFocus: false },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.buscarAgendamentos(this.selected);
    });
  }

  verificarIdEExcluir(id: string | undefined): void {
    if (!id) return;
    Swal.fire({
      title: 'Tem certeza?', text: 'Esta ação não pode ser desfeita!', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) this.excluirAgendamento(id);
    });
  }

  excluirAgendamento(id: string): void {
    this.agendamentoService.excluirAgendamento(id)
      .then(() => Swal.fire('Excluído!', 'O agendamento foi removido.', 'success'))
      .catch(error => console.error('Erro ao excluir agendamento:', error));
  }

  async irParaAvaliacao(agendamento: Agendamento) {
    if (!agendamento.id) return;
    const atendimentoParaAvaliar = await this.agendamentoService.getAtendimentoPorAgendamentoId(agendamento.id);
    if (atendimentoParaAvaliar?.id) {
      this.router.navigate(['/avaliacao', atendimentoParaAvaliar.id]);
    } else {
      Swal.fire('Atenção', 'O registro deste atendimento ainda não foi concluído pelo estagiário.', 'info');
    }
  }

  // --- NOVA FUNÇÃO: Calcula se o atendimento está atrasado ---
  isAtrasado(dataDoAgendamento: string | Date): boolean {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Converte a data do banco (que vem como string 'YYYY-MM-DD') para Date
    // O 'T00:00:00' evita bugs de fuso horário onde o JS subtrai 3 horas e joga pro dia anterior
    const dataAgendada = new Date(dataDoAgendamento + 'T00:00:00');

    return dataAgendada < hoje;
  }

  filtroDatas = (d: Date | null): boolean => true;
}