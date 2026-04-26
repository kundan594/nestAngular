import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStateService } from './core/auth-state.service';
import { BlogApiService } from './core/blog-api.service';
import { PaginatedResponse, User } from './core/types';

@Component({
  selector: 'app-admin-users-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users-page.component.html',
  styleUrl: './admin-users-page.component.scss',
})
export class AdminUsersPageComponent implements OnInit {
  private readonly blogApi = inject(BlogApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly usersPage = signal(1);
  readonly pageSize = 25;
  readonly usersResponse = signal<PaginatedResponse<User> | null>(null);

  readonly createUserModel = {
    firstName: '',
    lastName: '',
    email: '',
    password: 'LoadTest@123',
    isAdmin: false,
  };

  readonly editUserModel = {
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    isAdmin: false,
  };

  readonly users = computed(() => this.usersResponse()?.data ?? []);
  readonly selectedUserLabel = computed(() =>
    this.editUserModel.id ? `Editing user #${this.editUserModel.id}` : 'No user selected',
  );

  ngOnInit() {
    void this.loadUsers();
  }

  async loadUsers() {
    this.isLoading.set(true);
    this.error.set('');

    try {
      const users = await firstValueFrom(
        this.blogApi.listUsers(this.usersPage(), this.pageSize),
      );
      this.usersResponse.set(users);
    } catch (error) {
      this.error.set(this.formatError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePage(direction: number) {
    const nextPage = Math.max(1, this.usersPage() + direction);

    if (nextPage === this.usersPage()) {
      return;
    }

    this.usersPage.set(nextPage);
    await this.loadUsers();
  }

  editUser(user: User) {
    this.editUserModel.id = user.id;
    this.editUserModel.firstName = user.firstName;
    this.editUserModel.lastName = user.lastName || '';
    this.editUserModel.email = user.email;
    this.editUserModel.password = '';
    this.editUserModel.isAdmin = !!user.isAdmin;
    this.notice.set(`Loaded ${user.email} into the editor.`);
  }

  resetEditor() {
    this.editUserModel.id = 0;
    this.editUserModel.firstName = '';
    this.editUserModel.lastName = '';
    this.editUserModel.email = '';
    this.editUserModel.password = '';
    this.editUserModel.isAdmin = false;
  }

  async createUser() {
    await this.runMutation(async () => {
      const createdUser = await firstValueFrom(
        this.blogApi.createUser({
          firstName: this.createUserModel.firstName,
          lastName: this.createUserModel.lastName,
          email: this.createUserModel.email,
          password: this.createUserModel.password,
        }),
      );

      if (this.createUserModel.isAdmin) {
        await firstValueFrom(
          this.blogApi.updateUser({
            id: createdUser.id,
            isAdmin: true,
          }),
        );
      }

      this.createUserModel.firstName = '';
      this.createUserModel.lastName = '';
      this.createUserModel.email = '';
      this.createUserModel.password = 'LoadTest@123';
      this.createUserModel.isAdmin = false;
      this.notice.set('User created successfully.');
      await this.loadUsers();
    });
  }

  async updateUser() {
    await this.runMutation(async () => {
      await firstValueFrom(
        this.blogApi.updateUser({
          id: this.editUserModel.id,
          firstName: this.editUserModel.firstName,
          lastName: this.editUserModel.lastName,
          email: this.editUserModel.email,
          password: this.editUserModel.password || undefined,
          isAdmin: this.editUserModel.isAdmin,
        }),
      );

      this.notice.set(`User #${this.editUserModel.id} updated successfully.`);
      this.editUserModel.password = '';
      await this.loadUsers();
    });
  }

  async deleteUser(user: User) {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.deleteUser(user.id));

      if (this.editUserModel.id === user.id) {
        this.resetEditor();
      }

      if (this.authState.currentUser()?.sub === user.id) {
        this.authState.clear();
        await this.router.navigateByUrl('/login');
        return;
      }

      this.notice.set(`Deleted ${user.email}.`);
      await this.loadUsers();
    });
  }

  async goBack() {
    await this.router.navigateByUrl('/');
  }

  private async runMutation(task: () => Promise<void>) {
    this.isLoading.set(true);
    this.error.set('');

    try {
      await task();
    } catch (error) {
      this.error.set(this.formatError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private formatError(error: unknown) {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;
    return Array.isArray(message)
      ? message.join(', ')
      : message || 'Request failed.';
  }
}
