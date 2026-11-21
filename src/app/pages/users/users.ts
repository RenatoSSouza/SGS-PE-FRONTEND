import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, CompanyItem, UserItem } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';

const ROLES: Record<string, string> = { Admin: 'Administrador', Manager: 'Gestor', Employee: 'Colaborador' };

@Component({
  selector: 'app-users',
  imports: [FormsModule, Icon],
  template: `
    <div class="page-header">
      <div><h2>Usuários</h2><p>Pessoas com acesso ao sistema da sua empresa.</p></div>
    </div>

    <form (ngSubmit)="add()" class="card stack">
      <h3>Novo usuário</h3>
      <div class="form-grid">
        <label class="field">Nome <input name="name" [(ngModel)]="f.name" required></label>
        <label class="field">E-mail <input name="email" type="email" [(ngModel)]="f.email" required></label>
        <label class="field">Senha (mín. 6) <input name="password" type="password" minlength="6" [(ngModel)]="f.password" required autocomplete="new-password"></label>
        @if (auth.isAdmin()) {
          <label class="field">Empresa
            <select name="company" [(ngModel)]="companyId">
              @for (c of companies(); track c.id) { <option [value]="c.id">{{ c.legalName }}</option> }
            </select>
          </label>
        }
        <label class="field">Perfil
          <select name="role" [(ngModel)]="f.role">
            @for (r of roleKeys(); track r) { <option [value]="r">{{ roles[r] }}</option> }
          </select>
        </label>
        <button class="btn btn-primary" type="submit"><app-icon name="plus" /> Criar usuário</button>
      </div>
      @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }
    </form>

    <div class="table-wrap" style="margin-top:1rem">
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td><b>{{ u.name }}</b></td>
              <td>{{ u.email }}</td>
              <td><span class="badge" [class.info]="u.role !== 'Employee'">{{ roles[u.role] }}</span></td>
              <td><span class="badge" [class.ok]="u.isActive">{{ u.isActive ? 'Ativo' : 'Inativo' }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class Users implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  companies = signal<CompanyItem[]>([]);
  companyId = '';
  roles = ROLES;
  roleKeys = () => (this.auth.user()?.role === 'Admin' ? Object.keys(ROLES) : ['Manager', 'Employee']);
  users = signal<UserItem[]>([]);
  error = signal('');
  f = { name: '', email: '', password: '', role: 'Employee' };

  ngOnInit() {
    this.companyId = this.auth.companyId();
    this.load();
    if (this.auth.isAdmin()) this.api.companies().subscribe(c => this.companies.set(c));
  }
  load() { this.api.users().subscribe(u => this.users.set(u)); }
  add() {
    this.error.set('');
    this.api.createUser({ ...this.f, companyId: this.companyId || this.auth.companyId() }).subscribe({
      next: () => { this.f = { name: '', email: '', password: '', role: 'Employee' }; this.load(); },
      error: e => this.error.set(e.error?.message ?? 'Não foi possível criar o usuário (e-mail já cadastrado?).')
    });
  }
}
