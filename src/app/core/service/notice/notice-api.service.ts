import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NoticeItem, CreateNoticeRequest } from '../../models/notice.model';

@Injectable({
  providedIn: 'root'
})
export class NoticeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/notices`;

  /**
   * Fetch active campus notices from the backend API. Returns an empty array if unreachable.
   */
  getActiveNotices(): Observable<NoticeItem[]> {
    return this.http.get<NoticeItem[]>(`${this.baseUrl}/active`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Fetch paginated campus notices from the backend API.
   */
  getNoticesPaginated(page: number = 0, size: number = 5): Observable<{ content: NoticeItem[]; totalElements: number; totalPages: number }> {
    return this.http.get<{ content: NoticeItem[]; totalElements: number; totalPages: number }>(`${this.baseUrl}?page=${page}&size=${size}`).pipe(
      catchError(() => of({
        content: [],
        totalElements: 0,
        totalPages: 0
      }))
    );
  }

  /**
   * Create and broadcast an official campus advisory (Role-restricted).
   */
  createNotice(request: CreateNoticeRequest): Observable<NoticeItem> {
    return this.http.post<NoticeItem>(this.baseUrl, request);
  }

  /**
   * Acknowledge/read a notice for the current authenticated user.
   */
  acknowledgeNotice(noticeId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${noticeId}/acknowledge`, {}).pipe(
      catchError(() => of(void 0))
    );
  }

  /**
   * Archive or delete a notice.
   */
  deleteNotice(noticeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${noticeId}`).pipe(
      catchError(() => of(void 0))
    );
  }
}
