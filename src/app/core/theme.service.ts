import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'sgspe.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  mode = signal<ThemeMode>(this.load());

  constructor() { this.apply(this.mode()); }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    this.apply(mode);
    try { localStorage.setItem(KEY, mode); } catch {}
  }

  private apply(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
  }

  private load(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch { return 'system'; }
  }
}
