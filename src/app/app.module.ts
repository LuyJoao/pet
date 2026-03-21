import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LoginComponent } from './pages/login/login.component';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { CadastroComponent } from './pages/cadastro/cadastro.component';
import { HomeComponent } from './pages/home/home.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment.development';
import {AngularFireModule} from '@angular/fire/compat';
import { MenuComponent } from './components/menu/menu.component'
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { AgendamentoModalComponent } from './pages/home/agendamento-modal/agendamento-modal.component';
import { AtendimentoComponent } from './pages/atendimento/atendimento.component';

import { MatIconModule } from '@angular/material/icon';
import { PacientesComponent } from './pages/pacientes/pacientes.component';
import { CadastroPacienteComponent } from './pages/pacientes/cadastro-paciente/cadastro-paciente.component';

import { MatSnackBarModule } from '@angular/material/snack-bar';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import {VisualizarPacienteComponent} from './pages/pacientes/visualizar-paciente/visualizar-paciente.component';
import { ExportarPdfModalComponent } from './components/exportar-pdf-modal/exportar-pdf-modal.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EstagiariosComponent } from './pages/estagiarios/estagiarios.component';
import { MatDividerModule } from '@angular/material/divider';
import { AvaliacaoAtendimentoComponent } from './pages/avaliacao-atendimento/avaliacao-atendimento.component';
import { MatChipsModule } from '@angular/material/chips';
import { HistoricoAtendimentosComponent } from './pages/historico-atendimentos/historico-atendimentos.component';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { MAT_DATE_LOCALE } from '@angular/material/core';

// deixar em portugues
registerLocaleData(localePt);


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    CadastroComponent,
    HomeComponent,
    MenuComponent,
    AgendamentoModalComponent,
    AtendimentoComponent,
    PacientesComponent,
    CadastroPacienteComponent,
    UsuariosComponent,
    VisualizarPacienteComponent,
    ExportarPdfModalComponent,
    EstagiariosComponent,
    AvaliacaoAtendimentoComponent,
    HistoricoAtendimentosComponent,
    
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    BrowserAnimationsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    FormsModule,
    MatDividerModule,
     MatChipsModule,
    
  ],
  providers: [
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp({"projectId":"interpront-4f172","appId":"1:980688439092:web:237a89b99c1c5514590761","storageBucket":"interpront-4f172.firebasestorage.app","apiKey":"AIzaSyCklXu3kq4XUq355NK40L4CsXTFsVrR1yw","authDomain":"interpront-4f172.firebaseapp.com","messagingSenderId":"980688439092"})),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }