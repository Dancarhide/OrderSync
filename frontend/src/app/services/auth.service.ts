import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UserSession {
  id: string;
  email: string;
  role: 'Admin' | 'Operator';
  mfa_enabled?: boolean;
}

interface LoginResponse {
  token?: string;
  user?: UserSession;
  mfaRequired?: boolean;
  email?: string;
  message?: string;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  login(email: string, password: string, mfaCode?: string): Observable<LoginResponse> {
    const payload: any = { email, password };
    if (mfaCode && mfaCode.trim()) {
      payload.mfaCode = mfaCode.trim();
    }
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap(response => {
        if (response.mfaRequired) return;
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          localStorage.setItem('ordersync_role', response.user.role || 'Operator');
          localStorage.setItem('ordersync_email', response.user.email);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('ordersync_role');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUser(): UserSession | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getRole(): 'Admin' | 'Operator' {
    return (localStorage.getItem('ordersync_role') as 'Admin' | 'Operator') || 'Admin';
  }
}
