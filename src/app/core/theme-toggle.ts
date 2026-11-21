import { Component, inject } from '@angular/core';
import { Icon } from './icon';
import { ThemeMode, ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [Icon],
  template: `
    <div class="row">
      <span class="title" id="theme-title">Tema</span>
      <div class="seg" role="radiogroup" aria-labelledby="theme-title">
        @for (o of options; track o.mode) {
          <button type="button" role="radio" [attr.aria-checked]="theme.mode() === o.mode" [class.on]="theme.mode() === o.mode"
                  [title]="o.label" [attr.aria-label]="o.label" (click)="theme.set(o.mode)">
            <app-icon [name]="o.icon" [size]="15" />
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: 0 .25rem; }
    .title { font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 700; }
    .seg { display: flex; gap: .15rem; padding: .15rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; }
    button {
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
      width: 30px; height: 26px; color: var(--muted); background: transparent; border: 0;
      border-radius: 7px; transition: background .15s, color .15s;
    }
    button:hover { color: var(--text); }
    button.on { background: var(--surface); color: var(--primary); box-shadow: 0 1px 3px rgb(0 0 0 / 14%); }
  `]
})
export class ThemeToggle {
  theme = inject(ThemeService);
  options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Claro', icon: 'sun' },
    { mode: 'dark', label: 'Escuro', icon: 'moon' },
    { mode: 'system', label: 'Sistema', icon: 'monitor' }
  ];
}
