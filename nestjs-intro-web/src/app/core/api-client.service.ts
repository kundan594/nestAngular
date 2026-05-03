import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiEnvelope } from './types';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private readonly http = inject(HttpClient);

  private buildUrl(endpoint: string) {
    return `${environment.apiBaseUrl}/${endpoint.replace(/^\/+/, '')}`;
  }

  private buildParams(
    params?: Record<string, string | number | boolean | null | undefined>,
  ) {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      httpParams = httpParams.set(key, String(value));
    }

    return httpParams;
  }

  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | null | undefined>,
  ) {
    return this.http
      .get<ApiEnvelope<T>>(this.buildUrl(endpoint), {
        params: this.buildParams(params),
      })
      .pipe(map((response) => response.data));
  }

  post<T>(endpoint: string, body: unknown) {
    return this.http
      .post<ApiEnvelope<T>>(this.buildUrl(endpoint), body)
      .pipe(map((response) => response.data));
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.http
      .patch<ApiEnvelope<T>>(this.buildUrl(endpoint), body)
      .pipe(map((response) => response.data));
  }

  delete<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | null | undefined>,
  ) {
    return this.http
      .delete<ApiEnvelope<T>>(this.buildUrl(endpoint), {
        params: this.buildParams(params),
      })
      .pipe(map((response) => response.data));
  }

  upload<T>(endpoint: string, file: File, fieldName = 'file') {
    const formData = new FormData();
    formData.append(fieldName, file);

    return this.http
      .post<ApiEnvelope<T>>(this.buildUrl(endpoint), formData)
      .pipe(map((response) => response.data));
  }
}
