import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';
import { ThemeToggle } from '../../core/theme-toggle';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icon, ThemeToggle],
  template: `
    <div class="wrap">
      <section class="hero" aria-hidden="true">
        <div class="logo"><app-icon name="leaf" [size]="26" /></div>
        <h1>SGS-PE</h1>
        <p class="lead">Gestão de sustentabilidade para pequenas empresas.</p>
        <ul>
          <li><app-icon name="zap" /> Energia, água e resíduos em um só lugar</li>
          <li><app-icon name="leaf" /> Pegada de carbono calculada automaticamente</li>
          <li><app-icon name="target" /> Metas com alertas e sugestões de melhoria</li>
          <li><app-icon name="file" /> Relatórios em PDF e Excel para auditorias</li>
        </ul>
      </section>

      <section class="panel">
        <div class="theme"><app-theme-toggle /></div>
        <form (ngSubmit)="submit()" class="form">
          <div>
            <h2>Entrar</h2>
            <p class="muted">Acesse com o e-mail da sua empresa.</p>
          </div>
          <label class="field">E-mail
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="username" placeholder="voce@empresa.com">
          </label>
          <label class="field">Senha
            <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" placeholder="••••••••">
          </label>
          @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }
          <button class="btn btn-primary" type="submit" [disabled]="loading()">{{ loading() ? 'Entrando...' : 'Entrar' }}</button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
    .hero {
      display: flex; flex-direction: column; justify-content: center; gap: 1rem; padding: 3rem clamp(1.5rem, 6vw, 5rem);
      color: #fff; background: radial-gradient(120% 90% at 0% 0%, #22c55e 0%, #15803d 45%, #064e2b 100%);
    }
    .logo { width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; background: rgb(255 255 255 / 18%); }
    h1 { font-size: 2.6rem; font-weight: 800; letter-spacing: -.03em; }
    .lead { font-size: 1.15rem; opacity: .92; max-width: 30ch; }
    ul { list-style: none; padding: 0; margin: 1rem 0 0; display: flex; flex-direction: column; gap: .8rem; }
    li { display: flex; align-items: center; gap: .7rem; opacity: .95; }
    .panel { position: relative; display: grid; place-items: center; padding: 2rem 1.25rem; }
    .theme { position: absolute; top: 1rem; right: 1rem; }
    .form { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 1.1rem; }
    .form .btn { padding: .75rem; }
    @media (max-width: 820px) {
      .wrap { grid-template-columns: minmax(0, 1fr); }
      .hero { padding: 2rem 1.5rem; }
      .hero ul { display: none; }
      h1 { font-size: 2rem; }
    }
  `]
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = ''; password = '';
  loading = signal(false); error = signal('');

  submit() {
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: e => { this.loading.set(false); this.error.set(e.error?.message ?? 'Não foi possível entrar. Verifique os dados e tente novamente.'); }
    });
  }
}
