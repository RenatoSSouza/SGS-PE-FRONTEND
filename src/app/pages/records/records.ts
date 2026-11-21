import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Resource } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';

const WASTE_TYPES: Record<string, string> = {
  Organic: 'Orgânico', Recyclable: 'Reciclável', Hazardous: 'Perigoso', Electronic: 'Eletrônico', Reject: 'Rejeito', Metal: 'Metal'
};
interface Field { key: string; label: string; text?: boolean; }
const FIELDS: Record<Resource, Field[]> = {
  energy: [{ key: 'gridConsumptionKwh', label: 'Rede (kWh)' }, { key: 'solarGenerationKwh', label: 'Solar (kWh)' }],
  water: [{ key: 'consumptionM3', label: 'Consumo (m³)' }, { key: 'rainwaterHarvestedM3', label: 'Chuva captada (m³)' }],
  waste: [{ key: 'quantityKg', label: 'Quantidade (kg)' }],
  materials: [{ key: 'name', label: 'Material', text: true }, { key: 'unit', label: 'Unidade', text: true }, { key: 'quantity', label: 'Quantidade' }],
  equipments: []
};

@Component({
  selector: 'app-records',
  imports: [FormsModule, DecimalPipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Registros de consumo</h2><p>Lance os dados mensais de cada indicador.</p></div>
      <div class="tabs" role="tablist">
        @for (r of resources; track r.id) {
          <button role="tab" [attr.aria-selected]="res() === r.id" [class.on]="res() === r.id" (click)="select(r.id)">{{ r.label }}</button>
        }
      </div>
    </div>

    <form (ngSubmit)="add()" class="card stack">
      <h3>Novo registro: {{ currentLabel() }}</h3>
      <div class="form-grid">
        <label class="field">Mês <input name="month" type="number" min="1" max="12" [(ngModel)]="form['month']" required></label>
        <label class="field">Ano <input name="year" type="number" min="2000" max="2100" [(ngModel)]="form['year']" required></label>
        @for (f of fields(); track f.key) {
          <label class="field">{{ f.label }}
            <input [name]="f.key" [type]="f.text ? 'text' : 'number'" step="any" [attr.min]="f.text ? null : 0" [(ngModel)]="form[f.key]" [required]="!!f.text">
          </label>
        }
        @if (res() === 'waste') {
          <label class="field">Tipo
            <select name="type" [(ngModel)]="form['type']">
              @for (t of wasteTypeKeys; track t) { <option [value]="t">{{ wasteTypes[t] }}</option> }
            </select>
          </label>
          <label class="check"><input name="recycled" type="checkbox" [(ngModel)]="form['recycled']"> Reciclado</label>
        }
        @if (res() === 'materials') {
          <label class="check"><input name="renew" type="checkbox" [(ngModel)]="form['recycledOrRenewable']"> Reciclado/renovável</label>
        }
        <button class="btn btn-primary" type="submit" [disabled]="saving()"><app-icon name="plus" /> Adicionar</button>
      </div>
      @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }
    </form>

    <div class="table-wrap" style="margin-top: 1rem">
      <table>
        <thead>
          <tr>
            <th>Período</th>
            @for (f of fields(); track f.key) { <th [class.num]="!f.text">{{ f.label }}</th> }
            @if (res() === 'waste') { <th>Tipo</th><th>Destino</th> }
            @if (res() === 'materials') { <th>Origem</th> }
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row['id']) {
            <tr>
              <td>{{ pad(row['month']) }}/{{ row['year'] }}</td>
              @for (f of fields(); track f.key) {
                <td [class.num]="!f.text">{{ f.text ? row[f.key] : (row[f.key] | number:'1.0-2') }}</td>
              }
              @if (res() === 'waste') {
                <td>{{ wasteLabel(row['type']) }}</td>
                <td><span class="badge" [class.ok]="row['recycled']">{{ row['recycled'] ? 'Reciclado' : 'Aterro' }}</span></td>
              }
              @if (res() === 'materials') {
                <td><span class="badge" [class.ok]="row['recycledOrRenewable']">{{ row['recycledOrRenewable'] ? 'Reciclado/renovável' : 'Convencional' }}</span></td>
              }
              <td class="actions">
                @if (auth.canManage()) {
                  <button class="btn btn-sm btn-danger" (click)="remove(row['id'])" aria-label="Excluir registro"><app-icon name="trash" [size]="15" /></button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="6"><div class="empty"><app-icon name="clipboard" [size]="34" /><b>Nenhum registro ainda</b>Use o formulário acima para adicionar o primeiro.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class Records implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  resources: { id: Resource; label: string }[] = [
    { id: 'energy', label: 'Energia' }, { id: 'water', label: 'Água' }, { id: 'waste', label: 'Resíduos' },
    { id: 'materials', label: 'Matérias-primas' }
  ];
  wasteTypes = WASTE_TYPES;
  wasteTypeKeys = Object.keys(WASTE_TYPES);
  res = signal<Resource>('energy');
  rows = signal<Record<string, any>[]>([]);
  error = signal('');
  saving = signal(false);
  form: Record<string, any> = this.blank();

  fields = () => FIELDS[this.res()];
  currentLabel = () => this.resources.find(r => r.id === this.res())?.label ?? '';
  pad = (n: number) => String(n).padStart(2, '0');
  wasteLabel = (t: string) => WASTE_TYPES[t] ?? t;

  ngOnInit() { this.load(); }
  select(r: Resource) { this.res.set(r); this.form = this.blank(); this.error.set(''); this.load(); }
  load() { this.api.list<Record<string, any>>(this.res()).subscribe(r => this.rows.set(r)); }
  add() {
    this.error.set(''); this.saving.set(true);
    this.api.create(this.res(), this.form).subscribe({
      next: () => { this.saving.set(false); this.form = this.blank(); this.load(); },
      error: e => { this.saving.set(false); this.error.set(e.error?.message ?? 'Dados inválidos ou período já cadastrado.'); }
    });
  }
  remove(id: string) { this.api.remove(this.res(), id).subscribe(() => this.load()); }
  private blank() {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear(), type: 'Organic', recycled: false, unit: 'kg', recycledOrRenewable: false };
  }
}
