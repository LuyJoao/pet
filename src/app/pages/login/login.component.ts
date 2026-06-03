import { Component, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  formInvalido: boolean = false;
  loginFalhou: boolean = false;

  emailRecuperacao: string = '';
  recuperacaoEmailErro: boolean = false;
  dialogRef!: MatDialogRef<any>;

  @ViewChild('dialogRecuperarSenha') dialogTemplate!: TemplateRef<any>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    this.formInvalido = this.loginForm.invalid;

    if (this.formInvalido) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password)
      .then(() => {
        this.loginFalhou = false;
      })
      .catch(() => {
        this.loginFalhou = true;
      });
  }

  abrirDialogRecuperarSenha(): void {
    this.emailRecuperacao = '';
    this.recuperacaoEmailErro = false;
    this.dialogRef = this.dialog.open(this.dialogTemplate);
  }

  enviarRecuperacaoSenha(): void {
    if (!this.emailRecuperacao) return;

    this.authService.enviarEmailRedefinicaoSenha(this.emailRecuperacao)
      .then(() => {
        this.dialogRef.close();
        Swal.fire({
          icon: 'success',
          title: 'E-mail enviado!',
          text: 'Verifique sua caixa de entrada para redefinir sua senha.',
          confirmButtonColor: '#0d47a1'
        });
      })
      .catch(() => {
        this.recuperacaoEmailErro = true;
      });
  }
}
