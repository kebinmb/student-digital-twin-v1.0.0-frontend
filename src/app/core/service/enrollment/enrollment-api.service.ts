import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdvisingEligibilityResponse,
  EnlistSectionRequest,
  EnrollmentConfirmationDto,
  StudentEnrollmentResponse,
  UpdateEnrollmentStatusRequest,
  StudentSearchResultDto
} from '../../models/enrollment.model';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/enrollment`;

  getAdvisingEligibility(
    studentId: number,
    termId: number,
    targetYearLevel?: number,
    targetSemester?: string,
    allCourses: boolean = false
  ): Observable<AdvisingEligibilityResponse> {
    let url = `${this.baseUrl}/advising/student/${studentId}/term/${termId}?allCourses=${allCourses}`;
    if (targetYearLevel) {
      url += `&targetYearLevel=${targetYearLevel}`;
    }
    if (targetSemester) {
      url += `&targetSemester=${targetSemester}`;
    }
    return this.http.get<AdvisingEligibilityResponse>(url);
  }

  enlistSection(studentId: number, request: EnlistSectionRequest): Observable<StudentEnrollmentResponse> {
    return this.http.post<StudentEnrollmentResponse>(`${this.baseUrl}/enlist/student/${studentId}`, request);
  }

  removeEnlistedSection(studentId: number, termId: number, sectionId: number): Observable<StudentEnrollmentResponse> {
    return this.http.delete<StudentEnrollmentResponse>(`${this.baseUrl}/enlist/student/${studentId}/term/${termId}/section/${sectionId}`);
  }

  confirmEnrollment(studentId: number, termId: number): Observable<EnrollmentConfirmationDto> {
    return this.http.post<EnrollmentConfirmationDto>(`${this.baseUrl}/confirm/student/${studentId}`, { termId });
  }

  getEnrollment(studentId: number, termId: number): Observable<StudentEnrollmentResponse> {
    if (!studentId || studentId <= 0 || !termId || termId <= 0) {
      return of({
        enrollmentId: null as unknown as number,
        studentId: studentId,
        studentNumber: '',
        termId: termId,
        termName: 'UNENROLLED',
        enrollmentDate: '',
        status: 'NOT_ENROLLED',
        totalCreditUnits: 0,
        isOverloadApproved: false,
        items: []
      });
    }
    return this.http.get<StudentEnrollmentResponse>(`${this.baseUrl}/student/${studentId}/term/${termId}`);
  }

  getMyEnrollment(termId: number): Observable<StudentEnrollmentResponse> {
    return this.http.get<StudentEnrollmentResponse>(`${this.baseUrl}/me/term/${termId}`);
  }

  getEnrollmentsByTerm(termId: number): Observable<StudentEnrollmentResponse[]> {
    return this.http.get<StudentEnrollmentResponse[]>(`${this.baseUrl}/term/${termId}`);
  }

  updateEnrollmentStatus(enrollmentId: number, request: UpdateEnrollmentStatusRequest): Observable<StudentEnrollmentResponse> {
    return this.http.put<StudentEnrollmentResponse>(`${this.baseUrl}/${enrollmentId}/status`, request);
  }

  searchStudents(query: string): Observable<StudentSearchResultDto[]> {
    return this.http.get<StudentSearchResultDto[]>(`${environment.apiUrl}/v1/students/search`, {
      params: { query }
    });
  }

  createStudent(request: import('../../models/enrollment.model').CreateStudentRequest): Observable<import('../../models/enrollment.model').StudentProfileResponse> {
    return this.http.post<import('../../models/enrollment.model').StudentProfileResponse>(`${environment.apiUrl}/v1/students`, request);
  }

  getStudentById(id: number): Observable<import('../../models/enrollment.model').StudentProfileResponse> {
    return this.http.get<import('../../models/enrollment.model').StudentProfileResponse>(`${environment.apiUrl}/v1/students/${id}`);
  }

  getCurrentStudentProfile(): Observable<import('../../models/enrollment.model').StudentProfileResponse> {
    return this.http.get<import('../../models/enrollment.model').StudentProfileResponse>(`${environment.apiUrl}/v1/students/me`);
  }

  creditTransfereeCourses(
    studentId: number,
    request: import('../../models/enrollment.model').CreditTransfereeCoursesRequest
  ): Observable<import('../../models/enrollment.model').TransfereeCreditingSummaryResponse> {
    return this.http.post<import('../../models/enrollment.model').TransfereeCreditingSummaryResponse>(
      `${environment.apiUrl}/v1/students/${studentId}/credit-courses`,
      request
    );
  }

  getCreditedCourses(studentId: number): Observable<import('../../models/enrollment.model').CourseEquivalencyDto[]> {
    return this.http.get<import('../../models/enrollment.model').CourseEquivalencyDto[]>(
      `${environment.apiUrl}/v1/students/${studentId}/credited-courses`
    );
  }

  getSectionRoster(sectionId: number): Observable<import('../../models/enrollment.model').SectionRosterResponse> {
    return this.http.get<import('../../models/enrollment.model').SectionRosterResponse>(
      `${environment.apiUrl}/v1/sections/${sectionId}/roster`
    );
  }

  saveSectionGrades(
    sectionId: number,
    request: import('../../models/enrollment.model').SaveSectionGradesRequest
  ): Observable<import('../../models/enrollment.model').GradeActionResponse> {
    return this.http.put<import('../../models/enrollment.model').GradeActionResponse>(
      `${environment.apiUrl}/v1/sections/${sectionId}/grades`,
      request
    );
  }

  verifySectionGrades(sectionId: number): Observable<import('../../models/enrollment.model').GradeActionResponse> {
    return this.http.post<import('../../models/enrollment.model').GradeActionResponse>(
      `${environment.apiUrl}/v1/sections/${sectionId}/grades/verify`,
      {}
    );
  }

  rejectSectionGrades(sectionId: number, reason?: string): Observable<import('../../models/enrollment.model').GradeActionResponse> {
    return this.http.post<import('../../models/enrollment.model').GradeActionResponse>(
      `${environment.apiUrl}/v1/sections/${sectionId}/grades/reject`,
      { reason }
    );
  }

  sealSectionGrades(sectionId: number): Observable<import('../../models/enrollment.model').GradeActionResponse> {
    return this.http.post<import('../../models/enrollment.model').GradeActionResponse>(
      `${environment.apiUrl}/v1/sections/${sectionId}/grades/seal`,
      {}
    );
  }

  batchVerifySectionGrades(sectionIds: number[]): Observable<import('../../models/enrollment.model').GradeActionResponse[]> {
    return this.http.post<import('../../models/enrollment.model').GradeActionResponse[]>(
      `${environment.apiUrl}/v1/sections/batch/verify`,
      sectionIds
    );
  }

  batchSealSectionGrades(sectionIds: number[]): Observable<import('../../models/enrollment.model').GradeActionResponse[]> {
    return this.http.post<import('../../models/enrollment.model').GradeActionResponse[]>(
      `${environment.apiUrl}/v1/sections/batch/seal`,
      sectionIds
    );
  }

  // Dynamic Class Record & Assessment Weight Engine Endpoints
  getGradingConfig(sectionId: number): Observable<import('../../models/enrollment.model').SectionGradingConfigResponse> {
    return this.http.get<import('../../models/enrollment.model').SectionGradingConfigResponse>(
      `${environment.apiUrl}/v1/class-records/sections/${sectionId}/config`
    );
  }

  updateGradingConfig(
    sectionId: number,
    request: import('../../models/enrollment.model').UpdateSectionGradingConfigRequest
  ): Observable<import('../../models/enrollment.model').SectionGradingConfigResponse> {
    return this.http.put<import('../../models/enrollment.model').SectionGradingConfigResponse>(
      `${environment.apiUrl}/v1/class-records/sections/${sectionId}/config`,
      request
    );
  }

  addAssessmentItem(
    sectionId: number,
    request: import('../../models/enrollment.model').CreateClassRecordItemRequest
  ): Observable<import('../../models/enrollment.model').ClassRecordItemDto> {
    if (!sectionId || Number(sectionId) <= 0) {
      throw new Error('Valid numeric sectionId is required to add assessment item');
    }
    return this.http.post<import('../../models/enrollment.model').ClassRecordItemDto>(
      `${environment.apiUrl}/v1/class-records/sections/${sectionId}/items`,
      request
    );
  }

  deleteAssessmentItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/v1/class-records/items/${itemId}`);
  }

  getScoreMatrix(sectionId: number): Observable<import('../../models/enrollment.model').ClassRecordMatrixResponse> {
    if (!sectionId || Number(sectionId) <= 0) {
      throw new Error('Valid numeric sectionId is required to get score matrix');
    }
    return this.http.get<import('../../models/enrollment.model').ClassRecordMatrixResponse>(
      `${environment.apiUrl}/v1/class-records/sections/${sectionId}/matrix`
    );
  }

  batchSaveScores(
    sectionId: number,
    request: import('../../models/enrollment.model').BatchSaveScoresRequest
  ): Observable<import('../../models/enrollment.model').ClassRecordMatrixResponse> {
    return this.http.post<import('../../models/enrollment.model').ClassRecordMatrixResponse>(
      `${environment.apiUrl}/v1/class-records/sections/${sectionId}/scores/batch`,
      request
    );
  }

  recalculateAndSyncSectionGrades(sectionId: number): Observable<import('../../models/enrollment.model').ClassRecordMatrixResponse> {
    return this.http.post<import('../../models/enrollment.model').ClassRecordMatrixResponse>(
      `${environment.apiUrl}/v1/class-records/sections/${sectionId}/recalculate`,
      {}
    );
  }

  submitGradeChangeRequest(request: {
    studentId: number;
    courseId: number;
    termId: number;
    previousGrade: number;
    newGrade: number;
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/grades/change-requests`, request);
  }

  getPendingGradeChangeRequests(termId?: number): Observable<any[]> {
    const url = `${environment.apiUrl}/v1/grades/change-requests/pending${termId ? `?termId=${termId}` : ''}`;
    return this.http.get<any[]>(url);
  }

  approveGradeChangeRequest(id: number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/grades/change-requests/${id}/approve`, {});
  }

  rejectGradeChangeRequest(id: number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/grades/change-requests/${id}/reject`, {});
  }
}



