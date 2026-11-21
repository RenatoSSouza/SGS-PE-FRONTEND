import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Benchmark } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../core/icon';

const SIZES: Record<string, string> = { Micro: 'Microempresa', Small: 'Pequena empresa', Medium: 'Média empresa' };
const POSITION: Record<string, string> = { Better: 'Melhor que a média', Worse: 'Pior que a média', Equal: 'Na média' };

@Component({
  selector: 'app-benchmark',
  imports: [FormsModule, DecimalPipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Benchmark setorial</h2><p>Compare seu desempenho com empresas do mesmo setor e porte.</p></div>
      <div class="row">
        @if (auth.isAdmin()) {
          <label class="field">Porte comparado
            <select [(ngModel)]="size" (ngModelChange)="load()">
              <option value="">Porte cadastrado ({{ companySize ? sizes[companySize] : 'não informado' }})</option>
              @for (s of sizeKeys; track s) { @if (s !== companySize) { <option [value]="s">{{ sizes[s] }}</option> } }
              <option value="all">Todos os portes</option>
            </select>
          </label>
        }
        <label class="field">Mês <input type="number" min="1" max="12" [(ngModel)]="month" style="width:5.5rem"></label>
        <label class="field">Ano <input type="number" min="2000" max="2100" [(ngModel)]="year" style="width:6.5rem"></label>
        <button class="btn btn-primary" (click)="load()">Comparar</button>
      </div>
    </div>

    @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }

    @if (data(); as b) {
      <p class="muted" style="margin-bottom:1rem">
        Setor: <b>{{ b.sector }}</b>
        @if (b.size) { · porte <b>{{ sizes[b.size] }}</b> } @else if (b.allSizes && auth.isAdmin()) { · <b>todos os portes</b> }
        · {{ b.peerCompanies }} empresas comparáveis (mínimo {{ b.minimumPeers }})
      </p>
      @if (b.message && b.available) { <div class="alert warn" style="margin-bottom:1rem"><app-icon name="info" />{{ b.message }}</div> }

      @if (!b.available) {
        <div class="card empty">
          <app-icon name="bar" [size]="40" />
          <b>Comparação indisponível</b>
          {{ b.message ?? 'Dados insuficientes no setor para comparação.' }}
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Indicador</th><th class="num">Sua empresa</th><th class="num">Média do setor</th><th class="num">Diferença</th><th>Situação</th></tr></thead>
            <tbody>
              @for (i of b.indicators; track i.indicator) {
                <tr>
                  <td><b>{{ i.indicator }}</b>&nbsp;<span class="muted">({{ i.unit }})</span></td>
                  <td class="num">{{ i.companyValue == null ? '-' : (i.companyValue | number:'1.0-1') }}</td>
                  <td class="num">{{ i.sectorAverage == null ? '-' : (i.sectorAverage | number:'1.0-1') }}</td>
                  <td class="num">{{ i.differencePercent == null ? '-' : (i.differencePercent | number:'1.0-1') + '%' }}</td>
                  <td>
                    @if (i.position) {
                      <span class="badge" [class.ok]="i.position === 'Better'" [class.bad]="i.position === 'Worse'">{{ position[i.position] }}</span>
                    } @else { - }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `
})
export class BenchmarkPage implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  position = POSITION;
  sizes = SIZES;
  sizeKeys = Object.keys(SIZES);
  /** Filtro de porte do Administrador ('' = porte cadastrado, 'all' = todos). */
  size = '';
  companySize = '';
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  data = signal<Benchmark | null>(null);
  error = signal('');

  ngOnInit() {
    if (this.auth.isAdmin()) this.api.company().subscribe(c => this.companySize = c.size ?? '');
    this.api.latestPeriod().subscribe(p => { this.year = p.year; this.month = p.month; this.load(); });
  }
  load() {
    this.error.set('');
    this.api.benchmark(this.year, this.month, this.auth.isAdmin() ? this.size : '').subscribe({
      next: b => this.data.set(b),
      error: () => this.error.set('Não foi possível obter o benchmark para este período.')
    });
  }
}
