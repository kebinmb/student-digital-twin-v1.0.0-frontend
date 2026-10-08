import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, of, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClearanceService } from './clearance.service';
import { ComplianceApiService } from '../service/compliance/compliance-api.service';
import { WebSocketService } from './websocket.service';
import { AcademicPeriodStore } from './academic-period.store';
import { ClearanceRequestDto, ClearanceStatusMessage } from '../models/compliance.model';

describe('ClearanceService', () => {
  let service: ClearanceService;
  let mockComplianceApi: any;
  let mockWsService: any;
  let wsMessageSubject: Subject<any>;

  const mockClearanceDto: ClearanceRequestDto = {
    id: 10,
    studentProfileId: 7,
    studentNumber: '2026-0007',
    studentName: 'Juan Dela Cruz',
    termId: 1,
    termName: 'First Semester',
    purpose: 'GRADUATION',
    overallStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    signoffs: [
      {
        id: 101,
        clearanceRequestId: 10,
        departmentType: 'LIBRARY',
        signoffStatus: 'APPROVED',
        remarks: 'No overdue books',
        signedByUsername: 'librarian'
      },
      {
        id: 102,
        clearanceRequestId: 10,
        departmentType: 'ACCOUNTING',
        signoffStatus: 'PENDING',
        remarks: 'Tuition installment due',
        signedByUsername: null
      }
    ]
  };

  beforeEach(() => {
    wsMessageSubject = new Subject<any>();
    mockComplianceApi = {
      getClearanceByStudentAndTerm: vi.fn().mockReturnValue(of(mockClearanceDto))
    };
    mockWsService = {
      isConnected: true,
      watch: vi.fn().mockReturnValue(wsMessageSubject.asObservable()),
      publish: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ClearanceService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ComplianceApiService, useValue: mockComplianceApi },
        { provide: WebSocketService, useValue: mockWsService },
        {
          provide: AcademicPeriodStore,
          useValue: {
            selectedTermId: () => 1,
            selectedTerm: () => ({ id: 1, name: 'First Semester' })
          }
        }
      ]
    });

    service = TestBed.inject(ClearanceService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should ignore invalid studentId (null, undefined, 0, negative)', () => {
    service.initializeForStudent(0);
    expect(mockWsService.watch).not.toHaveBeenCalled();
    expect(mockComplianceApi.getClearanceByStudentAndTerm).not.toHaveBeenCalled();

    service.initializeForStudent(null as any);
    expect(mockWsService.watch).not.toHaveBeenCalled();
    expect(service.currentClearance()).toBeNull();
  });

  it('should initialize and subscribe to /topic/clearance.{studentId} for valid studentId', async () => {
    service.initializeForStudent(7);

    expect(mockWsService.watch).toHaveBeenCalledWith('/topic/clearance.7');
    expect(mockWsService.watch).toHaveBeenCalledWith('/topic/admin.clearance');
    expect(mockComplianceApi.getClearanceByStudentAndTerm).toHaveBeenCalledWith(7, 1);

    const msg = await firstValueFrom(service.clearance$);
    expect(msg).toBeTruthy();
    expect(msg?.studentId).toBe(7);
    expect(msg?.overallStatus).toBe('PENDING');
    expect(msg?.departments.length).toBe(2);

    const req = await firstValueFrom(service.clearanceRequest$);
    expect(req).toBeTruthy();
    expect(req?.studentProfileId).toBe(7);
  });

  it('should update clearance state when WebSocket push message arrives', async () => {
    service.initializeForStudent(7);

    const pushedMessage: ClearanceStatusMessage = {
      studentId: 7,
      termId: 1,
      overallStatus: 'CLEARED',
      departments: [
        {
          departmentId: 101,
          departmentName: 'LIBRARY',
          status: 'APPROVED',
          remarks: 'Cleared'
        },
        {
          departmentId: 102,
          departmentName: 'ACCOUNTING',
          status: 'APPROVED',
          remarks: 'Zero balance'
        }
      ]
    };

    wsMessageSubject.next(pushedMessage);

    const map = await firstValueFrom(service.deptStatusMap$);
    expect(map['ACCOUNTING']?.status).toBe('APPROVED');
    expect(map['LIBRARY']?.status).toBe('APPROVED');
    expect(service.currentClearance()?.overallStatus).toBe('CLEARED');

    const updatedReq = await firstValueFrom(service.clearanceRequest$);
    expect(updatedReq?.overallStatus).toBe('CLEARED');
    expect(updatedReq?.signoffs.find((s) => s.departmentType === 'ACCOUNTING')?.signoffStatus).toBe('APPROVED');
  });

  it('should filter department status via getDeptStatus$', async () => {
    service.initializeForStudent(7);

    const lib = await firstValueFrom(service.getDeptStatus$('LIBRARY'));
    expect(lib).toBeTruthy();
    expect(lib?.departmentName).toBe('LIBRARY');
    expect(lib?.status).toBe('APPROVED');
  });

  it('should clean up subscriptions when re-initialized or destroyed', () => {
    service.initializeForStudent(7);
    expect(mockWsService.watch).toHaveBeenCalledWith('/topic/clearance.7');
    expect(mockWsService.watch).toHaveBeenCalledWith('/topic/admin.clearance');

    service.initializeForStudent(8);
    expect(mockWsService.watch).toHaveBeenCalledWith('/topic/clearance.8');

    service.ngOnDestroy();
  });
});
