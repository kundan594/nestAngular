import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from './core/auth-api.service';
import { AuthStateService } from './core/auth-state.service';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly isBusy = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  readonly signInModel = {
    email: 'admin@nestjs.local',
    password: 'LoadTest@123',
  };

  readonly signUpModel = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };

  async signIn() {
    this.isBusy.set(true);
    this.error.set('');
    this.message.set('');

    try {
      const tokens = await firstValueFrom(this.authApi.signIn(this.signInModel));
      this.authState.setSession(tokens);
      this.message.set('Login successful. Redirecting to dashboard.');
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(this.formatError(error));
    } finally {
      this.isBusy.set(false);
    }
  }

  async signUp() {
    this.isBusy.set(true);
    this.error.set('');
    this.message.set('');

    try {
      await firstValueFrom(this.authApi.signUp(this.signUpModel));
      this.message.set('Account created. You can sign in now.');
      this.signInModel.email = this.signUpModel.email;
      this.signUpModel.firstName = '';
      this.signUpModel.lastName = '';
      this.signUpModel.email = '';
      this.signUpModel.password = '';
    } catch (error) {
      this.error.set(this.formatError(error));
    } finally {
      this.isBusy.set(false);
    }
  }

  private formatError(error: unknown) {
    const message = (error as { error?: { message?: string | string[] } })?.error?.message;
    return Array.isArray(message) ? message.join(', ') : message || 'Request failed.';
  }
}
