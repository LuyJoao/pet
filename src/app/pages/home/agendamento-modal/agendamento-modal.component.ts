import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AgendamentoService, Agendamento } from '../../../services/agendamento.service';
import { PacienteService, Paciente } from '../../../services/paciente.service';
import { UsuarioService, Usuario } from '../../../services/usuario.service';
import Swal from 'sweetalert2';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-agendamento-modal',
  templateUrl: './agendamento-modal.component.html',
  styleUrls: ['./agendamento-modal.component.scss']
})
export class AgendamentoModalComponent implements OnInit {
  agendamentoForm!: FormGroup;
  pacientesFiltrados$!: Observable<Paciente[]>;
  estagiariosFiltrados$!: Observable<Usuario[]>;
  professoresFiltrados$!: Observable<Usuario[]>;

  private todosOsPacientes: Paciente[] = [];
  private todosOsEstagiarios: Usuario[] = [];
  private todosOsProfessores: Usuario[] = [];

  private agendamentoExistente: Agendamento | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AgendamentoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { dataSelecionada: Date, agendamento?: Agendamento },
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.agendamentoExistente = this.data.agendamento || null;

    this.agendamentoForm = this.fb.group({
      hora: [this.agendamentoExistente?.hora || '', Validators.required],
      nome: [this.agendamentoExistente?.nome || '', [Validators.required, this.selecaoValidaValidator('paciente')]],
      estagiarioNome: [this.agendamentoExistente?.estagiarioNome || '', [Validators.required, this.selecaoValidaValidator('estagiario')]],
      professorResponsavelNome: [this.agendamentoExistente?.professorResponsavelNome || '', [Validators.required, this.selecaoValidaValidator('professor')]]
    });

    this.carregarDadosIniciais();
    this.configurarAutocompletes();
  }

  private carregarDadosIniciais(): void {
    this.pacienteService.obterPacientes().subscribe(data => {
      this.todosOsPacientes = data;
      this.agendamentoForm.get('nome')?.updateValueAndValidity();
    });

    this.usuarioService.obterUsuariosPorTipo('Estagiário').subscribe(data => {
      this.todosOsEstagiarios = data;
      this.agendamentoForm.get('estagiarioNome')?.updateValueAndValidity();
    });

    this.usuarioService.obterUsuariosPorTipo('Professor').subscribe(data => {
      this.todosOsProfessores = data;
      this.agendamentoForm.get('professorResponsavelNome')?.updateValueAndValidity();
    });
  }

  private configurarAutocompletes(): void {
    this.pacientesFiltrados$ = this.agendamentoForm.get('nome')!.valueChanges.pipe(
      startWith(this.agendamentoForm.get('nome')!.value || ''),
      map(value => this._filtrarPacientes(value || '', this.todosOsPacientes))
    );
    this.estagiariosFiltrados$ = this.agendamentoForm.get('estagiarioNome')!.valueChanges.pipe(
      startWith(this.agendamentoForm.get('estagiarioNome')!.value || ''),
      map(value => this._filtrarUsuarios(value || '', this.todosOsEstagiarios))
    );
    this.professoresFiltrados$ = this.agendamentoForm.get('professorResponsavelNome')!.valueChanges.pipe(
      startWith(this.agendamentoForm.get('professorResponsavelNome')!.value || ''),
      map(value => this._filtrarUsuarios(value || '', this.todosOsProfessores))
    );
  }

  private _filtrarPacientes(value: string, lista: Paciente[]): Paciente[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return lista.filter(item => (item.nome || '').toLowerCase().includes(filterValue));
  }

  private _filtrarUsuarios(value: string, lista: Usuario[]): Usuario[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';

    return lista.filter(item => {
      const nomeSeguro = (item.name || item.nome || item.email || '').toString().toLowerCase();
      return nomeSeguro.includes(filterValue);
    });
  }

  selecaoValidaValidator(tipo: 'paciente' | 'estagiario' | 'professor'): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const valorDigitado = control.value;
      if (!valorDigitado) return null;

      let selecaoValida = false;

      const valorLimpo = typeof valorDigitado === 'string' ? valorDigitado.trim() : '';

      if (tipo === 'paciente') {
        selecaoValida = this.todosOsPacientes.some(item =>
          (item.nome || '').trim() === valorLimpo
        );
      }
      if (tipo === 'estagiario') {
         selecaoValida = this.todosOsEstagiarios.some(item =>
           (item.name || item.nome || '').trim() === valorLimpo
         );
      }
      if (tipo === 'professor') {
         selecaoValida = this.todosOsProfessores.some(item =>
           (item.name || item.nome || '').trim() === valorLimpo
         );
      }

      return selecaoValida ? null : { selecaoInvalida: true };
    };
  }

  calcularIdade(dataNascimento: string): number {
    if (!dataNascimento) return 0;
    const nascimento = new Date(dataNascimento);
    const idadeDifMs = Date.now() - nascimento.getTime();
    const idadeData = new Date(idadeDifMs);
    return Math.abs(idadeData.getUTCFullYear() - 1970);
  }

  fechar(): void {
    this.dialogRef.close();
  }

  async salvar(): Promise<void> {
    if (this.agendamentoForm.invalid) {
      this.agendamentoForm.markAllAsTouched();
      Swal.fire('Atenção!', 'Por favor, preencha todos os campos corretamente.', 'warning');
      return;
    }

    const formValue = this.agendamentoForm.value;
    const paciente = this.todosOsPacientes.find(p => p.nome === formValue.nome);
    const estagiario = this.todosOsEstagiarios.find(e => (e.name || e.nome) === formValue.estagiarioNome);
    const professor = this.todosOsProfessores.find(p => (p.name || p.nome) === formValue.professorResponsavelNome);

    if (!paciente || !estagiario || !professor || !paciente.id) {
      Swal.fire('Erro de Validação', 'Seleção inválida nas listas.', 'error');
      return;
    }

    const estagiarioIdSeguro = estagiario.id || estagiario.uid;
    const professorIdSeguro = professor.id || professor.uid;

    if (!estagiarioIdSeguro || !professorIdSeguro) {
      Swal.fire('Erro de Validação', 'ID da equipe não encontrado.', 'error');
      return;
    }

    const dataSel = this.data.dataSelecionada;
    const ano = dataSel.getFullYear();
    const mes = String(dataSel.getMonth() + 1).padStart(2, '0');
    const dia = String(dataSel.getDate()).padStart(2, '0');
    const dataLocalSegura = `${ano}-${mes}-${dia}`;

    const agendamentoBase: Omit<Agendamento, 'id'> = {
      data: dataLocalSegura,
      hora: formValue.hora,
      idade: this.calcularIdade(paciente.dataNascimento),
      pacienteId: paciente.id,
      estagiarioUid: estagiarioIdSeguro,
      professorResponsavelUid: professorIdSeguro,
      status: this.agendamentoExistente?.status || 'pendente'
    };

    try {
      if (this.agendamentoExistente?.id) {
        const agendamentoParaAtualizar: Agendamento = {
          ...agendamentoBase,
          id: this.agendamentoExistente.id
        };
        await this.agendamentoService.atualizarAgendamento(agendamentoParaAtualizar);
      } else {
        await this.agendamentoService.salvarAgendamento(agendamentoBase);
      }
      this.dialogRef.close(agendamentoBase);
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      Swal.fire('Erro!', 'Ocorreu um erro ao salvar o agendamento.', 'error');
    }
  }
}
