import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService, Goal, GoalProgress, UserItem } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';

const METRICS: Record<string, { label: string; unit: string; higherIsBetter: boolean }> = {
  EnergyKwh: { label: 'Energia', unit: 'kWh', higherIsBetter: false },
  WaterM3: { label: 'Água', unit: 'm³', higherIsBetter: false },
  WasteKg: { label: 'Resíduos', unit: 'kg', higherIsBetter: false },
  CarbonKgCo2e: { label: 'Carbono', unit: 'kg CO₂e', higherIsBetter: false },
  RecyclingRatePercent: { label: 'Taxa de reciclagem', unit: '%', higherIsBetter: true }
};
const STATUS: Record<string, { label: string; cls: string }> = {
  OnTrack: { label: 'No caminho', cls: 'ok' }, Warning: { label: 'Atenção', cls: 'warn' },
  Off: { label: 'Fora da meta', cls: 'bad' }, NoData: { label: 'Sem dados', cls: '' }
};

interface Row { goal: Goal; progress: GoalProgress | null; }

@Component({
  selector: 'app-goals',
  imports: [FormsModule, DecimalPipe, DatePipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Metas</h2><p>Objetivos de redução e acompanhamento em {{ pad(month) }}/{{ year }}.</p></div>
    </div>

    @if (auth.canManage()) {
      <form (ngSubmit)="add()" class="card stack">
        <h3>Nova meta</h3>
        <div class="form-grid">
          <label class="field">Título <input name="title" placeholder="Ex.: Reduzir energia" [(ngModel)]="f.title" required></label>
          <label class="field">Indicador
            <select name="metric" [(ngModel)]="f.metric">
              @for (m of metricKeys; track m) { <option [value]="m">{{ metrics[m].label }} ({{ metrics[m].unit }})</option> }
            </select>
          </label>
          <label class="field">Valor-alvo <input name="target" type="number" step="any" [(ngModel)]="f.targetValue" required></label>
          <label class="field">Prazo <input name="deadline" type="date" [(ngModel)]="f.deadline" required></label>
          <label class="field">Responsável
            <select name="responsible" [(ngModel)]="f.responsibleUserId">
              <option [ngValue]="null">Sem responsável</option>
              @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.name }}</option> }
            </select>
          </label>
          <button class="btn btn-primary" type="submit"><app-icon name="plus" /> Criar meta</button>
        </div>
        @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }
      </form>
    }

    <div class="grid" style="margin-top:1rem; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))">
      @for (r of rows(); track r.goal.id) {
        <article class="card stack" style="gap:.75rem">
          <div class="card-head" style="margin:0">
            <h3>{{ r.goal.title }}</h3>
            @if (r.progress) {
              <span class="badge" [class]="status[r.progress.status].cls">{{ status[r.progress.status].label }}</span>
            }
          </div>
          <p class="muted" style="font-size:.88rem">
            {{ metrics[r.goal.metric].label }} · {{ metrics[r.goal.metric].higherIsBetter ? 'mínimo' : 'máximo' }}
            <b>{{ r.goal.targetValue | number:'1.0-1' }} {{ metrics[r.goal.metric].unit }}</b> · prazo {{ r.goal.deadline | date:'dd/MM/yyyy' }}
            @if (responsible(r.goal); as name) { · responsável <b>{{ name }}</b> }
          </p>

          @if (r.progress && r.progress.currentValue !== null) {
            <div>
              <div class="row" style="justify-content:space-between; font-size:.85rem; margin-bottom:.3rem">
                <span>Atual: <b>{{ r.progress.currentValue | number:'1.0-1' }} {{ metrics[r.goal.metric].unit }}</b></span>
                <span class="muted">{{ pct(r) | number:'1.0-0' }}% do alvo</span>
              </div>
              <div class="progress" [class.warn]="r.progress.status === 'Warning'" [class.bad]="r.progress.status === 'Off'">
                <span [style.width.%]="min100(pct(r))"></span>
              </div>
            </div>
          } @else {
            <p class="muted" style="font-size:.88rem">Sem dados registrados neste período.</p>
          }

          @if (r.progress?.isOverdue) { <div class="alert bad"><app-icon name="alert" />Prazo da meta vencido.</div> }

          @if (auth.canManage()) {
            <div><button class="btn btn-sm btn-danger" (click)="remove(r.goal.id)"><app-icon name="trash" [size]="15" /> Excluir</button></div>
          }
        </article>
      } @empty {
        <div class="card empty" style="grid-column: 1 / -1">
          <app-icon name="target" [size]="40" /><b>Nenhuma meta definida</b>Crie a primeira meta para acompanhar o progresso.
        </div>
      }
    </div>
  `
})
export class Goals implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  metrics = METRICS;
  status = STATUS;
  metricKeys = Object.keys(METRICS);
  rows = signal<Row[]>([]);
  users = signal<UserItem[]>([]);
  error = signal('');
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  f = this.blank();

  pad = (n: number) => String(n).padStart(2, '0');
  min100 = (v: number) => Math.min(100, Math.max(0, v));
  pct = (r: Row) => (r.progress?.currentValue != null && r.goal.targetValue > 0 ? (r.progress.currentValue / r.goal.targetValue) * 100 : 0);

  ngOnInit() {
    this.api.latestPeriod().subscribe(p => { this.year = p.year; this.month = p.month; this.load(); });
    const companyId = this.auth.companyId();
    this.api.users().pipe(catchError(() => of([] as UserItem[])))
      .subscribe(us => this.users.set(us.filter(u => u.isActive && (!companyId || u.companyId === companyId))));
  }
  load() {
    this.api.goals().subscribe(goals => {
      if (!goals.length) { this.rows.set([]); return; }
      forkJoin(goals.map(g => this.api.goalProgress(g.id, this.year, this.month).pipe(catchError(() => of(null)))))
        .subscribe(ps => this.rows.set(goals.map((goal, i) => ({ goal, progress: ps[i] }))));
    });
  }
  add() {
    this.error.set('');
    this.api.createGoal(this.f).subscribe({
      next: () => { this.f = this.blank(); this.load(); },
      error: e => this.error.set(e.error?.message ?? 'Não foi possível criar a meta.')
    });
  }
  responsible = (g: Goal) => this.users().find(u => u.id === g.responsibleUserId)?.name ?? '';
  remove(id: string) { this.api.deleteGoal(id).subscribe(() => this.load()); }
  private blank() { return { title: '', metric: 'EnergyKwh', targetValue: 0, deadline: '', responsibleUserId: null as string | null }; }
}
