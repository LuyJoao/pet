import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Estagiario {
  uid: string;
  nome: string;
  tipo: string; // Deve ser 'Estagiario'
}

@Injectable({
  providedIn: 'root'
})
export class EstagiarioService {
  constructor(private firestore: AngularFirestore) {}

  buscarEstagiariosPorNome(nome: string): Observable<Estagiario[]> {
    return this.firestore.collection<Estagiario>('users', ref =>
      ref.where('tipo', '==', 'Estagiário')
         .orderBy('nome')
         .startAt(nome)
         .endAt(nome + '\uf8ff')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        const uid = a.payload.doc.id;
        return { ...data, uid }; // Garante que o ID do documento prevaleça
      }))
    );
  }
}
