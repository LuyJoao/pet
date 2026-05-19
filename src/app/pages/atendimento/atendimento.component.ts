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
  pacienteId: string | null = null;
  nome: string | null = null;
  idade: number | null = null;
  estagiarioNome: string | null = null;
  dataAtendimento: string | null = null;
  private estagiarioUid: string | null = null;
  private professorResponsavelUid: string | null = null;
  private professorResponsavelNome: string | null = null;

  // --- NOVA VARIÁVEL PARA O ARQUIVO ---
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
      this.idade = params['idade'];
      this.dataAtendimento = params['data'];
      this.professorResponsavelNome = params['professorNome'];
      this.professorResponsavelUid = params['professorUid'];

      if (this.agendamentoId) {
        const atendimentoExistente = await this.agendamentoService.obterAtendimentoPorId(this.agendamentoId);
        if (atendimentoExistente) {
          this.atendimentoForm.patchValue(atendimentoExistente);
        }
      }
    });

    this.authService.getUsuarioLogado().then(user => {
      if (user) {
        this.estagiarioNome = user.nome;
        this.estagiarioUid = user.uid;
      }
    });
  }

  // --- NOVA FUNÇÃO DE ARQUIVO ---
  onArquivoSelecionado(event: any): void {
    const file: File = event.target.files[0];
    
    if (file) {
      this.arquivoSelecionado = file;
      
      Swal.fire({
        icon: 'success',
        title: 'Arquivo anexado!',
        text: `O arquivo "${file.name}" está pronto para ser enviado junto com o atendimento.`,
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

    if (!this.agendamentoId) {
      Swal.fire('Erro Crítico', 'Não foi possível identificar o atendimento.', 'error');
      return;
    }

    const dados = this.atendimentoForm.value;

    try {
      const atendimentoExistente = await this.agendamentoService.obterAtendimentoPorId(this.agendamentoId);

      if (atendimentoExistente) {
        await this.agendamentoService.atualizarAtendimento(this.agendamentoId, dados);
        Swal.fire('Sucesso!', 'Atendimento atualizado com sucesso.', 'success');
      } else {
        const atendimentoNovo: Agendamento = {
          ...dados,
          agendamentoId: this.agendamentoId,
          pacienteId: this.pacienteId!,
          nome: this.nome!,
          idade: this.idade!,
          data: this.dataAtendimento!,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: 'pendente',
          estagiarioNome: this.estagiarioNome!,
          estagiarioUid: this.estagiarioUid!,
          professorResponsavelNome: this.professorResponsavelNome!,
          professorResponsavelUid: this.professorResponsavelUid!
        };

        await this.agendamentoService.criarAtendimento(atendimentoNovo);

        await this.agendamentoService.marcarAgendamentoComoFinalizado(this.agendamentoId);

        Swal.fire('Sucesso!', 'Atendimento criado e finalizado com sucesso.', 'success');
      }

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

  // --- FUNÇÃO DE GERAR PDF ATUALIZADA (COM PROTEÇÃO CONTRA ERRO DE IMAGEM) ---
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