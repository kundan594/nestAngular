import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from './core/auth-api.service';
import { AuthStateService } from './core/auth-state.service';
import { BlogApiService } from './core/blog-api.service';
import {
  BlogPost,
  CommentItem,
  PaginatedResponse,
  Tag,
  User,
} from './core/types';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly blogApi = inject(BlogApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly heavyPageSize = 50;
  readonly usersPage = signal(1);
  readonly postsPage = signal(1);
  readonly tagsPage = signal(1);
  readonly myPostsPage = signal(1);
  readonly publicPostsPage = signal(1);
  readonly commentsPage = signal(1);
  readonly adminCommentsPage = signal(1);
  readonly selectedCommentPostId = signal(1);

  readonly usersResponse = signal<PaginatedResponse<User> | null>(null);
  readonly postsResponse = signal<PaginatedResponse<BlogPost> | null>(null);
  readonly tagsResponse = signal<PaginatedResponse<Tag> | null>(null);
  readonly myPostsResponse = signal<PaginatedResponse<BlogPost> | null>(null);
  readonly publicPostsResponse = signal<PaginatedResponse<BlogPost> | null>(null);
  readonly commentsResponse = signal<PaginatedResponse<CommentItem> | null>(null);
  readonly adminCommentsResponse = signal<PaginatedResponse<CommentItem> | null>(
    null,
  );
  readonly currentProfile = signal<User | null>(null);
  readonly uploadResult = signal('');

  readonly authUser = computed(() => this.authState.currentUser());
  readonly isAdmin = computed(() => !!this.authUser()?.isAdmin);
  readonly myTagCards = computed(() => {
    const map = new Map<number, Tag>();

    for (const post of this.myPostsResponse()?.data ?? []) {
      for (const tag of post.tags ?? []) {
        map.set(tag.id, tag);
      }
    }

    return Array.from(map.values()).sort((left, right) => left.id - right.id);
  });
  readonly totalVisibleRecords = computed(() => {
    const counts = [
      this.usersResponse()?.data.length ?? 0,
      this.postsResponse()?.data.length ?? 0,
      this.tagsResponse()?.data.length ?? 0,
      this.myPostsResponse()?.data.length ?? 0,
      this.publicPostsResponse()?.data.length ?? 0,
      this.commentsResponse()?.data.length ?? 0,
      this.adminCommentsResponse()?.data.length ?? 0,
    ];

    return counts.reduce((sum, current) => sum + current, 0);
  });

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

  readonly createTagModel = {
    name: '',
    slug: '',
    description: '',
    schema: '{"kind":"tag"}',
    featuredImage: 'https://picsum.photos/640/360',
  };

  readonly editTagModel = {
    id: 0,
    name: '',
    slug: '',
    description: '',
    schema: '',
    featuredImage: '',
  };

  readonly createPostModel = {
    title: '',
    postType: 'post',
    slug: '',
    status: 'published',
    content: '',
    schema: '{"@context":"https://schema.org","@type":"BlogPosting"}',
    featuredImageUrl: 'https://picsum.photos/1280/720',
    publishOn: '',
    tagsCsv: '',
    metaValue: '{"sidebarEnabled":true}',
  };

  readonly updatePostModel = {
    id: 0,
    title: '',
    postType: 'post',
    slug: '',
    status: 'published',
    content: '',
    featuredImageUrl: '',
    publishOn: '',
    tagsCsv: '',
  };

  readonly profileModel = {
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };

  readonly postFilterModel = {
    search: '',
    postType: '',
    featuredOnly: false,
  };

  readonly createCommentModel = {
    postId: 1,
    content: '',
    isAnonymous: false,
  };

  readonly updateCommentModel = {
    id: 0,
    postId: 1,
    content: '',
    isAnonymous: false,
  };

  ngOnInit() {
    void this.reloadAll();
  }

  async reloadAll() {
    const authUser = this.authUser();

    if (!authUser) {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
      const requests = [
        firstValueFrom(this.blogApi.getCurrentUserProfile()),
        firstValueFrom(
          this.blogApi.listPosts(this.myPostsPage(), this.heavyPageSize, authUser.sub),
        ),
        firstValueFrom(
          this.blogApi.listPosts(this.publicPostsPage(), 12, null, {
            search: this.postFilterModel.search || undefined,
            postType: this.postFilterModel.postType || undefined,
            featured: this.postFilterModel.featuredOnly ? true : null,
          }),
        ),
        firstValueFrom(
          this.blogApi.listComments(
            this.commentsPage(),
            20,
            this.selectedCommentPostId(),
          ),
        ),
      ] as const;

      const adminRequests = this.isAdmin()
        ? ([
            firstValueFrom(this.blogApi.listUsers(this.usersPage(), this.heavyPageSize)),
            firstValueFrom(this.blogApi.listPosts(this.postsPage(), this.heavyPageSize)),
            firstValueFrom(this.blogApi.listTags(this.tagsPage(), this.heavyPageSize)),
            firstValueFrom(
              this.blogApi.listComments(this.adminCommentsPage(), this.heavyPageSize),
            ),
          ] as const)
        : ([] as const);

      const [profile, myPosts, publicPosts, comments, ...adminResults] =
        await Promise.all([...requests, ...adminRequests]);

      this.currentProfile.set(profile);
      this.profileModel.id = profile.id;
      this.profileModel.firstName = profile.firstName;
      this.profileModel.lastName = profile.lastName || '';
      this.profileModel.email = profile.email;
      this.profileModel.password = '';
      this.myPostsResponse.set(myPosts);
      this.publicPostsResponse.set(publicPosts);
      this.commentsResponse.set(comments);

      if (this.isAdmin()) {
        const [users, posts, tags, adminComments] = adminResults as [
          PaginatedResponse<User>,
          PaginatedResponse<BlogPost>,
          PaginatedResponse<Tag>,
          PaginatedResponse<CommentItem>,
        ];

        this.usersResponse.set(users);
        this.postsResponse.set(posts);
        this.tagsResponse.set(tags);
        this.adminCommentsResponse.set(adminComments);
      } else {
        this.usersResponse.set(null);
        this.postsResponse.set(null);
        this.tagsResponse.set(null);
        this.adminCommentsResponse.set(null);
      }

      this.notice.set('Portal refreshed with heavy listing data.');
    } catch (error) {
      this.error.set(this.formatError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePage(
    section:
      | 'users'
      | 'posts'
      | 'tags'
      | 'my-posts'
      | 'public-posts'
      | 'comments'
      | 'admin-comments',
    direction: number,
  ) {
    if (section === 'users') {
      this.usersPage.update((page) => Math.max(1, page + direction));
    }

    if (section === 'posts') {
      this.postsPage.update((page) => Math.max(1, page + direction));
    }

    if (section === 'tags') {
      this.tagsPage.update((page) => Math.max(1, page + direction));
    }

    if (section === 'my-posts') {
      this.myPostsPage.update((page) => Math.max(1, page + direction));
    }

    if (section === 'public-posts') {
      this.publicPostsPage.update((page) => Math.max(1, page + direction));
    }

    if (section === 'comments') {
      this.commentsPage.update((page) => Math.max(1, page + direction));
    }

    if (section === 'admin-comments') {
      this.adminCommentsPage.update((page) => Math.max(1, page + direction));
    }

    await this.reloadAll();
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

      if (this.createUserModel.isAdmin && this.isAdmin()) {
        await firstValueFrom(
          this.blogApi.updateUser({
            id: createdUser.id,
            isAdmin: true,
          }),
        );
      }

      this.notice.set('User created successfully.');
      this.createUserModel.firstName = '';
      this.createUserModel.lastName = '';
      this.createUserModel.email = '';
      this.createUserModel.password = 'LoadTest@123';
      this.createUserModel.isAdmin = false;
      await this.reloadAll();
    });
  }

  loadUser(user: User) {
    this.editUserModel.id = user.id;
    this.editUserModel.firstName = user.firstName;
    this.editUserModel.lastName = user.lastName || '';
    this.editUserModel.email = user.email;
    this.editUserModel.password = '';
    this.editUserModel.isAdmin = !!user.isAdmin;
    this.notice.set(`Loaded user ${user.id} into the editor.`);
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
      this.notice.set(`User ${this.editUserModel.id} updated successfully.`);
      this.editUserModel.password = '';
      await this.reloadAll();
    });
  }

  async deleteUser(id: number) {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.deleteUser(id));
      this.notice.set(`User ${id} deleted.`);
      await this.reloadAll();
    });
  }

  async updateMyProfile() {
    await this.runMutation(async () => {
      await firstValueFrom(
        this.blogApi.updateUser({
          id: this.profileModel.id,
          firstName: this.profileModel.firstName,
          lastName: this.profileModel.lastName,
          email: this.profileModel.email,
          password: this.profileModel.password || undefined,
        }),
      );
      this.profileModel.password = '';
      this.notice.set('Your profile has been updated.');
      await this.reloadAll();
    });
  }

  async createTag() {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.createTag(this.createTagModel));
      this.notice.set('Tag created successfully.');
      this.createTagModel.name = '';
      this.createTagModel.slug = '';
      this.createTagModel.description = '';
      await this.reloadAll();
    });
  }

  loadTag(tag: Tag) {
    this.editTagModel.id = tag.id;
    this.editTagModel.name = tag.name;
    this.editTagModel.slug = tag.slug;
    this.editTagModel.description = tag.description || '';
    this.editTagModel.schema = tag.schema || '';
    this.editTagModel.featuredImage = tag.featuredImage || '';
    this.notice.set(`Loaded tag ${tag.id} into the editor.`);
  }

  async updateTag() {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.updateTag(this.editTagModel));
      this.notice.set(`Tag ${this.editTagModel.id} updated successfully.`);
      await this.reloadAll();
    });
  }

  async deleteTag(id: number, softDelete = false) {
    await this.runMutation(async () => {
      if (softDelete) {
        await firstValueFrom(this.blogApi.softDeleteTag(id));
        this.notice.set(`Tag ${id} soft deleted.`);
      } else {
        await firstValueFrom(this.blogApi.deleteTag(id));
        this.notice.set(`Tag ${id} deleted.`);
      }

      await this.reloadAll();
    });
  }

  async restoreTag(id: number) {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.restoreTag(id));
      this.notice.set(`Tag ${id} restored.`);
      await this.reloadAll();
    });
  }

  async createPost() {
    await this.runMutation(async () => {
      const createdStatus = this.createPostModel.status;

      await firstValueFrom(
        this.blogApi.createPost({
          title: this.createPostModel.title,
          postType: this.createPostModel.postType,
          slug: this.createPostModel.slug,
          status: this.createPostModel.status,
          content: this.createPostModel.content,
          schema: this.createPostModel.schema,
          featuredImageUrl: this.createPostModel.featuredImageUrl,
          publishOn: this.createPostModel.publishOn || undefined,
          tags: this.parseTagIds(this.createPostModel.tagsCsv),
          metaOptions: this.createPostModel.metaValue
            ? { metaValue: this.createPostModel.metaValue }
            : null,
        }),
      );
      this.myPostsPage.set(1);

      if (createdStatus === 'published') {
        this.publicPostsPage.set(1);
      }

      this.notice.set(
        createdStatus === 'published'
          ? 'Post created successfully and should appear in your portal lists.'
          : 'Post created successfully. Draft or review posts appear in My Posts, not the public feed.',
      );
      this.resetPostForm();
      await this.reloadAll();
    });
  }

  loadPost(post: BlogPost) {
    this.updatePostModel.id = post.id;
    this.updatePostModel.title = post.title;
    this.updatePostModel.postType = post.postType;
    this.updatePostModel.slug = post.slug;
    this.updatePostModel.status = post.status;
    this.updatePostModel.content = post.content || '';
    this.updatePostModel.featuredImageUrl = post.featuredImageUrl || '';
    this.updatePostModel.publishOn = post.publishOn
      ? String(post.publishOn).slice(0, 16)
      : '';
    this.updatePostModel.tagsCsv = (post.tags ?? [])
      .map((tag) => tag.id)
      .join(', ');
    this.notice.set(`Loaded post ${post.id} into the editor.`);
  }

  async updatePost() {
    await this.runMutation(async () => {
      await firstValueFrom(
        this.blogApi.updatePost({
          id: this.updatePostModel.id,
          title: this.updatePostModel.title,
          postType: this.updatePostModel.postType,
          slug: this.updatePostModel.slug,
          status: this.updatePostModel.status,
          content: this.updatePostModel.content,
          featuredImageUrl: this.updatePostModel.featuredImageUrl,
          publishOn: this.updatePostModel.publishOn || undefined,
          tags: this.parseTagIds(this.updatePostModel.tagsCsv),
        }),
      );
      this.notice.set(`Post ${this.updatePostModel.id} updated successfully.`);
      await this.reloadAll();
    });
  }

  async deletePost(id: number) {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.deletePost(id));
      this.notice.set(`Post ${id} deleted.`);
      await this.reloadAll();
    });
  }

  focusComments(postId: number) {
    this.selectedCommentPostId.set(postId);
    this.createCommentModel.postId = postId;
    this.updateCommentModel.postId = postId;
    this.commentsPage.set(1);
    void this.reloadAll();
  }

  async createComment() {
    await this.runMutation(async () => {
      await firstValueFrom(
        this.blogApi.createComment({
          postId: this.createCommentModel.postId,
          content: this.createCommentModel.content,
          isAnonymous: this.createCommentModel.isAnonymous,
        }),
      );
      this.notice.set('Comment created successfully.');
      this.createCommentModel.content = '';
      await this.reloadAll();
    });
  }

  loadComment(comment: CommentItem) {
    this.updateCommentModel.id = comment.id;
    this.updateCommentModel.postId = comment.post.id;
    this.updateCommentModel.content = comment.content;
    this.updateCommentModel.isAnonymous = comment.isAnonymous;
    this.notice.set(`Loaded comment ${comment.id} into the editor.`);
  }

  async updateComment() {
    await this.runMutation(async () => {
      await firstValueFrom(
        this.blogApi.updateComment({
          id: this.updateCommentModel.id,
          postId: this.updateCommentModel.postId,
          content: this.updateCommentModel.content,
          isAnonymous: this.updateCommentModel.isAnonymous,
        }),
      );
      this.notice.set(
        `Comment ${this.updateCommentModel.id} updated successfully.`,
      );
      await this.reloadAll();
    });
  }

  async deleteComment(id: number) {
    await this.runMutation(async () => {
      await firstValueFrom(this.blogApi.deleteComment(id));
      this.notice.set(`Comment ${id} deleted.`);
      await this.reloadAll();
    });
  }

  async uploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    await this.runMutation(async () => {
      const result = await firstValueFrom(this.blogApi.uploadFile(file));
      this.uploadResult.set(JSON.stringify(result, null, 2));
      this.notice.set(`Uploaded ${file.name}.`);
      input.value = '';
    });
  }

  async refreshTokens() {
    const refreshToken = this.authState.refreshToken();

    if (!refreshToken) {
      this.error.set('No refresh token available.');
      return;
    }

    await this.runMutation(async () => {
      const tokens = await firstValueFrom(
        this.authApi.refreshTokens(refreshToken),
      );
      this.authState.setSession(tokens);
      this.notice.set('Tokens refreshed successfully.');
      await this.reloadAll();
    });
  }

  signOut() {
    this.authState.clear();
    void this.router.navigateByUrl('/login');
  }

  openUserManagement() {
    void this.router.navigateByUrl('/admin/users');
  }

  private resetPostForm() {
    this.createPostModel.title = '';
    this.createPostModel.slug = '';
    this.createPostModel.status = 'published';
    this.createPostModel.content = '';
    this.createPostModel.tagsCsv = '';
    this.createPostModel.publishOn = '';
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

  private parseTagIds(tagsCsv: string) {
    return tagsCsv
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  private formatError(error: unknown) {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;
    return Array.isArray(message)
      ? message.join(', ')
      : message || 'Request failed.';
  }
}
