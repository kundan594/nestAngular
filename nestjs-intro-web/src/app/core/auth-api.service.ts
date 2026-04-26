import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  CreateUserPayload,
  SignInPayload,
  TokensResponse,
  User,
} from './types';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly api = inject(ApiClientService);

  signUp(payload: CreateUserPayload) {
    return this.api.post<User>('users', payload);
  }

  signIn(payload: SignInPayload) {
    return this.api.post<TokensResponse>('auth/sign-in', payload);
  }

  refreshTokens(refreshToken: string) {
    return this.api.post<TokensResponse>('auth/refresh-tokens', {
      refreshToken,
    });
  }
}
