import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgendamentoService, Agendamento } from '../../services/agendamento.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-avaliacao-atendimento',
  templateUrl: './avaliacao-atendimento.component.html',
  styleUrls: ['./avaliacao-atendimento.component.scss']
})
export class AvaliacaoAtendimentoComponent implements OnInit {
  atendimento: Agendamento | undefined;
  observacaoProfessor = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private agendamentoService: AgendamentoService
  ) {}

  ngOnInit(): void {
    const atendimentoId = this.route.snapshot.paramMap.get('id');
    if (atendimentoId) {
      this.agendamentoService.getAtendimentoById(atendimentoId).subscribe({
        next: (atendimento) => {
          if (atendimento) {
            this.atendimento = atendimento;
            this.observacaoProfessor = atendimento.observacaoProfessor || '';
          } else {
            this.notificarErroEVoltar();
          }
        },
        error: (err) => {
          console.error("Erro ao buscar atendimento no servidor:", err);
          this.notificarErroEVoltar();
        }
      });
    }
  }

  private notificarErroEVoltar(): void {
    Swal.fire('Erro', 'Atendimento não encontrado ou dados corrompidos.', 'error');
    this.router.navigate(['/home']);
  }

  async salvarAvaliacao(novoStatus: 'aceito' | 'rejeitado') {
    if (!this.atendimento?.id || !this.atendimento.agendamentoId) {
      Swal.fire('Erro Crítico', 'Não foi possível identificar o agendamento original para concluir a avaliação.', 'error');
      return;
    }

    console.log(`Disparando avaliação. Atendimento ID: ${this.atendimento.id}, Agendamento ID: ${this.atendimento.agendamentoId}`);

    try {
      // Executa a operação síncrona aguardando a resposta do Express
      await this.agendamentoService.avaliarEFinalizar(
        this.atendimento.id,
        this.atendimento.agendamentoId,
        novoStatus,
        this.observacaoProfessor
      );

      Swal.fire('Sucesso!', `O atendimento foi ${novoStatus === 'aceito' ? 'aprovado' : 'rejeitado'} com sucesso.`, 'success');
      this.router.navigate(['/home']);

    } catch (error) {
      console.error("Erro ao processar avaliação no backend:", error);
      Swal.fire('Erro!', 'Não foi possível salvar a avaliação no servidor.', 'error');
    }
  }

  cancelar(): void {
    this.router.navigate(['/home']);
  }
}
