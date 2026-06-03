import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgendamentoService, Agendamento } from '../../services/agendamento.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { ExportarPdfModalComponent } from '../../components/exportar-pdf-modal/exportar-pdf-modal.component';
import jsPDF from 'jspdf';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-atendimento',
  templateUrl: './atendimento.component.html',
  styleUrls: ['./atendimento.component.scss']
})
export class AtendimentoComponent implements OnInit {
  atendimentoForm: FormGroup;

  agendamentoId: string | null = null;
  registroAtendimentoId: string | null = null;

  pacienteId: string | null = null;
  nome: string | null = null;
  idade: number | null = null;
  estagiarioNome: string | null = null;
  dataAtendimento: string | null = null;

  private estagiarioUid: string | null = null;
  private professorResponsavelUid: string | null = null;
  private professorResponsavelNome: string | null = null;

  arquivoSelecionado: File | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private agendamentoService: AgendamentoService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.atendimentoForm = this.fb.group({
      anamnese: ['', Validators.required],
      exameFisico: ['', Validators.required],
      solicitacaoExames: [''],
      orientacao: [''],
      prescricao: [''],
      conduta: ['', Validators.required],
      cid10: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(async params => {
      this.agendamentoId = params['id'];
      this.pacienteId = params['pacienteId'];
      this.nome = params['nome'];
      const parseIdade = Number(params['idade']);
      this.idade = isNaN(parseIdade) ? null : parseIdade;
      this.dataAtendimento = params['data'];
      this.professorResponsavelNome = params['professorNome'];
      this.professorResponsavelUid = params['professorUid'];

      if (this.agendamentoId) {
        const atendimentoExistente = await this.agendamentoService.getAtendimentoPorAgendamentoId(this.agendamentoId);

        if (atendimentoExistente && atendimentoExistente.id) {
          this.registroAtendimentoId = atendimentoExistente.id;
          this.atendimentoForm.patchValue(atendimentoExistente);
        }
      }
    });

    this.authService.getUsuarioLogado().then(user => {
      if (user) {
        this.estagiarioNome = user.name || user.nome;
        this.estagiarioUid = user.id || user.uid;
      }
    });
  }

  onArquivoSelecionado(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      this.arquivoSelecionado = file;
      Swal.fire({
        icon: 'success',
        title: 'Arquivo anexado!',
        text: `O arquivo "${file.name}" será salvo junto com o atendimento.`,
        confirmButtonColor: '#0d47a1'
      });
    }
  }

