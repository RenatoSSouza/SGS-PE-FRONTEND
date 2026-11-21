import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Icon } from '../../core/icon';

@Component({
  selector: 'app-reports',
  imports: [FormsModule, Icon],
  template: `
    <div class="page-header">
      <div><h2>Relatórios</h2><p>Gere documentos para acompanhamento, auditorias e certificações.</p></div>
    </div>

    @if (error()) { <div class="alert bad" role="alert" style="margin-bottom:1rem"><app-icon name="alert" />{{ error() }}</div> }

    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))">
      <section class="card stack">
        <div class="row"><span class="kpi-icon" style="--accent: var(--info); width:38px; height:38px; display:grid; place-items:center; border-radius:10px; background: var(--info-soft); color: var(--info)"><app-icon name="file" /></span>
          <h3>Relatório mensal</h3></div>
        <p class="muted">Energia, água, resíduos, carbono, matérias-primas, metas e sugestões do mês.</p>
        <div class="row">
          <label class="field">Mês <input type="number" min="1" max="12" [(ngModel)]="month" style="width:5.5rem"></label>
          <label class="field">Ano <input type="number" min="2000" max="2100" [(ngModel)]="year" style="width:6.5rem"></label>
        </div>
        <div class="row">
          <button class="btn btn-primary" (click)="download('pdf')" [disabled]="busy()"><app-icon name="download" /> PDF</button>
          <button class="btn" (click)="download('xlsx')" [disabled]="busy()"><app-icon name="download" /> Excel</button>
        </div>
      </section>

      <section class="card stack">
        <div class="row"><span style="width:38px; height:38px; display:grid; place-items:center; border-radius:10px; background: var(--ok-soft); color: var(--ok)"><app-icon name="leaf" /></span>
          <h3>Relatório anual de certificação</h3></div>
        <p class="muted">Consolidado do ano-base com indicadores, emissões e metodologia, metas e alinhamento aos ODS, com espaço para assinatura.</p>
        <label class="field" style="max-width:9rem">Ano-base <input type="number" min="2000" max="2100" [(ngModel)]="certYear"></label>
        <div><button class="btn btn-primary" (click)="downloadCertification()" [disabled]="busy()"><app-icon name="download" /> PDF de certificação</button></div>
      </section>
    </div>
  `
})
export class Reports implements OnInit {
  private api = inject(ApiService);
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  certYear = new Date().getFullYear();
  error = signal('');
  busy = signal(false);

  ngOnInit() {
    this.api.latestPeriod().subscribe(p => { this.month = p.month; this.year = p.year; this.certYear = p.year; });
  }

  /** Data e hora da geração (horário local), para cada download ter um nome único: 2026-11-20_17-05-32. */
  private stamp() {
    const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  }

  private save(blob: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  downloadCertification() {
    this.error.set(''); this.busy.set(true);
    this.api.certification(this.certYear).subscribe({
      next: blob => { this.busy.set(false); this.save(blob, `certificacao-${this.stamp()}.pdf`); },
      error: () => { this.busy.set(false); this.error.set('Não foi possível gerar o relatório de certificação.'); }
    });
  }

  download(fmt: 'pdf' | 'xlsx') {
    this.error.set(''); this.busy.set(true);
    this.api.report(this.year, this.month, fmt).subscribe({
      next: blob => { this.busy.set(false); this.save(blob, `relatorio-${this.stamp()}.${fmt}`); },
      error: () => { this.busy.set(false); this.error.set('Não foi possível gerar o relatório para este período.'); }
    });
  }
}
