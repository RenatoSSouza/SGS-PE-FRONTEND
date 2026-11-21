import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface HistoryPoint { year: number; month: number; energyNetKwh: number | null; waterNetM3: number | null;
  wasteTotalKg: number; wasteRecyclingRatePercent: number; totalCo2Kg: number; }
export interface History { points: HistoryPoint[]; ods: Record<string, { number: number; name: string }>; }
export interface Suggestion { area: string; title: string; description: string; }
export interface Insights { year: number; month: number; totalCo2Kg: number; suggestions: Suggestion[];
  energy?: { netKwh: number; changePercent: number | null; anomaly: boolean };
  water?: { netM3: number; changePercent: number | null; anomaly: boolean };
  waste?: { totalKg: number; recycledKg: number; recyclingRatePercent: number }; }
export interface Goal { id: string; title: string; metric: string; targetValue: number; deadline: string; isActive: boolean; responsibleUserId?: string | null; }
export interface GoalProgress { goal: Goal; currentValue: number | null; status: string; isOverdue: boolean; message?: string; }

export interface AppNotification { id: string; goalId?: string; title: string; message: string; createdAt: string; read: boolean; }

export type Resource = 'energy' | 'water' | 'waste' | 'materials' | 'equipments';
export interface Carbon { year: number; month: number; energyKgCo2e: number; waterKgCo2e: number; wasteKgCo2e: number; totalKgCo2e: number;
  factorsUsed: { energyKgCo2PerKwh: number; waterKgCo2PerM3: number; wasteLandfillKgCo2PerKg: number }; }
export interface BenchmarkIndicator { indicator: string; unit: string; higherIsBetter: boolean; companyValue: number | null;
  sectorAverage: number | null; peersWithData: number; differencePercent: number | null; position: string | null; }
export interface Benchmark { sector: string; size?: string; allSizes?: boolean; peerCompanies: number; minimumPeers: number; available: boolean; message?: string; indicators: BenchmarkIndicator[]; }
export interface CompanyItem { id: string; legalName: string; tradingName: string; sector: string; size?: string; isActive: boolean; createdAt: string; }
export interface UserItem { id: string; name: string; email: string; companyId: string; isActive: boolean; role: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = () => `${environment.apiUrl}/companies/${this.auth.companyId()}`;

  history(months = 12) { return this.http.get<History>(`${this.base()}/insights/history`, { params: new HttpParams().set('months', months) }); }
  insights(y: number, m: number) { return this.http.get<Insights>(`${this.base()}/insights/${y}/${m}`); }
  goalAlerts(y: number, m: number) { return this.http.get<GoalProgress[]>(`${this.base()}/goals/alerts/${y}/${m}`); }
  goals() { return this.http.get<Goal[]>(`${this.base()}/goals`); }
  goalProgress(id: string, y: number, m: number) { return this.http.get<GoalProgress>(`${this.base()}/goals/${id}/progress/${y}/${m}`); }
  latestPeriod() {
    const now = new Date();
    const fallback = { year: now.getFullYear(), month: now.getMonth() + 1 };
    return this.history(12).pipe(
      map(h => {
        const last = [...h.points].reverse().find(p => p.energyNetKwh != null || p.waterNetM3 != null || p.wasteTotalKg > 0);
        return last ? { year: last.year, month: last.month } : fallback;
      }),
      catchError(() => of(fallback))
    );
  }
  createGoal(body: unknown) { return this.http.post<Goal>(`${this.base()}/goals`, body); }
  deleteGoal(id: string) { return this.http.delete(`${this.base()}/goals/${id}`); }
  list<T>(resource: Resource) { return this.http.get<T[]>(`${this.base()}/${resource}`); }
  create(resource: Resource, body: unknown) { return this.http.post(`${this.base()}/${resource}`, body); }
  remove(resource: Resource, id: string) { return this.http.delete(`${this.base()}/${resource}/${id}`); }
  carbon(y: number, m: number) { return this.http.get<Carbon>(`${this.base()}/carbon/${y}/${m}`); }
  benchmark(y: number, m: number, size = '') {
    const params = size ? new HttpParams().set('size', size) : undefined;
    return this.http.get<Benchmark>(`${this.base()}/benchmark/${y}/${m}`, { params });
  }
  companies() { return this.http.get<CompanyItem[]>(`${environment.apiUrl}/companies`); }
  createCompany(body: unknown) { return this.http.post<CompanyItem>(`${environment.apiUrl}/companies`, body); }
  users() { return this.http.get<UserItem[]>(`${environment.apiUrl}/users`); }
  createUser(body: unknown) { return this.http.post<UserItem>(`${environment.apiUrl}/users`, body); }
  updateEquipment(id: string, body: unknown) { return this.http.put(`${this.base()}/equipments/${id}`, body); }
  certification(y: number) { return this.http.get(`${this.base()}/reports/certification/${y}/pdf`, { responseType: 'blob' }); }
  notifications() { return this.http.get<AppNotification[]>(`${this.base()}/notifications`); }
  unreadCount() { return this.http.get<{ count: number }>(`${this.base()}/notifications/unread-count`); }
  markRead(id: string) { return this.http.post(`${this.base()}/notifications/${id}/read`, {}); }
  markAllRead() { return this.http.post(`${this.base()}/notifications/read-all`, {}); }
  refreshNotifications() { return this.http.post<{ created: number }>(`${this.base()}/notifications/refresh`, {}); }
  company() { return this.http.get<{ id: string; size?: string; legalName: string; tradingName: string }>(`${environment.apiUrl}/companies/${this.auth.companyId()}`); }
  report(y: number, m: number, fmt: 'pdf' | 'xlsx') {
    return this.http.get(`${this.base()}/reports/${y}/${m}/${fmt}`, { responseType: 'blob' });
  }
}
