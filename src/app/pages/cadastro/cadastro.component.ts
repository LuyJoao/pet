import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit, OnDestroy {
  cadastroForm: FormGroup;
  senhaInvalida: boolean = false;
  formInvalido: boolean = false;
  isEditMode = false;
  userId: string | null = null;
  pageTitle = 'Cadastro de Usuário';
  usuarioEdicao: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.cadastroForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.buildForm();
    this.checkRouteForContext();
  }

  private buildForm(): void {
    this.cadastroForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nome: ['', Validators.required],
      departamento: ['', Validators.required],
      tipo: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    this.cadastroForm.get('password')?.valueChanges.subscribe(() => this.verificarSenha());
    this.cadastroForm.get('confirmPassword')?.valueChanges.subscribe(() => this.verificarSenha());
  }

  private checkRouteForContext(): void {
    const navigation = this.router.getCurrentNavigation();
    const stateUsuario = navigation?.extras?.state?.['usuario'];

    if (stateUsuario) {
      this.usuarioEdicao = stateUsuario;
      sessionStorage.setItem('usuarioEdicao', JSON.stringify(this.usuarioEdicao));
    } else {
      const stored = sessionStorage.getItem('usuarioEdicao');
      if (stored) {
        this.usuarioEdicao = JSON.parse(stored);
      }
    }

    this.userId = this.usuarioEdicao?.id || this.usuarioEdicao?.uid || this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.usuarioEdicao;

    const contexto = this.route.snapshot.queryParamMap.get('contexto');

    if (contexto === 'estagiario') {
      this.pageTitle = this.isEditMode ? 'Dados do Estagiário' : 'Cadastrar Estagiário';
      this.cadastroForm.get('tipo')?.setValue('Estagiário');
      this.cadastroForm.get('tipo')?.disable();
    }

    if (this.usuarioEdicao) {
      this.pageTitle = 'Editar Usuário';

      this.cadastroForm.patchValue({
        nome: this.usuarioEdicao.name || this.usuarioEdicao.nome,
        email: this.usuarioEdicao.email,
        tipo: this.usuarioEdicao.tipo || this.usuarioEdicao.role,
        departamento: this.usuarioEdicao.departament || this.usuarioEdicao.departamento
      });

      this.cadastroForm.get('email')?.disable();
      this.cadastroForm.get('password')?.disable();
      this.cadastroForm.get('confirmPassword')?.disable();
    }
  }


  verificarSenha() {
    if (this.isEditMode) return;

    const password = this.cadastroForm.get('password')?.value;
    const confirmPassword = this.cadastroForm.get('confirmPassword')?.value;

    if (!confirmPassword) {
      this.senhaInvalida = true;
      this.cadastroForm.get('confirmPassword')?.setErrors({ required: true });
      return;
    }

    this.senhaInvalida = password !== confirmPassword;

    if (this.senhaInvalida) {
      this.cadastroForm.get('confirmPassword')?.setErrors({ mismatch: true });
    } else {
      this.cadastroForm.get('confirmPassword')?.setErrors(null);
    }
  }

  async onSubmit() {
    this.formInvalido = this.cadastroForm.invalid || this.senhaInvalida;

    if (this.formInvalido) {
      this.cadastroForm.markAllAsTouched();
      return;
    }

    const formValues = this.cadastroForm.getRawValue();
    const { email, password, departamento } = formValues;
    const nome = formValues.nome || formValues.name;
    const tipo = formValues.tipo || formValues.role;

    try {
      if (this.isEditMode && this.userId) {
        await this.authService.atualizarUsuario(this.userId, nome, tipo, departamento, email);
        Swal.fire({
          icon: 'success', title: 'Sucesso!', text: 'Usuário atualizado com sucesso!', confirmButtonColor: '#0d47a1'
        });
      } else {
        if (tipo === 'Estagiário') {
          const usuarioLogado = await this.authService.getUsuarioLogado();
          const professorId = usuarioLogado?.id || usuarioLogado?.uid;

          if (!professorId) {
            Swal.fire('Erro', 'Não foi possível identificar o professor logado para vincular ao estagiário.', 'error');
            return;
          }

          await this.usuarioService.criarEstagiario({
            name: nome,
            email: email,
            departament: departamento,
            password: password,
            professor_id: professorId
          });
        } else {
          await this.authService.registerInterno(email, password, departamento, nome, tipo);
        }
      }

      if (this.route.snapshot.queryParamMap.get('contexto') === 'estagiario') {
        this.router.navigate(['/estagiarios']);
      } else {
        this.router.navigate(['/usuarios']);
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      Swal.fire('Erro!', 'Ocorreu um problema ao salvar o cadastro.', 'error');
    }
  }

  cancelar() {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Todas as informações preenchidas serão perdidas!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Continuar preenchendo'
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.route.snapshot.queryParamMap.get('contexto') === 'estagiario') {
          this.router.navigate(['/estagiarios']);
        } else {
          this.router.navigate(['/usuarios']);
        }
      }
    });
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem('usuarioEdicao');
  }
}
