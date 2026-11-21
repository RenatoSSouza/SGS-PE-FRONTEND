import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, GoalProgress, History, HistoryPoint, Insights } from '../../core/api.service';
import { Icon } from '../../core/icon';

type SeriesKey = 'energyNetKwh' | 'waterNetM3' | 'wasteTotalKg' | 'totalCo2Kg';
interface Series { key: SeriesKey; label: string; unit: string; ods: string; color: string; }

const SERIES: Series[] = [
  { key: 'energyNetKwh', label: 'Energia', unit: 'kWh', ods: 'energia', color: 'var(--energy)' },
  { key: 'waterNetM3', label: 'Água', unit: 'm³', ods: 'agua', color: 'var(--water)' },
  { key: 'wasteTotalKg', label: 'Resíduos', unit: 'kg', ods: 'residuos', color: 'var(--waste)' },
  { key: 'totalCo2Kg', label: 'Carbono', unit: 'kg CO₂e', ods: 'carbono', color: 'var(--carbon)' }
];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Variação (em %) até a qual o total é considerado semelhante ao do ano anterior. */
const SIMILAR_PERCENT = 2;

// Geometria do gráfico (viewBox)
const W = 640, H = 260, L = 52, R = 14, T = 14, B = 34;

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, FormsModule, Icon],
  template: `
    <div class="page-header">
      <div>
        <h2>Dashboard</h2>
        <p>Resumo de {{ periodLabel() }}</p>
      </div>
      @if (history()?.points?.length) {
        <label class="field" style="min-width: 190px">Período
          <select [ngModel]="periodKey()" (ngModelChange)="selectPeriod($event)">
            @for (p of periodOptions(); track p.key) { <option [value]="p.key">{{ p.label }}</option> }
          </select>
        </label>
      }
    </div>

    @if (loaded() && !hasData()) {
      <div class="card empty">
        <app-icon name="clipboard" [size]="40" />
        <b>Ainda não há registros</b>
        Comece cadastrando o consumo de energia, água e resíduos em <b style="display:inline">Registros</b>.
      </div>
    } @else {
      <div class="grid kpis">
        <article class="card kpi" style="--accent: var(--energy)">
          <div class="kpi-top"><span class="kpi-icon"><app-icon name="zap" /></span> Energia</div>
          <div class="kpi-value">{{ insights()?.energy ? (insights()!.energy!.netKwh | number:'1.0-0') : '-' }}<span class="kpi-unit">kWh</span></div>
          <div class="kpi-foot"><span class="pill" [class]="trendOf(insights()?.energy?.changePercent)">{{ delta(insights()?.energy?.changePercent, insights()?.energy?.anomaly) }}</span></div>
          <div class="kpi-foot"><span class="pill" [class]="trendOf(compare().yoy.energy)">{{ yearDelta(compare().yoy.energy) }}</span></div>
        </article>
        <article class="card kpi" style="--accent: var(--water)">
          <div class="kpi-top"><span class="kpi-icon"><app-icon name="droplet" /></span> Água</div>
          <div class="kpi-value">{{ insights()?.water ? (insights()!.water!.netM3 | number:'1.0-1') : '-' }}<span class="kpi-unit">m³</span></div>
          <div class="kpi-foot"><span class="pill" [class]="trendOf(insights()?.water?.changePercent)">{{ delta(insights()?.water?.changePercent, insights()?.water?.anomaly) }}</span></div>
          <div class="kpi-foot"><span class="pill" [class]="trendOf(compare().yoy.water)">{{ yearDelta(compare().yoy.water) }}</span></div>
        </article>
        <article class="card kpi" style="--accent: var(--waste)">
          <div class="kpi-top"><span class="kpi-icon"><app-icon name="recycle" /></span> Resíduos</div>
          <div class="kpi-value">{{ insights()?.waste ? (insights()!.waste!.totalKg | number:'1.0-0') : '-' }}<span class="kpi-unit">kg</span></div>
          @if (insights()?.waste) {
            <div class="kpi-foot"><span class="pill" [class]="trendOf(compare().mom.waste)">{{ delta(compare().mom.waste) }}</span></div>
            <div class="kpi-foot"><span class="pill" [class]="trendOf(compare().yoy.waste)">{{ yearDelta(compare().yoy.waste) }}</span></div>
            <div class="kpi-foot">{{ insights()!.waste!.recyclingRatePercent | number:'1.0-1' }}% reciclado</div>
          } @else { <div class="kpi-foot">Sem registro no mês</div> }
        </article>
        <article class="card kpi" style="--accent: var(--carbon)">
          <div class="kpi-top"><span class="kpi-icon"><app-icon name="leaf" /></span> Carbono</div>
          <div class="kpi-value">{{ insights() ? (insights()!.totalCo2Kg | number:'1.0-0') : '-' }}<span class="kpi-unit">kg CO₂e</span></div>
          <div class="kpi-foot"><span class="pill" [class]="trendOf(compare().mom.carbon)">{{ delta(compare().mom.carbon) }}</span></div>
          <div class="kpi-foot"><span class="pill" [class]="trendOf(compare().yoy.carbon)">{{ yearDelta(compare().yoy.carbon) }}</span></div>
          <div class="kpi-foot">Energia + água + resíduos em aterro</div>
        </article>
      </div>

      <div class="grid two" style="margin-top: 1rem">
        <section class="card">
          <div class="card-head">
            <h3>Tendência: 12 meses até {{ shortPeriod(period()) }}</h3>
            <div class="tabs" role="tablist">
              @for (s of series; track s.key) {
                <button role="tab" [attr.aria-selected]="sel().key === s.key" [class.on]="sel().key === s.key" (click)="sel.set(s)">{{ s.label }}</button>
              }
            </div>
          </div>

          <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="chart" role="img"
               [attr.aria-label]="'Gráfico de tendência de ' + sel().label + ' nos 12 meses até ' + shortPeriod(period())"
               [style.--accent]="sel().color" (mouseleave)="hover.set(null)">
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity=".28" />
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
              </linearGradient>
            </defs>

            @for (g of gridLines(); track g.y) {
              <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="g.y" [attr.y2]="g.y" class="grid-line" />
              <text [attr.x]="L - 8" [attr.y]="g.y + 4" text-anchor="end" class="axis">{{ g.label }}</text>
            }
            @for (c of columns(); track c.i) {
              <text [attr.x]="c.x" [attr.y]="H - 10" text-anchor="middle" class="axis" [class.strong]="c.i === hover()">{{ c.label }}</text>
            }

            @if (prevLinePath()) { <path [attr.d]="prevLinePath()" class="line prev" /> }
            @for (d of prevDots(); track d.i) {
              <circle [attr.cx]="d.x" [attr.cy]="d.y" [attr.r]="d.i === hover() ? 4.5 : 2.6" class="dot prev" />
            }
            @if (areaPath()) { <path [attr.d]="areaPath()" fill="url(#area)" /> }
            @if (linePath()) { <path [attr.d]="linePath()" class="line" /> }

            @if (hoverPoint(); as hp) {
              <line [attr.x1]="hp.x" [attr.x2]="hp.x" [attr.y1]="T" [attr.y2]="H - B" class="cursor" />
            }
            @for (d of dots(); track d.i) {
              <circle [attr.cx]="d.x" [attr.cy]="d.y" [attr.r]="d.i === hover() ? 6 : 3.8" class="dot" />
            }
            @for (c of columns(); track c.i) {
              <rect [attr.x]="c.x - c.w / 2" [attr.y]="T" [attr.width]="c.w" [attr.height]="H - B - T" fill="transparent"
                    (mouseenter)="hover.set(c.i)" (focus)="hover.set(c.i)" tabindex="0"
                    [attr.aria-label]="c.label + ': ' + (c.value === null ? 'sem registro' : (c.value | number:'1.0-1') + ' ' + sel().unit)" />
            }
            @if (hoverPoint(); as hp) {
              <g [attr.transform]="'translate(' + hp.tx + ',' + hp.ty + ')'" class="tip" pointer-events="none">
                <rect [attr.width]="TIP_W" [attr.height]="hp.prev ? 62 : 44" rx="8" />
                <text x="10" y="18" class="tip-label">{{ hp.label }}</text>
                <text x="10" y="35" class="tip-value">{{ hp.value | number:'1.0-1' }} {{ sel().unit }}</text>
                @if (hp.prev; as pv) {
                  <text x="10" y="53" class="tip-label">{{ pv.label }}: {{ pv.value | number:'1.0-1' }}</text>
                }
              </g>
            }
          </svg>
          @if (prevDots().length) {
            <div class="legend">
              <span><i class="key"></i> 12 meses até {{ shortPeriod(period()) }}
                <b class="pill" [class]="trend()" [title]="trendTitle()">{{ totals().cur | number:'1.0-0' }} {{ sel().unit }}</b></span>
              <span><i class="key prev"></i> 12 meses anteriores
                <b>{{ totals().prev | number:'1.0-0' }} {{ sel().unit }}</b></span>
              @if (totals().change !== null) {
                <span class="chg pill" [class]="trend()" [title]="trendTitle()">
                  {{ totals().change! > 0 ? '▲' : totals().change! < 0 ? '▼' : '•' }} {{ abs(totals().change!) | number:'1.0-1' }}%
                  @if (totals().partial) { <small>(meses com dados nos dois períodos)</small> }
                </span>
              }
            </div>
          }
          <p class="muted ods">
            <app-icon name="info" [size]="15" />
            ODS {{ odsOf().number }}: {{ odsOf().name }}
          </p>
        </section>

        <div class="stack side">
          <section class="card panel alerts-card">
            <div class="card-head"><h3>Alertas de metas</h3>
              @if (alerts().length) { <span class="badge bad">{{ alerts().length }}</span> }
            </div>
            <div class="panel-body">
            @for (a of alerts(); track a.goal.id) {
              <div class="alert" [class.bad]="a.status === 'Off' || a.isOverdue" [class.warn]="a.status === 'Warning' && !a.isOverdue" style="margin-bottom:.5rem">
                <app-icon name="alert" />
                <div><b>{{ a.goal.title }}</b><br>{{ a.message }}</div>
              </div>
            } @empty {
              <div class="alert ok"><app-icon name="check" /> Nenhuma meta em alerta neste período.</div>
            }
            </div>
          </section>

          <section class="card panel sugg-card">
            <div class="card-head"><h3>Sugestões de melhoria</h3>
              @if (insights()?.suggestions?.length) { <span class="badge info">{{ insights()!.suggestions.length }}</span> }
            </div>
            <div class="panel-body">
            @for (s of insights()?.suggestions ?? []; track s.title) {
              <div class="sugg">
                <div class="sugg-head"><span class="badge info">{{ s.area }}</span><b>{{ s.title }}</b></div>
                <p class="muted">{{ s.description }}</p>
              </div>
            } @empty {
              <p class="muted">Nenhuma sugestão para este período.</p>
            }
            </div>
          </section>
        </div>
      </div>
    }
  `,
  styles: [`
    .chart { width: 100%; height: auto; display: block; }
    .grid-line { stroke: var(--border); stroke-width: 1; }
    .axis { font-size: 11px; fill: var(--muted); }
    .axis.strong { fill: var(--text); font-weight: 700; }
    .line { fill: none; stroke: var(--accent); stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: var(--surface); stroke: var(--accent); stroke-width: 2.4; transition: r .1s; }
    .line.prev { stroke: var(--muted); stroke-width: 2; stroke-dasharray: 5 4; opacity: .75; }
    .dot.prev { stroke: var(--muted); stroke-width: 1.8; }
    .legend { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem 1.1rem; font-size: .82rem; color: var(--muted); margin-top: .4rem; }
    .legend b { color: var(--text); margin-left: .2rem; }
    .key { display: inline-block; width: 18px; height: 0; border-top: 3px solid var(--accent); vertical-align: middle; margin-right: .3rem; }
    .key.prev { border-top: 2px dashed var(--muted); }
    .chg { font-weight: 700; }
    .chg small { font-weight: 400; opacity: .8; }
    .pill { padding: .1rem .5rem; border-radius: 999px; }
    .kpi-foot .pill { display: inline-block; border-radius: 8px; line-height: 1.35; }
    .pill.better { background: var(--ok-soft); color: var(--ok); }
    .pill.worse { background: var(--danger-soft); color: var(--danger); }
    .pill.similar { background: var(--warn-soft); color: var(--warn); }
    .cursor { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 3 3; opacity: .6; }
    .tip rect { fill: var(--text); }
    .tip-label { fill: var(--surface); font-size: 11px; opacity: .8; }
    .tip-value { fill: var(--surface); font-size: 13px; font-weight: 700; }
    rect:focus-visible { outline: none; }
    .ods { display: flex; align-items: center; gap: .4rem; font-size: .82rem; margin-top: .5rem; }
    .sugg { padding: .6rem 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: .2rem; }
    .sugg:first-of-type { border-top: 0; padding-top: 0; }
    .sugg-head { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; }
    .sugg-head b { font-size: .9rem; }
    .sugg p { font-size: .82rem; line-height: 1.4; }
    .panel { display: flex; flex-direction: column; min-height: 0; }
    .panel .card-head { margin-bottom: .6rem; }
    .panel-body { min-height: 0; overflow-y: auto; scrollbar-width: thin; padding-right: .25rem; }
    /* Telas largas: a coluna da direita acompanha a altura do gráfico; alertas e sugestões rolam por dentro
       do próprio card em vez de alongar a página. */
    @media (min-width: 961px) {
      .side { align-self: stretch; height: 0; min-height: 100%; }
      .alerts-card { flex: 0 1 auto; max-height: 50%; }
      .sugg-card { flex: 1 1 0; }
    }
  `]
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  readonly W = W; readonly H = H; readonly L = L; readonly R = R; readonly T = T; readonly B = B;

  series = SERIES;
  sel = signal(SERIES[0]);
  hover = signal<number | null>(null);
  history = signal<History | null>(null);
  insights = signal<Insights | null>(null);
  alerts = signal<GoalProgress[]>([]);
  loaded = signal(false);
  hasData = signal(true);
  period = signal<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  periodKey = computed(() => `${this.period().year}-${this.period().month}`);
  periodLabel = computed(() => `${MONTHS_LONG[this.period().month - 1]} de ${this.period().year}`);
  periodOptions = computed(() => [...(this.history()?.points ?? [])].reverse()
    .filter(p => p.energyNetKwh != null || p.waterNetM3 != null || p.wasteTotalKg > 0).map(p => ({
    key: `${p.year}-${p.month}`, label: `${MONTHS_LONG[p.month - 1]} de ${p.year}`
  })));

  /** Série completa carregada (36 meses), usada nas comparações e no seletor de período. */
  private allPoints = computed<HistoryPoint[]>(() => this.history()?.points ?? []);
  private selIndex = computed(() => {
    const { year, month } = this.period();
    return this.allPoints().findIndex(p => p.year === year && p.month === month);
  });
  /** Janela do gráfico: 12 meses terminando no período selecionado. */
  private points = computed<HistoryPoint[]>(() => {
    const all = this.allPoints(), i = this.selIndex();
    const end = i >= 0 ? i + 1 : all.length;
    return all.slice(Math.max(0, end - 12), end);
  });
  /** Variações % sobre o mês anterior (resíduos e carbono; energia e água vêm do back-end) e sobre o
   *  mesmo mês do ano anterior (todos). Mesma regra do back-end: sem base > 0, não há comparação. */
  compare = computed(() => {
    const pts = this.allPoints(), i = this.selIndex();
    const cur = pts[i], prev = i > 0 ? pts[i - 1] : undefined, last = i >= 12 ? pts[i - 12] : undefined;
    const change = (c?: number | null, p?: number | null) =>
      c == null || p == null || p <= 0 ? null : Math.round(((c - p) / p) * 1000) / 10;
    return {
      mom: { waste: change(cur?.wasteTotalKg, prev?.wasteTotalKg), carbon: change(cur?.totalCo2Kg, prev?.totalCo2Kg) },
      yoy: {
        energy: change(cur?.energyNetKwh, last?.energyNetKwh), water: change(cur?.waterNetM3, last?.waterNetM3),
        waste: change(cur?.wasteTotalKg, last?.wasteTotalKg), carbon: change(cur?.totalCo2Kg, last?.totalCo2Kg)
      }
    };
  });
  private values = computed(() => this.points().map(p => (p[this.sel().key] as number | null | undefined) ?? null));
  /** Mesmo mês do ano anterior para cada ponto do gráfico (null quando não há registro naquele mês). */
  private prevPoints = computed(() => {
    const all = this.allPoints(), i = this.selIndex();
    const end = i >= 0 ? i + 1 : all.length, start = Math.max(0, end - 12);
    return this.points().map((_, k) => {
      const p = all[start + k - 12];
      return p && (p.energyNetKwh != null || p.waterNetM3 != null || p.wasteTotalKg > 0) ? p : null;
    });
  });
  private prevValues = computed(() => this.prevPoints().map(p => p ? (p[this.sel().key] as number | null | undefined) ?? null : null));
  /** Totais dos dois períodos, somando só os meses que têm valor nos dois, para a comparação ser justa. */
  totals = computed(() => {
    const cur = this.values(), prev = this.prevValues();
    let a = 0, b = 0, n = 0;
    cur.forEach((v, k) => { const pv = prev[k]; if (v != null && pv != null) { a += v; b += pv; n++; } });
    const curAll = cur.reduce<number>((s, v) => s + (v ?? 0), 0), prevAll = prev.reduce<number>((s, v) => s + (v ?? 0), 0);
    return { cur: curAll, prev: prevAll, change: b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null,
      partial: n < cur.filter(v => v != null).length || n < prev.filter(v => v != null).length };
  });
  trend = computed(() => this.trendOf(this.totals().change));
  /** Classe de cor de uma variação %: verde (menor), vermelho (maior), amarelo (até ±2%). Sem comparação: neutra.
   *  Nos quatro indicadores, consumir, gerar ou emitir menos é o desejável. */
  trendOf(c: number | null | undefined) {
    return c == null ? '' : Math.abs(c) <= SIMILAR_PERCENT ? 'similar' : c < 0 ? 'better' : 'worse';
  }
  trendTitle = computed(() => ({ better: 'Menor que nos 12 meses anteriores', worse: 'Maior que nos 12 meses anteriores',
    similar: `Semelhante aos 12 meses anteriores (variação de até ${SIMILAR_PERCENT}%)` } as Record<string, string>)[this.trend()] ?? '');
  abs = Math.abs;
  readonly TIP_W = 150;
  private max = computed(() => {
    const m = Math.max(0, ...this.values().map(v => v ?? 0), ...this.prevValues().map(v => v ?? 0));
    if (m === 0) return 1;
    const raw = m * 1.1, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  });
  private x = (i: number, n: number) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  private y = (v: number) => T + (1 - v / this.max()) * (H - T - B);

  columns = computed(() => {
    const n = this.points().length, w = n > 1 ? (W - L - R) / (n - 1) : W - L - R;
    return this.points().map((p, i) => ({ i, x: this.x(i, n), w, label: MONTHS[p.month - 1], value: this.values()[i] }));
  });
  dots = computed(() => {
    const n = this.points().length;
    return this.values().map((v, i) => ({ i, v, x: this.x(i, n), y: v === null ? 0 : this.y(v) })).filter(d => d.v !== null) as { i: number; v: number; x: number; y: number }[];
  });
  linePath = computed(() => this.dots().map((d, k) => `${k ? 'L' : 'M'}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' '));
  prevDots = computed(() => {
    const n = this.points().length;
    return this.prevValues().map((v, i) => ({ i, v, x: this.x(i, n), y: v === null ? 0 : this.y(v) })).filter(d => d.v !== null) as { i: number; v: number; x: number; y: number }[];
  });
  prevLinePath = computed(() => this.prevDots().map((d, k) => `${k ? 'L' : 'M'}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' '));
  areaPath = computed(() => {
    const d = this.dots();
    if (d.length < 2) return '';
    const base = (H - B).toFixed(1);
    return `${this.linePath()} L${d[d.length - 1].x.toFixed(1)},${base} L${d[0].x.toFixed(1)},${base} Z`;
  });
  gridLines = computed(() => [0, 1, 2, 3, 4].map(k => {
    const v = (this.max() * k) / 4;
    return { y: this.y(v), label: v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${+v.toFixed(1)}` };
  }));
  hoverPoint = computed(() => {
    const i = this.hover();
    if (i === null) return null;
    const d = this.dots().find(p => p.i === i);
    if (!d) return null;
    const p = this.points()[i], pp = this.prevPoints()[i], pv = this.prevValues()[i];
    const prev = pp && pv != null ? { label: `${MONTHS[pp.month - 1]}/${pp.year}`, value: pv } : null;
    return { x: d.x, label: `${MONTHS[p.month - 1]}/${p.year}`, value: d.v, prev,
      tx: Math.min(Math.max(d.x - this.TIP_W / 2, L), W - R - this.TIP_W), ty: Math.max(d.y - (prev ? 74 : 56), T) };
  });
  odsOf = computed(() => this.history()?.ods[this.sel().ods] ?? { number: 0, name: '' });

  ngOnInit() {
    this.api.history(36).subscribe({
      next: h => {
        this.history.set(h);
        const last = [...h.points].reverse().find(p => p.energyNetKwh != null || p.waterNetM3 != null || p.wasteTotalKg > 0);
        this.hasData.set(!!last);
        this.loaded.set(true);
        if (last) { this.period.set({ year: last.year, month: last.month }); this.loadPeriod(); }
      },
      error: () => this.loaded.set(true)
    });
  }

  selectPeriod(key: string) {
    const [year, month] = key.split('-').map(Number);
    this.period.set({ year, month });
    this.loadPeriod();
  }

  private loadPeriod() {
    const { year, month } = this.period();
    this.insights.set(null);
    this.api.insights(year, month).subscribe({ next: i => this.insights.set(i) });
    this.api.goalAlerts(year, month).subscribe({ next: a => this.alerts.set(a) });
  }

  shortPeriod(p: { year: number; month: number }) { return `${MONTHS[p.month - 1].toLowerCase()}/${p.year}`; }

  yearDelta(change: number | null) {
    const { year, month } = this.period();
    const ref = this.shortPeriod({ year: year - 1, month });
    if (change === null) return `Sem dados de ${ref} para comparar`;
    const sign = change > 0 ? '▲' : change < 0 ? '▼' : '•';
    return `${sign} ${Math.abs(change).toLocaleString('pt-BR')}% vs. ${ref}`;
  }

  delta(change: number | null | undefined, anomaly?: boolean) {
    if (change === null || change === undefined) return 'Sem mês anterior para comparar';
    const sign = change > 0 ? '▲' : change < 0 ? '▼' : '•';
    return `${sign} ${Math.abs(change).toLocaleString('pt-BR')}% vs. mês anterior${anomaly ? ' (acima do padrão)' : ''}`;
  }
}
