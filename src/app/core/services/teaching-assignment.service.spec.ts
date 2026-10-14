// File: src/app/core/services/teaching-assignment.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TeachingAssignmentService } from './teaching-assignment.service';
import { AuthService } from '../service/authentication/auth-service';
import { SchedulingApiService } from '../service/scheduling/scheduling-api.service';
import { AcademicPeriodStore } from './academic-period.store';
import { UserContext } from '../models/auth.model';

describe('TeachingAssignmentService', () => {
  let service: TeachingAssignmentService;

  const currentUserSignal = signal<UserContext>({
    id: 1,
    username: 'test.user',
    email: 'test@chmsu.edu.ph',
    role: 'STUDENT',
    roles: ['STUDENT']
  });

  const selectedTermIdSignal = signal<number | null>(10);
  const activeTermSignal = signal<any>({ id: 10, termType: 'FIRST_SEM', isActive: true });

  let mockAuthService: any;
  let mockSchedulingApi: any;
  let mockPeriodStore: any;

  beforeEach(() => {
    currentUserSignal.set({
      id: 1,
      username: 'test.user',
      email: 'test@chmsu.edu.ph',
      role: 'STUDENT',
      roles: ['STUDENT']
    });
    selectedTermIdSignal.set(10);
    activeTermSignal.set({ id: 10, termType: 'FIRST_SEM', isActive: true });

    mockAuthService = {
      currentUser: currentUserSignal
    };

    mockSchedulingApi = {
      getFacultyWorkload: vi.fn().mockReturnValue(of({
        facultyUserId: 1,
        termId: 10,
        assignedSections: [
          { sectionId: 101, sectionCode: 'BSIT 3-A', courseCode: 'IT311' }
        ]
      })),
      getSectionsByTerm: vi.fn().mockReturnValue(of([
        {
          id: 101,
          sectionCode: 'BSIT 3-A',
          schedules: [{ id: 501, instructorUserId: 1, dayOfWeek: 'MONDAY' }]
        }
      ])),
      getSchedulingTerms: vi.fn().mockReturnValue(of([
        { id: 10, isActive: true, termName: 'AY 2026-2027 1st Sem' }
      ]))
    };

    mockPeriodStore = {
      selectedTermId: selectedTermIdSignal,
      activeTerm: activeTermSignal
    };

    TestBed.configureTestingModule({
      providers: [
        TeachingAssignmentService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: SchedulingApiService, useValue: mockSchedulingApi },
        { provide: AcademicPeriodStore, useValue: mockPeriodStore }
      ]
    });

    service = TestBed.inject(TeachingAssignmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should evaluate FACULTY as always having teaching assignment privileges', () => {
    currentUserSignal.set({
      id: 15,
      username: 'faculty.john',
      email: 'john@chmsu.edu.ph',
      role: 'FACULTY',
      roles: ['FACULTY']
    });
    service.evaluateTeachingAssignments(currentUserSignal(), 10);
    expect(service.hasTeachingAssignments()).toBe(true);
  });

  it('should evaluate DEAN with assigned teaching schedules as true', () => {
    currentUserSignal.set({
      id: 25,
      username: 'dean.moraca',
      email: 'dean@chmsu.edu.ph',
      role: 'DEAN',
      roles: ['DEAN']
    });

    mockSchedulingApi.getFacultyWorkload.mockReturnValue(of({
      facultyUserId: 25,
      termId: 10,
      assignedSections: [
        { sectionId: 202, sectionCode: 'BSIT 4-A', courseCode: 'IT411' }
      ]
    }));

    service.evaluateTeachingAssignments(currentUserSignal(), 10);
    expect(service.hasTeachingAssignments()).toBe(true);
  });

  it('should evaluate DEAN without assigned teaching schedules as false', () => {
    currentUserSignal.set({
      id: 25,
      username: 'dean.moraca',
      email: 'dean@chmsu.edu.ph',
      role: 'DEAN',
      roles: ['DEAN']
    });

    mockSchedulingApi.getFacultyWorkload.mockReturnValue(of({
      facultyUserId: 25,
      termId: 10,
      assignedSections: []
    }));

    service.evaluateTeachingAssignments(currentUserSignal(), 10);
    expect(service.hasTeachingAssignments()).toBe(false);
  });

  it('should evaluate CHAIRPERSON with assigned teaching schedules as true', () => {
    currentUserSignal.set({
      id: 35,
      username: 'chair.moraca',
      email: 'chair@chmsu.edu.ph',
      role: 'CHAIRPERSON',
      roles: ['CHAIRPERSON']
    });

    mockSchedulingApi.getFacultyWorkload.mockReturnValue(of({
      facultyUserId: 35,
      termId: 10,
      assignedSections: [
        { sectionId: 303, sectionCode: 'BSIS 2-B', courseCode: 'IS201' }
      ]
    }));

    service.evaluateTeachingAssignments(currentUserSignal(), 10);
    expect(service.hasTeachingAssignments()).toBe(true);
  });

  it('should evaluate CHAIRPERSON without assigned teaching schedules as false', () => {
    currentUserSignal.set({
      id: 35,
      username: 'chair.moraca',
      email: 'chair@chmsu.edu.ph',
      role: 'CHAIRPERSON',
      roles: ['CHAIRPERSON']
    });

    mockSchedulingApi.getFacultyWorkload.mockReturnValue(of({
      facultyUserId: 35,
      termId: 10,
      assignedSections: []
    }));

    service.evaluateTeachingAssignments(currentUserSignal(), 10);
    expect(service.hasTeachingAssignments()).toBe(false);
  });

  it('should evaluate non-teaching administrative roles as false', () => {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'CASHIER', 'GUIDANCE', 'ACCOUNTANT', 'STUDENT'];
    for (const r of roles) {
      currentUserSignal.set({
        id: 99,
        username: 'admin.user',
        email: 'admin@chmsu.edu.ph',
        role: r,
        roles: [r]
      });
      service.evaluateTeachingAssignments(currentUserSignal(), 10);
      expect(service.hasTeachingAssignments()).toBe(false);
    }
  });

  it('should fallback to inspecting sections by term if faculty workload call errors', () => {
    currentUserSignal.set({
      id: 25,
      username: 'dean.moraca',
      email: 'dean@chmsu.edu.ph',
      role: 'DEAN',
      roles: ['DEAN']
    });

    mockSchedulingApi.getFacultyWorkload.mockReturnValue(throwError(() => new Error('Not found')));
    mockSchedulingApi.getSectionsByTerm.mockReturnValue(of([
      {
        id: 101,
        sectionCode: 'BSIT 3-A',
        schedules: [{ id: 501, instructorUserId: 25, dayOfWeek: 'MONDAY' }]
      }
    ]));

    service.evaluateTeachingAssignments(currentUserSignal(), 10);
    expect(service.hasTeachingAssignments()).toBe(true);
  });
});
