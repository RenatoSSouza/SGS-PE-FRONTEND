import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Carbon } from '../../core/api.service';
import { Icon } from '../../core/icon';

@Component({
  selector: 'app-carbon',
  imports: [FormsModule, DecimalPipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Pegada de carbono</h2><p>Emissões do mês, por fonte, com os fatores utilizados.</p></div>
      <div class="row">
        <label class="field">Mês <input type="number" min="1" max="12" [(ngModel)]="month" style="width:5.5rem"></label>
        <label class="field">Ano <input type="number" min="2000" max="2100" [(ngModel)]="year" style="width:6.5rem"></label>
        <button class="btn btn-primary" (click)="load()">Calcular</button>
      </div>
    </div>

    @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }

    @if (data(); as c) {
      <div class="grid two">
        <section class="card kpi" style="--accent: var(--carbon)">
          <div class="kpi-top"><span class="kpi-icon"><app-icon name="leaf" /></span> Total de emissões</div>
          <div class="kpi-value" style="font-size:2.6rem">{{ c.totalKgCo2e | number:'1.0-1' }}<span class="kpi-unit">kg CO₂e</span></div>
          <div class="kpi-foot">{{ pad(c.month) }}/{{ c.year }}</div>
        </section>
        <section class="card">
          <h3>Fatores de emissão</h3>
          <p class="muted" style="font-size:.88rem">Energia: {{ c.factorsUsed.energyKgCo2PerKwh | number:'1.1-4' }} kg CO₂/kWh<br>
            Água: {{ c.factorsUsed.waterKgCo2PerM3 | number:'1.1-4' }} kg CO₂/m³<br>
            Resíduos em aterro: {{ c.factorsUsed.wasteLandfillKgCo2PerKg | number:'1.1-4' }} kg CO₂/kg</p>
          <p class="muted" style="font-size:.8rem; margin-top:.5rem">Energia: fator médio anual do SIN (MCTI). Água e resíduos: valores de referência configuráveis.</p>
        </section>
      </div>

      <section class="card" style="margin-top:1rem">
        <h3>Divisão por fonte</h3>
        <div class="stack" style="gap:1.1rem">
          @for (s of sources(); track s.label) {
            <div>
              <div class="row" style="justify-content:space-between; margin-bottom:.35rem">
                <b>{{ s.label }}</b>
                <span class="muted">{{ s.value | number:'1.0-1' }} kg CO₂e · {{ s.pct | number:'1.0-1' }}%</span>
              </div>
              <div class="progress"><span [style.width.%]="s.pct" [style.background]="s.color"></span></div>
            </div>
          }
        </div>
      </section>
    }
  `
})
export class CarbonPage implements OnInit {
  private api = inject(ApiService);
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  data = signal<Carbon | null>(null);
  error = signal('');

  pad = (n: number) => String(n).padStart(2, '0');
  sources = () => {
    const c = this.data();
    if (!c) return [];
    const pct = (v: number) => (c.totalKgCo2e > 0 ? (v / c.totalKgCo2e) * 100 : 0);
    return [
      { label: 'Energia', value: c.energyKgCo2e, pct: pct(c.energyKgCo2e), color: 'var(--energy)' },
      { label: 'Água', value: c.waterKgCo2e, pct: pct(c.waterKgCo2e), color: 'var(--water)' },
      { label: 'Resíduos (aterro)', value: c.wasteKgCo2e, pct: pct(c.wasteKgCo2e), color: 'var(--waste)' }
    ];
  };

  ngOnInit() {
    this.api.latestPeriod().subscribe(p => { this.year = p.year; this.month = p.month; this.load(); });
  }
  load() {
    this.error.set('');
    this.api.carbon(this.year, this.month).subscribe({
      next: c => this.data.set(c),
      error: () => this.error.set('Não foi possível calcular a pegada para este período.')
    });
  }
}
