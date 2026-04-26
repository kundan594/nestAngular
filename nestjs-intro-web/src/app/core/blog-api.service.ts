import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  BlogPost,
  CreatePostPayload,
  CreateTagPayload,
  CreateUserPayload,
  PaginatedResponse,
  PostMetaOption,
  Tag,
  UpdateUserPayload,
  UpdatePostPayload,
  UploadResult,
  User,
} from './types';

@Injectable({
  providedIn: 'root',
})
export class BlogApiService {
  private readonly api = inject(ApiClientService);

  listUsers(page: number, limit: number) {
    return this.api.get<PaginatedResponse<User>>('users', { page, limit });
  }

  createUser(payload: CreateUserPayload) {
    return this.api.post<User>('users', payload);
  }

  updateUser(payload: UpdateUserPayload) {
    return this.api.patch<User>('users', payload);
  }

  deleteUser(id: number) {
    return this.api.delete<{ deleted: boolean; id: number }>(`users/${id}`);
  }

  getCurrentUserProfile() {
    return this.api.get<User>('users/me/profile');
  }

  listPosts(page: number, limit: number, userId?: number | null) {
    const endpoint = userId ? `posts/${userId}` : 'posts';
    return this.api.get<PaginatedResponse<BlogPost>>(endpoint, { page, limit });
  }

  createPost(payload: CreatePostPayload) {
    return this.api.post<BlogPost>('posts', payload);
  }

  updatePost(payload: UpdatePostPayload) {
    return this.api.patch<BlogPost>('posts', payload);
  }

  deletePost(id: number) {
    return this.api.delete<{ deleted: boolean; id: number }>('posts', { id });
  }

  listTags(page: number, limit: number) {
    return this.api.get<PaginatedResponse<Tag>>('tags', { page, limit });
  }

  createTag(payload: CreateTagPayload) {
    return this.api.post<Tag>('tags', payload);
  }

  deleteTag(id: number) {
    return this.api.delete<{ deleted?: boolean; softDeleted?: boolean; id: number }>(
      'tags',
      { id },
    );
  }

  softDeleteTag(id: number) {
    return this.api.delete<{ deleted?: boolean; softDeleted?: boolean; id: number }>(
      'tags/soft-delete',
      { id },
    );
  }

  createMetaOption(metaValue: string) {
    return this.api.post<PostMetaOption>('meta-options', { metaValue });
  }

  uploadFile(file: File) {
    return this.api.upload<UploadResult>('uploads/file', file);
  }
}