  async salvarAtendimento(): Promise<void> {
    if (this.atendimentoForm.invalid) {
      this.atendimentoForm.markAllAsTouched();
      Swal.fire('Atenção', 'Por favor, preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    if (!this.agendamentoId || !this.pacienteId || !this.estagiarioUid) {
      Swal.fire('Erro Crítico', 'Faltam dados de identificação essenciais (ID do Paciente ou Estagiário).', 'error');
      return;
    }

    const payloadAtendimento: Agendamento = {
      ...this.atendimentoForm.value,
      agendamentoId: this.agendamentoId,
      pacienteId: this.pacienteId,
      estagiarioUid: this.estagiarioUid,
      status: 'pendente'
    };

    try {
      let recordIdReal = this.registroAtendimentoId;

      if (this.registroAtendimentoId) {
        // Atualiza usando o ID do 'records'
        await this.agendamentoService.atualizarAtendimento(this.registroAtendimentoId, payloadAtendimento);
      } else {
        // Cria um novo
        const respostaNovoRecord = await this.agendamentoService.criarAtendimento(payloadAtendimento);
        recordIdReal = respostaNovoRecord.id;
      }

      // CORREÇÃO: Puxamos isso para fora do if/else! Agora ele sempre garante que o agendamento seja finalizado.
      await this.agendamentoService.marcarAgendamentoComoFinalizado(this.agendamentoId);

      // Envia o arquivo se houver um selecionado
      if (this.arquivoSelecionado && recordIdReal) {
        try {
          await this.agendamentoService.uploadDocumentoAtendimento(recordIdReal, this.arquivoSelecionado);
        } catch (uploadError) {
          console.warn('Erro ao anexar arquivo:', uploadError);
          Swal.fire('Aviso', 'O atendimento foi salvo, mas houve uma falha ao enviar o anexo.', 'warning');
          return; // Para não exibir a mensagem de sucesso total se o arquivo falhar
        }
      }

      Swal.fire('Sucesso!', 'Atendimento salvo e finalizado com sucesso.', 'success');
      this.router.navigate(['/home']);

    } catch (error) {
      console.error('Erro ao salvar atendimento:', error);
      Swal.fire('Erro!', 'Ocorreu um problema ao salvar o atendimento.', 'error');
    }
  }

  cancelar(): void {
    this.router.navigate(['/home']);
  }

  abrirModalExportarPDF() {
    const dialogRef = this.dialog.open(ExportarPdfModalComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(camposSelecionados => {
      if (!camposSelecionados) return;
      this.gerarPDF(camposSelecionados);
    });
  }

  private gerarPDF(camposSelecionados: any) {
    const dados = this.atendimentoForm.getRawValue();

    const doc = new jsPDF();
    const margin = 20;
    const lineHeight = 8;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    const construirEDownloadPDF = (imgData?: string) => {
      if (imgData) {
        const imgWidth = 50;
        const imgX = (pageWidth - imgWidth) / 2;
        doc.addImage(imgData, 'PNG', imgX, y - 10, imgWidth, 20);
        y += 25;
      }

      doc.setFontSize(14);
      doc.text(`Atendimento - ${this.nome || 'Paciente'} (${this.idade || ''} anos)`, margin, y);
      y += 15;

      const addText = (titulo: string, conteudo: string | undefined) => {
        const texto = `${titulo}: ${conteudo?.trim() || '-'}`;
        const lines = doc.splitTextToSize(texto, pageWidth - 2 * margin);
        if (y + lines.length * lineHeight > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines, margin, y);
        y += lines.length * lineHeight + 5;
      };

      if (camposSelecionados.anamnese) addText('Anamnese', dados.anamnese);
      if (camposSelecionados.exameFisico) addText('Exame Físico', dados.exameFisico);
      if (camposSelecionados.solicitacaoExames) addText('Solicitação de Exames', dados.solicitacaoExames);
      if (camposSelecionados.orientacao) addText('Orientação', dados.orientacao);
      if (camposSelecionados.prescricao) addText('Prescrição', dados.prescricao);
      if (camposSelecionados.conduta) addText('Conduta', dados.conduta);
      if (camposSelecionados.cid10) addText('CID-10', dados.cid10);

      doc.setFontSize(10);
      const footerY1 = pageHeight - 15;
      const footerY2 = pageHeight - 8;
      doc.text('Clínica Médica UNICENTRO', margin, footerY1);
      doc.text(
        'Endereço: Alameda Élio Antonio Dalla Vecchia, 838 - CEP 85040-167 - Vila Carli, Guarapuava - PR',
        margin,
        footerY2
      );

      const nomeArquivo = `atendimento_${this.nome || 'paciente'}.pdf`;
      doc.save(nomeArquivo);

      Swal.fire({
        icon: 'success',
        title: 'PDF gerado com sucesso!',
        text: `O arquivo "${nomeArquivo}" foi baixado.`,
        confirmButtonColor: '#0d47a1'
      });
    };

    const img = new Image();
    img.src = '/assets/img/logo.png';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL('image/png');
      construirEDownloadPDF(imgData);
    };

    img.onerror = () => {
      console.warn('A imagem da logo não foi encontrada. Gerando o PDF sem ela.');
      construirEDownloadPDF();
    };
  }
}
