import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CompanyItem } from '../../core/api.service';
import { Icon } from '../../core/icon';

export const SIZES: Record<string, string> = { Micro: 'Microempresa', Small: 'Pequena', Medium: 'Média' };

const SECTORS = ['Agricultura', 'Pecuaria', 'Pesca', 'Producao_florestal', 'Industrias_extrativas', 'Industrias_de_transformacao',
  'Eletricidade', 'Gas', 'Agua_e_esgoto', 'Atividades_de_Gestao_de_Residuos_de_descontaminacao', 'Construcao', 'Comercio',
  'Reparacao_de_veiculos_automotores', 'Transporte_armazenagem_correio', 'Alojamento', 'Informacao', 'Comunicacao',
  'Atividades_financeiras', 'Atividades_imobiliarias', 'Atividades_profissionais', 'Cientificas', 'Tecnicas', 'Atividades',
  'Servicos_complementares', 'Administracao_Publica', 'Defesa_Seguridade_Social', 'Educacao', 'Saude_humana', 'Servicos_sociais',
  'Artes', 'Cultura', 'Esporte', 'Recreacao', 'Servicos_relacionados', 'Servicos_domesticos', 'Organismos_internacionais',
  'Outras_Instituicoes_extraterritoriais', 'Outros'];

/** Nomes dos setores com acentuação (os valores do enum na API não têm acentos nem espaços). */
const SECTOR_LABELS: Record<string, string> = {
  Administracao_Publica: 'Administração pública',
  Agua_e_esgoto: 'Água e esgoto',
  Agricultura: 'Agricultura',
  Alojamento: 'Alojamento',
  Artes: 'Artes',
  Atividades: 'Atividades',
  Atividades_de_Gestao_de_Residuos_de_descontaminacao: 'Atividades de gestão de resíduos e descontaminação',
  Atividades_financeiras: 'Atividades financeiras',
  Atividades_imobiliarias: 'Atividades imobiliárias',
  Atividades_profissionais: 'Atividades profissionais',
  Cientificas: 'Científicas',
  Comercio: 'Comércio',
  Comunicacao: 'Comunicação',
  Construcao: 'Construção',
  Cultura: 'Cultura',
  Defesa_Seguridade_Social: 'Defesa e seguridade social',
  Educacao: 'Educação',
  Eletricidade: 'Eletricidade',
  Esporte: 'Esporte',
  Gas: 'Gás',
  Industrias_de_transformacao: 'Indústrias de transformação',
  Industrias_extrativas: 'Indústrias extrativas',
  Informacao: 'Informação',
  Organismos_internacionais: 'Organismos internacionais',
  Outras_Instituicoes_extraterritoriais: 'Outras instituições extraterritoriais',
  Pecuaria: 'Pecuária',
  Pesca: 'Pesca',
  Producao_florestal: 'Produção florestal',
  Recreacao: 'Recreação',
  Reparacao_de_veiculos_automotores: 'Reparação de veículos automotores',
  Saude_humana: 'Saúde humana',
  Servicos_complementares: 'Serviços complementares',
  Servicos_domesticos: 'Serviços domésticos',
  Servicos_relacionados: 'Serviços relacionados',
  Servicos_sociais: 'Serviços sociais',
  Tecnicas: 'Técnicas',
  Transporte_armazenagem_correio: 'Transporte, armazenagem e correio',
  Outros: 'Outros'
};

@Component({
  selector: 'app-companies',
  imports: [FormsModule, DatePipe, Icon],
  template: `
    <div class="page-header">
      <div><h2>Empresas</h2><p>Cadastre as empresas atendidas pelo sistema. Depois, crie o primeiro Gestor em <b>Usuários</b>.</p></div>
    </div>

    <form (ngSubmit)="add()" class="card stack">
      <h3>Nova empresa</h3>
      <div class="form-grid">
        <label class="field">Razão social <input name="legal" [(ngModel)]="f.legalName" required maxlength="200"></label>
        <label class="field">Nome fantasia <input name="trading" [(ngModel)]="f.tradingName" maxlength="200"></label>
        <label class="field">Setor
          <select name="sector" [(ngModel)]="f.sector">
            @for (s of sectors; track s) { <option [value]="s">{{ label(s) }}</option> }
          </select>
        </label>
        <label class="field">Porte
          <select name="size" [(ngModel)]="f.size">
            <option value="">Não informado</option>
            @for (k of sizeKeys; track k) { <option [value]="k">{{ sizes[k] }}</option> }
          </select>
        </label>
        <button class="btn btn-primary" type="submit"><app-icon name="plus" /> Cadastrar empresa</button>
      </div>
      @if (error()) { <div class="alert bad" role="alert"><app-icon name="alert" />{{ error() }}</div> }
      @if (ok()) { <div class="alert ok" role="status"><app-icon name="check" />{{ ok() }}</div> }
    </form>

    <div class="table-wrap" style="margin-top:1rem">
      <table>
        <thead><tr><th>Razão social</th><th>Nome fantasia</th><th>Setor</th><th>Porte</th><th>Cadastro</th><th>Situação</th></tr></thead>
        <tbody>
          @for (c of items(); track c.id) {
            <tr>
              <td><b>{{ c.legalName }}</b></td>
              <td>{{ c.tradingName || '-' }}</td>
              <td>{{ label(c.sector) }}</td>
              <td>{{ c.size ? sizes[c.size] : '-' }}</td>
              <td>{{ c.createdAt | date:'dd/MM/yyyy' }}</td>
              <td><span class="badge" [class.ok]="c.isActive">{{ c.isActive ? 'Ativa' : 'Inativa' }}</span></td>
            </tr>
          } @empty { <tr><td colspan="6" class="empty">Nenhuma empresa cadastrada.</td></tr> }
        </tbody>
      </table>
    </div>
  `
})
export class Companies implements OnInit {
  private api = inject(ApiService);
  sectors = SECTORS;
  sizes = SIZES;
  sizeKeys = Object.keys(SIZES);
  items = signal<CompanyItem[]>([]);
  error = signal('');
  ok = signal('');
  f = { legalName: '', tradingName: '', sector: 'Comercio', size: '' };

  label = (s: string) => SECTOR_LABELS[s] ?? s.replace(/_/g, ' ');
  ngOnInit() { this.load(); }
  load() { this.api.companies().subscribe(c => this.items.set(c)); }
  add() {
    this.error.set(''); this.ok.set('');
    const body = { legalName: this.f.legalName, tradingName: this.f.tradingName || this.f.legalName, sector: this.f.sector, size: this.f.size || null };
    this.api.createCompany(body).subscribe({
      next: c => {
        this.ok.set(`Empresa "${c.legalName}" cadastrada. Agora crie o Gestor dela em Usuários.`);
        this.f = { legalName: '', tradingName: '', sector: 'Comercio', size: '' };
        this.load();
      },
      error: e => this.error.set(typeof e.error === 'string' && e.error ? e.error : 'Não foi possível cadastrar a empresa.')
    });
  }
}
