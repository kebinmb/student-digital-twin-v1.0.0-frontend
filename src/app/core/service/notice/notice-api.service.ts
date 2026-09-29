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
   * Seed / baseline institutional notices used as fallback if backend is unreachable.
   */
  readonly fallbackNotices: NoticeItem[] = [
    {
      id: '1',
      title: 'Midterm Examination Schedule AY 2026-2027 Released',
      category: 'Registrar',
      date: 'Today, 9:00 AM',
      unread: true,
      content: 'Official midterm examination timetable for 1st Semester AY 2026-2027 has been finalized. Room allocations and schedules are viewable in the portal.',
      audience: 'ALL',
      priority: 'IMPORTANT'
    },
    {
      id: '2',
      title: 'Online Encoding of Student Clearance Now Open',
      category: 'Student Affairs',
      date: 'Yesterday',
      unread: false,
      content: 'Students may now settle departmental, library, and laboratory clearances online via the clearance module before the end of the term.',
      audience: 'STUDENT',
      priority: 'NORMAL'
    },
    {
      id: '3',
      title: 'CHMSU ICT Helpdesk Maintenance on Saturday 10 PM',
      category: 'ICT Office',
      date: '2 days ago',
      unread: false,
      content: 'Scheduled server maintenance and infrastructure database optimization will occur this Saturday at 10:00 PM for approximately 2 hours.',
      audience: 'ALL',
      priority: 'NORMAL'
    }
  ];

  /**
   * Fetch active campus notices, falling back to local defaults if endpoint is pending.
   */
  getActiveNotices(): Observable<NoticeItem[]> {
    return this.http.get<NoticeItem[]>(`${this.baseUrl}/active`).pipe(
      catchError(() => of(this.fallbackNotices))
    );
  }

  /**
   * Fetch paginated campus notices.
   */
  getNoticesPaginated(page: number = 0, size: number = 5): Observable<{ content: NoticeItem[]; totalElements: number; totalPages: number }> {
    return this.http.get<{ content: NoticeItem[]; totalElements: number; totalPages: number }>(`${this.baseUrl}?page=${page}&size=${size}`).pipe(
      catchError(() => of({
        content: this.fallbackNotices.slice(page * size, (page + 1) * size),
        totalElements: this.fallbackNotices.length,
        totalPages: Math.ceil(this.fallbackNotices.length / size)
      }))
    );
  }

  /**
   * Create and broadcast an official campus advisory (Role-restricted).
   */
  createNotice(request: CreateNoticeRequest): Observable<NoticeItem> {
    return this.http.post<NoticeItem>(this.baseUrl, request).pipe(
      catchError(() => {
        // Local fallback creation for dev/offline resilience
        const newNotice: NoticeItem = {
          id: String(Date.now()),
          title: request.title,
          category: request.category,
          date: 'Just now',
          unread: true,
          content: request.content,
          audience: request.audience || 'ALL',
          priority: request.priority || 'NORMAL'
        };
        return of(newNotice);
      })
    );
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
