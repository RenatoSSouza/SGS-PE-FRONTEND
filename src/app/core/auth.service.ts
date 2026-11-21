import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type Role = 'Admin' | 'Manager' | 'Employee';
export interface UserInfo { id: string; name: string; email: string; companyId: string; role: Role; }
interface LoginResponse { user: UserInfo; token: string; }

const KEY = 'sgspe.session';
const VIEW_KEY = 'sgspe.viewedCompany';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private session = signal<LoginResponse | null>(this.load());

  user = computed(() => this.session()?.user ?? null);
  token = computed(() => this.session()?.token ?? null);
  isLoggedIn = computed(() => !!this.session());
  isAdmin = computed(() => this.user()?.role === 'Admin');
  private viewedCompanyId = signal<string | null>(this.read(VIEW_KEY));
  companyId = computed(() => (this.isAdmin() && this.viewedCompanyId()) || this.user()?.companyId || '');

  viewCompany(id: string) {
    if (!this.isAdmin()) return;
    this.viewedCompanyId.set(id);
    try { localStorage.setItem(VIEW_KEY, id); } catch {}
  }
  canManage = computed(() => this.user()?.role === 'Admin' || this.user()?.role === 'Manager');

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/users/login`, { email, password }).pipe(
      tap(res => {
        this.session.set(res);
        localStorage.setItem(KEY, JSON.stringify(res));
        this.clearViewedCompany();
      })
    );
  }

  logout() {
    this.session.set(null);
    localStorage.removeItem(KEY);
    this.clearViewedCompany();
    this.router.navigate(['/login']);
  }

  private clearViewedCompany() {
    this.viewedCompanyId.set(null);
    try { localStorage.removeItem(VIEW_KEY); } catch {}
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private load(): LoginResponse | null {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
  }
}
