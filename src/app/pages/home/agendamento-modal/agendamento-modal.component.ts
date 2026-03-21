import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AgendamentoService, Agendamento } from '../../../services/agendamento.service';
import { PacienteService, Paciente } from '../../../services/paciente.service';
import { EstagiarioService, Estagiario } from '../../../services/estagiario.service';
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
  estagiariosFiltrados$!: Observable<Estagiario[]>;
  professoresFiltrados$!: Observable<Usuario[]>;

  private todosOsPacientes: Paciente[] = [];
  private todosOsEstagiarios: Estagiario[] = [];
  private todosOsProfessores: Usuario[] = [];
  
  private agendamentoExistente: Agendamento | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AgendamentoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { dataSelecionada: Date, agendamento?: Agendamento },
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private estagiarioService: EstagiarioService,
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

    this.estagiarioService.buscarEstagiariosPorNome('').subscribe(data => {
      this.todosOsEstagiarios = data;
      this.agendamentoForm.get('estagiarioNome')?.updateValueAndValidity();
    });

    this.usuarioService.obterProfessores().subscribe(data => {
      this.todosOsProfessores = data;
      this.agendamentoForm.get('professorResponsavelNome')?.updateValueAndValidity();
    });
  }
  
  private configurarAutocompletes(): void {
    this.pacientesFiltrados$ = this.agendamentoForm.get('nome')!.valueChanges.pipe(
      startWith(this.agendamentoForm.get('nome')!.value || ''),
      map(value => this._filtrar(value || '', this.todosOsPacientes))
    );
    this.estagiariosFiltrados$ = this.agendamentoForm.get('estagiarioNome')!.valueChanges.pipe(
      startWith(this.agendamentoForm.get('estagiarioNome')!.value || ''),
      map(value => this._filtrar(value || '', this.todosOsEstagiarios))
    );
    this.professoresFiltrados$ = this.agendamentoForm.get('professorResponsavelNome')!.valueChanges.pipe(
      startWith(this.agendamentoForm.get('professorResponsavelNome')!.value || ''),
      map(value => this._filtrar(value || '', this.todosOsProfessores))
    );
  }

  private _filtrar(value: string, lista: any[]): any[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return lista.filter(item => item.nome.toLowerCase().includes(filterValue));
  }

  selecaoValidaValidator(tipo: 'paciente' | 'estagiario' | 'professor'): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const nome = control.value;
      if (!nome) return null;
      
      let lista: any[] = [];
      if (tipo === 'paciente') lista = this.todosOsPacientes;
      if (tipo === 'estagiario') lista = this.todosOsEstagiarios;
      if (tipo === 'professor') lista = this.todosOsProfessores;
      
      const selecaoValida = lista.some(item => item.nome === nome);
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
    Swal.fire('Atenção!', 'Por favor, preencha todos os campos corretamente, selecionando um valor válido da lista.', 'warning');
    return;
  }

  const formValue = this.agendamentoForm.value;
  const paciente = this.todosOsPacientes.find(p => p.nome === formValue.nome);
  const estagiario = this.todosOsEstagiarios.find(p => p.nome === formValue.estagiarioNome);
  const professor = this.todosOsProfessores.find(p => p.nome === formValue.professorResponsavelNome);

  if (!paciente || !estagiario || !professor || !paciente.id) {
    Swal.fire('Erro de Validação', 'Paciente, Estagiário ou Professor inválido. Selecione um valor da lista.', 'error');
    return;
  }

  const agendamentoBase: Omit<Agendamento, 'id'> = {
    data: this.data.dataSelecionada.toISOString().split('T')[0],
    hora: formValue.hora,
    nome: paciente.nome,
    idade: this.calcularIdade(paciente.dataNascimento),
    pacienteId: paciente.id,
    estagiarioNome: estagiario.nome,
    estagiarioUid: estagiario.uid,
    professorResponsavelUid: professor.uid,
    professorResponsavelNome: professor.nome,
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