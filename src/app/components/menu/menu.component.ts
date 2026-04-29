import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  tipoUsuario: string | null = null;
  menuAberto: boolean = false; // Controle da gaveta no mobile
  
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.usuarioLogado$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(usuario => {
      if (usuario) {
        this.tipoUsuario = usuario.tipo;
      } else {
        this.tipoUsuario = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Função que abre e fecha o menu do celular
  toggleMenu() {
    this.menuAberto = !this.menuAberto;
  }

  logout() {
    this.menuAberto = false; // Garante que o menu feche ao sair
    this.authService.logout();
  }
}