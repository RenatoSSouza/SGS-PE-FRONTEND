import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';

const CATEGORIES: Record<string, string> = {
  Lighting: 'Iluminação', AirConditioning: 'Ar-condicionado', Refrigeration: 'Refrigeração', Computer: 'Computadores', Other: 'Outros'
};

interface Equipment { id: string; name: string; category: string; powerWatts: number; quantity: number;
  averageDailyHours: number; isActive: boolean; estimatedMonthlyKwh: number; }

@Component({
  selector: 'app-equipments',
  imports: [FormsModule, DecimalPipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Equipamentos</h2><p>Inventário usado para estimar o consumo de energia.</p></div>
      <div class="card kpi" style="--accent: var(--energy); padding: .75rem 1.1rem; min-width: 220px">
        <div class="kpi-top">Total estimado (ativos)</div>
        <div class="kpi-value" style="font-size:1.4rem">{{ total() | number:'1.0-1' }}<span class="kpi-unit">kWh/mês</span></div>
      </div>
    </div>

    @if (auth.canManage()) {
      <form (ngSubmit)="add()" class="card stack">
        <h3>Novo equipamento</h3>
        <div class="form-grid">
          <label class="field">Nome <input name="name" placeholder="Ex.: Lâmpadas LED" [(ngModel)]="f.name" required></label>
          <label class="field">Categoria
            <select name="category" [(ngModel)]="f.category">
              @for (c of categoryKeys; track c) { <option [value]="c">{{ categories[c] }}</option> }
            </select>
          </label>
          <label class="field">Potência (W) <input name="power" type="number" min="0" step="any" [(ngModel)]="f.powerWatts" required></label>
          <label class="field">Quantidade <input name="qty" type="number" min="1" [(ngModel)]="f.quantity" required></label>
          <label class="field">Horas por dia <input name="hours" type="number" min="0" max="24" step="any" [(ngModel)]="f.averageDailyHours" required></label>
          <button class="btn btn-primary" type="submit"><app-icon name="plus" /> Adicionar</button>
        </div>
        @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }
      </form>
    }

    <div class="table-wrap" style="margin-top: 1rem">
      <table>
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th class="num">Potência</th><th class="num">Qtd.</th><th class="num">h/dia</th><th class="num">kWh/mês</th><th>Situação</th><th></th></tr>
        </thead>
        <tbody>
          @for (e of items(); track e.id) {
            <tr [style.opacity]="e.isActive ? 1 : .55">
              <td><b>{{ e.name }}</b></td>
              <td>{{ categories[e.category] }}</td>
              <td class="num">{{ e.powerWatts | number:'1.0-0' }} W</td>
              <td class="num">{{ e.quantity }}</td>
              <td class="num">{{ e.averageDailyHours }}</td>
              <td class="num">{{ e.estimatedMonthlyKwh | number:'1.0-1' }}</td>
              <td><span class="badge" [class.ok]="e.isActive">{{ e.isActive ? 'Ativo' : 'Inativo' }}</span></td>
              <td class="actions">
                @if (auth.canManage()) {
                  <button class="btn btn-sm" (click)="toggle(e)">{{ e.isActive ? 'Desativar' : 'Ativar' }}</button>
                  <button class="btn btn-sm btn-danger" (click)="remove(e.id)" aria-label="Excluir equipamento"><app-icon name="trash" [size]="15" /></button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8"><div class="empty"><app-icon name="zap" [size]="34" /><b>Nenhum equipamento cadastrado</b>Cadastre os principais equipamentos para estimar o consumo.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class Equipments implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  categories = CATEGORIES;
  categoryKeys = Object.keys(CATEGORIES);
  items = signal<Equipment[]>([]);
  error = signal('');
  f = this.blank();
  total = computed(() => this.items().filter(e => e.isActive).reduce((s, e) => s + e.estimatedMonthlyKwh, 0));

  ngOnInit() { this.load(); }
  load() { this.api.list<Equipment>('equipments').subscribe(r => this.items.set(r)); }

  add() {
    this.error.set('');
    this.api.create('equipments', this.f).subscribe({
      next: () => { this.f = this.blank(); this.load(); },
      error: e => this.error.set(e.error?.message ?? 'Dados inválidos.')
    });
  }
  toggle(e: Equipment) {
    this.api.updateEquipment(e.id, { name: e.name, category: e.category, powerWatts: e.powerWatts,
      quantity: e.quantity, averageDailyHours: e.averageDailyHours, isActive: !e.isActive }).subscribe(() => this.load());
  }
  remove(id: string) { this.api.remove('equipments', id).subscribe(() => this.load()); }
  private blank() { return { name: '', category: 'Lighting', powerWatts: 0, quantity: 1, averageDailyHours: 8 }; }
}
