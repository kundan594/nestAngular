import { Injectable, computed, signal } from '@angular/core';
import { JwtUser, TokensResponse } from './types';

const ACCESS_TOKEN_KEY = 'nestjs-intro.accessToken';
const REFRESH_TOKEN_KEY = 'nestjs-intro.refreshToken';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  readonly accessToken = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  readonly refreshToken = signal<string | null>(
    localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  readonly isAuthenticated = computed(() => !!this.accessToken());
  readonly currentUser = signal<JwtUser | null>(
    this.decodeToken(localStorage.getItem(ACCESS_TOKEN_KEY)),
  );

  setSession(tokens: TokensResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.accessToken.set(tokens.accessToken);
    this.refreshToken.set(tokens.refreshToken);
    this.currentUser.set(this.decodeToken(tokens.accessToken));
  }

  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
  }

  private decodeToken(token: string | null): JwtUser | null {
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];

      if (!payload) {
        return null;
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      return JSON.parse(decoded) as JwtUser;
    } catch {
      return null;
    }
  }
}
