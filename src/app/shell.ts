import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService, CompanyItem } from './core/api.service';
import { AuthService } from './core/auth.service';
import { Icon } from './core/icon';
import { ThemeToggle } from './core/theme-toggle';

const ROLE_LABEL: Record<string, string> = { Admin: 'Administrador', Manager: 'Gestor', Employee: 'Colaborador' };

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, ThemeToggle],
  template: `
    <div class="app">
      <aside class="sidebar" [class.open]="open()" aria-label="Navegação principal">
        <div class="brand">
          <span class="logo"><app-icon name="leaf" [size]="20" /></span>
          <span class="brand-text">
            <span>SGS-PE</span>
            @if (!auth.isAdmin() && unitName()) { <small class="unit" [title]="unitName()">{{ unitName() }}</small> }
          </span>
          <button class="close" (click)="open.set(false)" aria-label="Fechar menu"><app-icon name="x" /></button>
        </div>

        @if (auth.isAdmin()) {
          <label class="field company-picker">Empresa visualizada
            <select [value]="auth.companyId()" (change)="selectCompany($any($event.target).value)">
              @for (c of companies(); track c.id) {
                <option [value]="c.id" [selected]="c.id === auth.companyId()">{{ c.tradingName || c.legalName }}</option>
              }
            </select>
          </label>
        }

        <nav (click)="open.set(false)">
          <p class="group">Visão geral</p>
          <a routerLink="/dashboard" routerLinkActive="on"><app-icon name="grid" /> Dashboard</a>
          <a routerLink="/metas" routerLinkActive="on"><app-icon name="target" /> Metas</a>
          <a routerLink="/notificacoes" routerLinkActive="on"><app-icon name="bell" /> Notificações
            @if (unread() > 0) { <span class="count">{{ unread() }}</span> }</a>

          <p class="group">Dados</p>
          <a routerLink="/registros" routerLinkActive="on"><app-icon name="clipboard" /> Registros</a>
          <a routerLink="/equipamentos" routerLinkActive="on"><app-icon name="zap" /> Equipamentos</a>
          <a routerLink="/carbono" routerLinkActive="on"><app-icon name="leaf" /> Carbono</a>

          @if (auth.canManage()) {
            <p class="group">Gestão</p>
            <a routerLink="/benchmark" routerLinkActive="on"><app-icon name="bar" /> Benchmark</a>
            <a routerLink="/relatorios" routerLinkActive="on"><app-icon name="file" /> Relatórios</a>
            @if (auth.isAdmin()) { <a routerLink="/empresas" routerLinkActive="on"><app-icon name="building" /> Empresas</a> }
            <a routerLink="/usuarios" routerLinkActive="on"><app-icon name="users" /> Usuários</a>
          }
        </nav>

        <div class="theme"><app-theme-toggle /></div>

        <div class="user">
          <span class="avatar" aria-hidden="true">{{ initials() }}</span>
          <span class="who">
            <b>{{ auth.user()?.name }}</b>
            <small>{{ roleLabel() }}</small>
          </span>
          <button class="btn btn-icon logout" (click)="auth.logout()" aria-label="Sair" title="Sair"><app-icon name="logout" /></button>
        </div>
      </aside>

      @if (open()) { <div class="backdrop" (click)="open.set(false)"></div> }

      <div class="main">
        <header class="topbar">
          <button class="btn btn-icon menu" (click)="open.set(true)" aria-label="Abrir menu"><app-icon name="menu" /></button>
          <span class="mobile-brand"><app-icon name="leaf" /> SGS-PE
            @if (!auth.isAdmin() && unitName()) { <small class="unit">· {{ unitName() }}</small> }</span>
          <a routerLink="/notificacoes" class="btn btn-icon bell" aria-label="Notificações" title="Notificações">
            <app-icon name="bell" />
            @if (unread() > 0) { <span class="dot">{{ unread() }}</span> }
          </a>
        </header>
        <main><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    .app { display: grid; grid-template-columns: 252px minmax(0, 1fr); min-height: 100vh; }
    .sidebar {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: .5rem;
      padding: 1.1rem .85rem; background: var(--surface); border-right: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: .65rem; font-weight: 800; font-size: 1.15rem; padding: .25rem .5rem 1rem; letter-spacing: -.01em; }
    .brand-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
    .unit { font-size: .76rem; font-weight: 600; color: var(--muted); letter-spacing: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mobile-brand .unit { max-width: 45vw; }
    .logo { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--primary); color: var(--on-primary); }
    .company-picker { padding: 0 .5rem .5rem; }
    .company-picker select { width: 100%; }
    .close { display: none; margin-left: auto; border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: .3rem; }
    nav { display: flex; flex-direction: column; gap: .15rem; overflow-y: auto; flex: 1; }
    .group { font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 700; padding: .9rem .75rem .35rem; }
    nav a {
      display: flex; align-items: center; gap: .7rem; padding: .6rem .75rem; border-radius: 10px; text-decoration: none;
      color: var(--muted); font-weight: 600; font-size: .92rem; transition: background .15s, color .15s;
    }
    nav a:hover { background: var(--surface-2); color: var(--text); }
    nav a.on { background: var(--primary-soft); color: var(--primary); }
    .count { margin-left: auto; background: var(--danger); color: #fff; border-radius: 999px; font-size: .72rem; padding: 0 .45rem; font-weight: 700; }
    .theme { padding: .5rem .25rem .6rem; }
    .user { display: flex; align-items: center; gap: .65rem; padding: .75rem .5rem 0; border-top: 1px solid var(--border); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); font-weight: 800; font-size: .85rem; flex: none; }
    .who { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
    .who b { font-size: .88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who small { color: var(--muted); font-size: .76rem; }
    .logout { margin-left: auto; }
    .main { min-width: 0; }
    .topbar { display: none; align-items: center; gap: .75rem; padding: .7rem 1rem; background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; }
    .mobile-brand { display: inline-flex; align-items: center; gap: .4rem; font-weight: 800; }
    .bell { margin-left: auto; position: relative; }
    .dot { position: absolute; top: -5px; right: -5px; background: var(--danger); color: #fff; border-radius: 999px; font-size: .68rem; font-weight: 700; padding: 0 .35rem; }
    main { padding: 2rem clamp(1rem, 3vw, 2.5rem) 3rem; max-width: 1240px; margin: 0 auto; }
    .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 45%); z-index: 30; }

    @media (max-width: 860px) {
      .app { display: block; }
      .sidebar { position: fixed; z-index: 40; left: 0; top: 0; width: 280px; max-width: 86vw; transform: translateX(-100%); transition: transform .2s; box-shadow: var(--shadow); }
      .sidebar.open { transform: none; }
      .close { display: inline-flex; }
      .topbar { display: flex; }
      main { padding-top: 1.25rem; }
    }
  `]
})
export class Shell implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  companies = signal<CompanyItem[]>([]);
  unitName = signal('');
  unread = signal(0);
  open = signal(false);
  private timer?: ReturnType<typeof setInterval>;

  initials = () => (this.auth.user()?.name ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
  roleLabel = () => ROLE_LABEL[this.auth.user()?.role ?? ''] ?? '';

  ngOnInit() {
    this.poll();
    this.timer = setInterval(() => this.poll(), 60000);
    if (this.auth.isAdmin()) this.loadCompanies();
    else this.loadUnitName();
  }

  /** Lista as empresas ativas para o seletor; a do Admin fica por último, pois não tem indicadores próprios. */
  private loadCompanies() {
    this.api.companies().subscribe({
      next: list => {
        const own = this.auth.user()?.companyId;
        const active = list.filter(c => c.isActive)
          .sort((a, b) => Number(a.id === own) - Number(b.id === own) || a.tradingName.localeCompare(b.tradingName, 'pt-BR'));
        this.companies.set(active);
        // Primeira entrada do Admin: abre a primeira empresa cliente em vez da própria (vazia).
        if (this.auth.companyId() === own && active.length && active[0].id !== own) this.selectCompany(active[0].id);
      },
      error: () => {}
    });
  }

  private loadUnitName() {
    this.api.company().subscribe({ next: c => this.unitName.set(c.tradingName || c.legalName), error: () => {} });
  }

  selectCompany(id: string) {
    if (!id || id === this.auth.companyId()) return;
    this.auth.viewCompany(id);
    this.poll();
    const url = this.router.url;
    this.router.navigateByUrl('/empresas', { skipLocationChange: true }).then(() => this.router.navigateByUrl(url));
  }
  ngOnDestroy() { clearInterval(this.timer); }
  private poll() { this.api.unreadCount().subscribe({ next: r => this.unread.set(r.count), error: () => {} }); }
}
