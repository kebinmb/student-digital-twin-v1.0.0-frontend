import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../authentication/auth-service';
import { ResilientSseService } from '../../services/resilient-sse.service';
import {
  CreateRoomRequest,
  CreateScheduleSlotRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  FacultyLoadSummaryResponse,
  InstructorOptionDto,
  RoomResponse,
  SchedulingTermDto,
  SectionDetailResponse,
  UpdateFacultyLoadLimitRequest,
  UpdateTermClassHourLimitRequest
} from '../../models/scheduling.model';

export interface SectionRealtimeEvent {
  eventType: 'ENLISTMENT_UPDATE' | 'GRADE_STATUS_UPDATE';
  termId: number;
  sectionId: number;
  sectionCode?: string;
  enrolledCount?: number;
  maxCapacity?: number;
  gradeStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SchedulingApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly resilientSse = inject(ResilientSseService);
  private readonly baseUrl = `${environment.apiUrl}/v1/scheduling`;

  private allRooms$?: Observable<RoomResponse[]>;
  private availableInstructors$?: Observable<InstructorOptionDto[]>;
  private schedulingTerms$?: Observable<SchedulingTermDto[]>;

  getAllRooms(): Observable<RoomResponse[]> {
    if (!this.allRooms$) {
      this.allRooms$ = this.http.get<RoomResponse[]>(`${this.baseUrl}/rooms`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allRooms$;
  }

  getRoomsByCampus(campusId: number): Observable<RoomResponse[]> {
    return this.http.get<RoomResponse[]>(`${this.baseUrl}/rooms/campus/${campusId}`);
  }

  createRoom(request: CreateRoomRequest): Observable<RoomResponse> {
    return this.http.post<RoomResponse>(`${this.baseUrl}/rooms`, request).pipe(
      tap(() => this.invalidateRoomsCache())
    );
  }

  getSectionsByTerm(termId: number): Observable<SectionDetailResponse[]> {
    return this.http.get<SectionDetailResponse[]>(`${this.baseUrl}/sections/term/${termId}`);
  }

  getSectionById(id: number): Observable<SectionDetailResponse> {
    return this.http.get<SectionDetailResponse>(`${this.baseUrl}/sections/${id}`);
  }

  createSection(request: CreateSectionRequest): Observable<SectionDetailResponse> {
    return this.http.post<SectionDetailResponse>(`${this.baseUrl}/sections`, request);
  }

  updateSection(sectionId: number, request: UpdateSectionRequest): Observable<SectionDetailResponse> {
    return this.http.put<SectionDetailResponse>(`${this.baseUrl}/sections/${sectionId}`, request);
  }

  deleteSection(sectionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sections/${sectionId}`);
  }

  addScheduleSlots(sectionId: number, request: CreateScheduleSlotRequest): Observable<SectionDetailResponse> {
    return this.http.post<SectionDetailResponse>(`${this.baseUrl}/sections/${sectionId}/slots`, request);
  }

  getFacultyWorkload(termId: number, facultyId: number): Observable<FacultyLoadSummaryResponse> {
    return this.http.get<FacultyLoadSummaryResponse>(`${this.baseUrl}/faculty-workload/term/${termId}/faculty/${facultyId}`);
  }

  approveOverload(termId: number, facultyUserId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/faculty-workload/approve-overload`, { termId, facultyUserId });
  }

  updateFacultyWorkloadLimit(facultyUserId: number, request: UpdateFacultyLoadLimitRequest): Observable<FacultyLoadSummaryResponse> {
    return this.http.put<FacultyLoadSummaryResponse>(`${this.baseUrl}/faculty/${facultyUserId}/workload-limit`, request);
  }

  getSchedulingTerms(): Observable<SchedulingTermDto[]> {
    if (!this.schedulingTerms$) {
      this.schedulingTerms$ = this.http.get<SchedulingTermDto[]>(`${this.baseUrl}/terms`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.schedulingTerms$;
  }

  updateTermMaxHoursPerClass(termId: number, maxHoursPerClass: number): Observable<SchedulingTermDto> {
    return this.http.put<SchedulingTermDto>(`${this.baseUrl}/terms/${termId}/max-class-hours`, { maxHoursPerClass }).pipe(
      tap(() => this.invalidateTermsCache())
    );
  }

  getAvailableInstructors(): Observable<InstructorOptionDto[]> {
    if (!this.availableInstructors$) {
      this.availableInstructors$ = this.http.get<InstructorOptionDto[]>(`${this.baseUrl}/instructors`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.availableInstructors$;
  }

  invalidateRoomsCache(): void {
    this.allRooms$ = undefined;
  }

  invalidateTermsCache(): void {
    this.schedulingTerms$ = undefined;
  }

  invalidateInstructorsCache(): void {
    this.availableInstructors$ = undefined;
  }

  invalidateAllCache(): void {
    this.invalidateRoomsCache();
    this.invalidateTermsCache();
    this.invalidateInstructorsCache();
  }

  subscribeToSectionEvents(termId: number = 0): Observable<SectionRealtimeEvent> {
    return this.resilientSse.createStream<SectionRealtimeEvent>(
      `/v1/scheduling/sections/stream?termId=${termId}`,
      ['enlistment-updated', 'grade-status-updated']
    );
  }
}
