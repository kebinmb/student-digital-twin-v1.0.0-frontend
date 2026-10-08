import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NoticeItem, CreateNoticeRequest } from '../../models/notice.model';
import { WebSocketService } from '../../services/websocket.service';
import { WS_TOPICS } from '../../constants/websocket-topics.constants';

@Injectable({
  providedIn: 'root'
})
export class NoticeApiService {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService, { optional: true });
  private readonly baseUrl = `${environment.apiUrl}/v1/notices`;

  private readonly _activeNotices$ = new BehaviorSubject<NoticeItem[]>([]);
  public readonly activeNotices$ = this._activeNotices$.asObservable();

  constructor() {
    if (this.wsService) {
      this.wsService.watch<NoticeItem>(WS_TOPICS.NOTIFICATIONS).pipe(
        catchError(() => of(null))
      ).subscribe((notice) => {
        if (notice) {
          const current = this._activeNotices$.value || [];
          this._activeNotices$.next([notice, ...current.filter(n => n.id !== notice.id)]);
        }
      });
    }
  }

  /**
   * Fetch active campus notices from the backend API. Returns an empty array if unreachable.
   */
  getActiveNotices(): Observable<NoticeItem[]> {
    return this.http.get<NoticeItem[]>(`${this.baseUrl}/active`).pipe(
      tap((notices) => this._activeNotices$.next(notices || [])),
      catchError(() => of([]))
    );
  }

  refreshActiveNotices(): void {
    this.http.get<NoticeItem[]>(`${this.baseUrl}/active`).pipe(
      catchError(() => of([]))
    ).subscribe((notices) => {
      this._activeNotices$.next(notices || []);
    });
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
    return this.http.post<NoticeItem>(this.baseUrl, request).pipe(
      tap((created) => {
        if (created) {
          const current = this._activeNotices$.value || [];
          this._activeNotices$.next([created, ...current.filter(n => n.id !== created.id)]);
        }
      })
    );
  }

  /**
   * Acknowledge/read a notice for the current authenticated user.
   */
  acknowledgeNotice(noticeId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${noticeId}/acknowledge`, {}).pipe(
      tap(() => {
        const current = this._activeNotices$.value || [];
        this._activeNotices$.next(current.map(n => n.id === noticeId ? { ...n, unread: false } : n));
      }),
      catchError(() => of(void 0))
    );
  }

  /**
   * Archive or delete a notice.
   */
  deleteNotice(noticeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${noticeId}`).pipe(
      tap(() => {
        const current = this._activeNotices$.value || [];
        this._activeNotices$.next(current.filter(n => n.id !== noticeId));
      }),
      catchError(() => of(void 0))
    );
  }
}
