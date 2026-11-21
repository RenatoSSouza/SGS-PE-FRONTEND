import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, AppNotification } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Notificações</h2><p>Alertas gerados automaticamente a partir das metas.</p></div>
      <div class="row">
        @if (auth.canManage()) { <button class="btn" (click)="refresh()"><app-icon name="target" /> Verificar metas agora</button> }
        <button class="btn" (click)="readAll()"><app-icon name="check" /> Marcar todas como lidas</button>
      </div>
    </div>

    @if (info()) { <div class="alert info" style="margin-bottom:1rem" role="status"><app-icon name="info" />{{ info() }}</div> }

    <div class="stack">
      @for (n of items(); track n.id) {
        <article class="card item" [class.unread]="!n.read">
          <span class="ico"><app-icon name="bell" /></span>
          <div class="body">
            <b>{{ n.title }}</b>
            <p class="muted">{{ n.message }}</p>
            <small class="muted">{{ n.createdAt | date:'dd/MM/yyyy HH:mm' }}</small>
          </div>
          @if (!n.read) { <button class="btn btn-sm" (click)="read(n)">Marcar como lida</button> }
        </article>
      } @empty {
        <div class="card empty"><app-icon name="bell" [size]="40" /><b>Tudo em dia</b>Você não tem notificações.</div>
      }
    </div>
  `,
  styles: [`
    .item { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem 1.25rem; }
    .item.unread { border-left: 4px solid var(--primary); background: color-mix(in srgb, var(--primary-soft) 45%, var(--surface)); }
    .ico { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center; background: var(--surface-2); color: var(--muted); }
    .unread .ico { background: var(--primary-soft); color: var(--primary); }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .15rem; }
  `]
})
export class Notifications implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  items = signal<AppNotification[]>([]);
  info = signal('');

  ngOnInit() { this.load(); }
  load() { this.api.notifications().subscribe(n => this.items.set(n)); }
  read(n: AppNotification) { this.api.markRead(n.id).subscribe(() => this.load()); }
  readAll() { this.api.markAllRead().subscribe(() => this.load()); }
  refresh() {
    this.api.refreshNotifications().subscribe(r => {
      this.info.set(r.created ? `${r.created} nova(s) notificação(ões) gerada(s).` : 'Nenhum alerta novo no momento.');
      this.load();
    });
  }
}
