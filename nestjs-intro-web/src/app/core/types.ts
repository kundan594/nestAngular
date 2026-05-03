export interface ApiEnvelope<T> {
  apiVersion?: string;
  data: T;
}

export interface PaginationMeta {
  itemsPerPage: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: number;
  firstName: string;
  lastName?: string | null;
  email: string;
  isAdmin?: boolean;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  schema?: string | null;
  featuredImage?: string | null;
  deletedAt?: string | null;
}

export interface PostMetaOption {
  id?: number;
  metaValue: string;
}

export interface PostAuthor {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string | null;
}

export interface BlogPost {
  id: number;
  title: string;
  postType: string;
  slug: string;
  status: string;
  content?: string | null;
  schema?: string | null;
  featuredImageUrl?: string | null;
  publishOn?: string | null;
  allowComments?: boolean;
  featured?: boolean;
  author: PostAuthor;
  tags?: Tag[];
  metaOptions?: PostMetaOption | null;
}

export interface CommentAuthor {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string | null;
}

export interface CommentPostRef {
  id: number;
  title?: string;
  slug?: string;
}

export interface CommentItem {
  id: number;
  content: string;
  isAnonymous: boolean;
  createdAt?: string;
  updatedAt?: string;
  author?: CommentAuthor;
  post: CommentPostRef;
}

export interface CreateUserPayload {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: number;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface CreateTagPayload {
  name: string;
  slug: string;
  description?: string;
  schema?: string;
  featuredImage?: string;
}

export interface UpdateTagPayload extends Partial<CreateTagPayload> {
  id: number;
}

export interface CreatePostPayload {
  title: string;
  postType: string;
  slug: string;
  status: string;
  content?: string;
  schema?: string;
  featuredImageUrl?: string;
  publishOn?: string;
  tags?: number[];
  metaOptions?: {
    metaValue: string;
  } | null;
}

export interface UpdatePostPayload extends Partial<CreatePostPayload> {
  id: number;
}

export interface PostQuery {
  page?: number;
  limit?: number;
  search?: string;
  tagId?: number | null;
  status?: string;
  postType?: string;
  featured?: boolean | null;
}

export interface CreateCommentPayload {
  postId: number;
  content: string;
  isAnonymous?: boolean;
}

export interface UpdateCommentPayload extends Partial<CreateCommentPayload> {
  id: number;
}

export interface UploadResult {
  id?: number;
  name?: string;
  path?: string;
  url?: string;
}

export interface JwtUser {
  sub: number;
  email: string;
  isAdmin: boolean;
  exp?: number;
  iat?: number;
}
