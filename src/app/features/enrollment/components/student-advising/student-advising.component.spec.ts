import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { StudentAdvisingComponent } from './student-advising.component';
import { EnrollmentStore } from '../../state/enrollment.store';
import { CourseEligibilityItemDto } from '../../../../core/models/enrollment.model';
import { CurriculumApiService } from '../../../../core/service/curriculum/curriculum-api.service';
import { EnrollmentApiService } from '../../../../core/service/enrollment/enrollment-api.service';

describe('StudentAdvisingComponent', () => {
  let component: StudentAdvisingComponent;
  let fixture: ComponentFixture<StudentAdvisingComponent>;
  let store: EnrollmentStore;

  const mockCourse: CourseEligibilityItemDto = {
    courseId: 101,
    code: 'IT 211',
    title: 'Data Structures & Algorithms',
    lectureUnits: 2,
    labUnits: 3,
    creditUnits: 3,
    yearLevel: 2,
    semester: 'FIRST_SEM',
    eligibilityStatus: 'ELIGIBLE',
    prerequisites: [],
    availableSections: [
      {
        sectionId: 501,
        sectionCode: 'BSIT-2A-S1',
        maxCapacity: 40,
        enrolledCount: 25,
        status: 'OPEN',
        scheduleSummary: 'Mon 08:00 - 10:00 (Room 101)'
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentAdvisingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        EnrollmentStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentAdvisingComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(EnrollmentStore);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map status severity correctly', () => {
    expect(component.getStatusSeverity('ELIGIBLE')).toBe('success');
    expect(component.getStatusSeverity('CURRENTLY_ENROLLED')).toBe('info');
    expect(component.getStatusSeverity('LOCKED_PREREQUISITE')).toBe('danger');
    expect(component.getStatusSeverity('ALREADY_PASSED')).toBe('secondary');
    expect(component.getStatusSeverity('UNKNOWN')).toBe('info');
  });

  it('should open and close section chooser modal', () => {
    expect(component.isSectionModalVisible()).toBe(false);
    expect(component.selectedCourse()).toBeNull();

    component.openSectionChooser(mockCourse);
    expect(component.isSectionModalVisible()).toBe(true);
    expect(component.selectedCourse()?.courseId).toBe(101);

    component.closeSectionChooser();
    expect(component.isSectionModalVisible()).toBe(false);
    expect(component.selectedCourse()).toBeNull();
  });

  it('should toggle admissions intake dialog and initialize default fields', () => {
    expect(component.isAdmissionsDialogVisible()).toBe(false);
    component.openAdmissionsDialog();
    expect(component.isAdmissionsDialogVisible()).toBe(true);
    expect(component.admitStudentNumber()).toBeTruthy();
    expect(component.admitClassification()).toBe('INCOMING_FIRST_YEAR');
    expect(component.admitYearLevel()).toBe(1);

    component.closeAdmissionsDialog();
    expect(component.isAdmissionsDialogVisible()).toBe(false);
  });

  it('should toggle transferee crediting dialog and initialize defaults', () => {
    store.studentId.set(10);
    expect(component.isCreditingDialogVisible()).toBe(false);
    component.openCreditingDialog();
    expect(component.isCreditingDialogVisible()).toBe(true);
    expect(component.creditingExternalSchool()).toBe('Polytechnic State College');
    expect(component.creditingGrade()).toBe(1.50);
    expect(component.creditingUnits()).toBe(3.00);

    component.closeCreditingDialog();
    expect(component.isCreditingDialogVisible()).toBe(false);
  });

  it('should parse schedule slots with semicolon, comma, and TBA values', () => {
    // TBA / No schedule
    expect(component.formatScheduleSlots('No schedule')).toEqual([{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }]);
    expect(component.formatScheduleSlots('Schedule TBA')).toEqual([{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }]);

    // Semicolon separated
    const semiSlots = component.formatScheduleSlots('MON 08:00 - 10:00 (Room 101); WED 08:00 - 10:00 (Room 101)');
    expect(semiSlots).toHaveLength(2);
    expect(semiSlots[0].day).toBe('MON');
    expect(semiSlots[1].day).toBe('WED');

    // Comma separated
    const commaSlots = component.formatScheduleSlots('MON 08:00:00-10:00:00 (CL1), WED 08:00:00-10:00:00 (CL1)');
    expect(commaSlots).toHaveLength(2);
    expect(commaSlots[0].day).toBe('MON');
    expect(commaSlots[1].day).toBe('WED');
  });

  it('should fetch curriculum exactly once when onAdmitProgramChange is called multiple times with the same programId', () => {
    const curriculumApi = TestBed.inject(CurriculumApiService);
    const spy = vi.spyOn(curriculumApi, 'getCurriculaByProgram').mockReturnValue(
      of([{ id: 101, code: 'BSIT-2024', status: 'ACTIVE' } as any])
    );

    // Rapid duplicate calls with identical programId
    component.onAdmitProgramChange(1);
    component.onAdmitProgramChange(1);
    component.onAdmitProgramChange({ value: 1 });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1);
    expect(component.curriculumOptions()).toEqual([{ label: 'BSIT-2024 (ACTIVE)', value: 101 }]);
    expect(component.admissionsForm.get('curriculumId')?.value).toBe(101);
  });

  it('should fetch new curriculum when a different program is selected', () => {
    const curriculumApi = TestBed.inject(CurriculumApiService);
    const spy = vi.spyOn(curriculumApi, 'getCurriculaByProgram').mockImplementation((progId: number) => {
      return of([{ id: progId * 10, code: `CURR-${progId}`, status: 'ACTIVE' } as any]);
    });

    component.onAdmitProgramChange(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(component.admissionsForm.get('curriculumId')?.value).toBe(10);

    // Switch to another program
    component.onAdmitProgramChange(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(2);
    expect(component.admissionsForm.get('curriculumId')?.value).toBe(20);
  });

  it('should not duplicate request during admission app import if target program matches current selection', () => {
    const curriculumApi = TestBed.inject(CurriculumApiService);
    const spy = vi.spyOn(curriculumApi, 'getCurriculaByProgram').mockReturnValue(
      of([{ id: 55, code: 'BSCS-2024', status: 'ACTIVE' } as any])
    );

    component.pendingApplications.set([
      {
        id: 7,
        applicationNumber: 'APP-2026-001',
        fullName: 'Juan Dela Cruz',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@example.com',
        targetProgramId: 5,
        targetProgramCode: 'BSCS'
      } as any
    ]);

    // Initial selection sets program 5
    component.onAdmitProgramChange(5);
    expect(spy).toHaveBeenCalledTimes(1);

    // Importing app that targets the same program 5
    component.onImportAdmissionAppChange(7);
    expect(spy).toHaveBeenCalledTimes(1); // deduplicated!

    expect(component.admissionsForm.get('firstName')?.value).toBe('Juan');
    expect(component.admissionsForm.get('lastName')?.value).toBe('Dela Cruz');
    expect(component.admissionsForm.get('programId')?.value).toBe(5);
  });

  it('should not query getEnrollment when studentId is negative', () => {
    const enrollmentApi = TestBed.inject(EnrollmentApiService);
    const getEnrollmentSpy = vi.spyOn(enrollmentApi, 'getEnrollment');
    const advisingSpy = vi.spyOn(enrollmentApi, 'getAdvisingEligibility').mockReturnValue(of({
      studentId: -1,
      studentNumber: 'APP-2026-001',
      studentName: 'Juan Dela Cruz',
      courses: []
    } as any));

    store.loadStudentAdvising(-1, 10);

    expect(advisingSpy).toHaveBeenCalledWith(-1, 10);
    expect(getEnrollmentSpy).not.toHaveBeenCalled();
    expect(store.enrollment()).toBeNull();
  });

  it('should automatically sync provisioned student ID and update searchedStudents when applicant is resolved', () => {
    const enrollmentApi = TestBed.inject(EnrollmentApiService);
    vi.spyOn(enrollmentApi, 'getAdvisingEligibility').mockReturnValue(of({
      studentId: 45,
      studentNumber: '2026-0045',
      studentName: 'Juan Dela Cruz',
      enrollmentStatus: 'REGULAR',
      courses: []
    } as any));

    store.searchedStudents.set([{
      id: -1,
      studentIdNumber: 'APP-2026-001',
      fullName: 'Juan Dela Cruz',
      programCode: 'BSIT',
      yearLevel: 1,
      academicStatus: 'INCOMING_FIRST_YEAR'
    }]);

    store.loadStudentAdvising(-1, 10);

    expect(store.studentId()).toBe(45);
    expect(store.searchedStudents()[0].id).toBe(45);
    expect(store.searchedStudents()[0].studentIdNumber).toBe('2026-0045');
    expect(store.searchedStudents()[0].academicStatus).toBe('REGULAR');
  });

  it('should return unenrolled placeholder from EnrollmentApiService without HTTP request for negative studentId', () => {
    const enrollmentApi = TestBed.inject(EnrollmentApiService);
    let result: any;
    enrollmentApi.getEnrollment(-1, 10).subscribe(res => result = res);

    expect(result).toBeDefined();
    expect(result.status).toBe('NOT_ENROLLED');
    expect(result.termName).toBe('UNENROLLED');
    expect(result.studentId).toBe(-1);
    expect(result.items).toHaveLength(0);
  });

  it('should prevent opening transferee crediting dialog when studentId is non-positive', () => {
    store.studentId.set(-1);
    const messageService = TestBed.inject(MessageService);
    const msgSpy = vi.spyOn(messageService, 'add');

    component.openCreditingDialog();

    expect(component.isCreditingDialogVisible()).toBe(false);
    expect(msgSpy).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'warn',
      summary: 'No Student Selected'
    }));
  });

  describe('Student & Term Selection Guards and Deduplication', () => {
    it('should ignore falsy, zero, or NaN student IDs in onStudentSelect', () => {
      const setStudentIdSpy = vi.spyOn(store, 'setStudentId');

      component.onStudentSelect(null);
      component.onStudentSelect(undefined);
      component.onStudentSelect(0);
      component.onStudentSelect('invalid' as any);

      expect(setStudentIdSpy).not.toHaveBeenCalled();
    });

    it('should intercept negative applicant IDs in onStudentSelect without calling setStudentId', () => {
      const setStudentIdSpy = vi.spyOn(store, 'setStudentId');
      const openAdmissionsSpy = vi.spyOn(component, 'openAdmissionsDialog');
      const importSpy = vi.spyOn(component, 'onImportAdmissionAppChange');

      component.onStudentSelect(-5);

      expect(setStudentIdSpy).not.toHaveBeenCalled();
      expect(openAdmissionsSpy).toHaveBeenCalled();
      expect(importSpy).toHaveBeenCalledWith(5);
    });

    it('should deduplicate onStudentSelect if the selected ID matches current store studentId', () => {
      store.studentId.set(100);
      const setStudentIdSpy = vi.spyOn(store, 'setStudentId');

      component.onStudentSelect(100);
      component.onStudentSelect({ value: 100 });

      expect(setStudentIdSpy).not.toHaveBeenCalled();
    });

    it('should delegate to store.setStudentId when a valid new positive student ID is selected', () => {
      store.studentId.set(100);
      const setStudentIdSpy = vi.spyOn(store, 'setStudentId');

      component.onStudentSelect(200);

      expect(setStudentIdSpy).toHaveBeenCalledWith(200);
    });

    it('should ignore non-positive or duplicate term IDs in onTermSelect', () => {
      store.selectedTermId.set(10);
      const setTermSpy = vi.spyOn(store, 'setSelectedTermId');

      component.onTermSelect(null);
      component.onTermSelect(0);
      component.onTermSelect(-1);
      component.onTermSelect(10); // duplicate

      expect(setTermSpy).not.toHaveBeenCalled();

      component.onTermSelect(20);
      expect(setTermSpy).toHaveBeenCalledWith(20);
    });

    it('should guard EnrollmentStore.setStudentId against invalid and duplicate IDs', () => {
      const advisingSpy = vi.spyOn(store, 'loadStudentAdvising');
      const enrollmentsSpy = vi.spyOn(store, 'loadTermEnrollments');
      store.selectedTermId.set(10);

      // Negative or zero ID: aborts and clears state without network queries
      store.setStudentId(-1);
      expect(store.studentId()).toBeNull();
      expect(advisingSpy).not.toHaveBeenCalled();

      store.setStudentId(0);
      expect(store.studentId()).toBeNull();
      expect(advisingSpy).not.toHaveBeenCalled();

      // Valid positive ID: queries advising and enrollments
      store.setStudentId(50);
      expect(store.studentId()).toBe(50);
      expect(advisingSpy).toHaveBeenCalledWith(50, 10);
      expect(enrollmentsSpy).toHaveBeenCalledWith(10);

      // Duplicate positive ID: deduplicated
      advisingSpy.mockClear();
      enrollmentsSpy.mockClear();
      store.setStudentId(50);
      expect(advisingSpy).not.toHaveBeenCalled();
      expect(enrollmentsSpy).not.toHaveBeenCalled();
    });

    it('should guard EnrollmentStore.setSelectedTermId against invalid and duplicate IDs', () => {
      const enrollmentsSpy = vi.spyOn(store, 'loadTermEnrollments');

      store.setSelectedTermId(0);
      expect(store.selectedTermId()).toBeNull();
      expect(enrollmentsSpy).not.toHaveBeenCalled();

      store.setSelectedTermId(-1);
      expect(store.selectedTermId()).toBeNull();
      expect(enrollmentsSpy).not.toHaveBeenCalled();

      store.setSelectedTermId(15);
      expect(store.selectedTermId()).toBe(15);
      expect(enrollmentsSpy).toHaveBeenCalledWith(15);

      enrollmentsSpy.mockClear();
      store.setSelectedTermId(15); // duplicate
      expect(enrollmentsSpy).not.toHaveBeenCalled();
    });

    it('should auto-select only positive student IDs in searchStudents and skip negative applicant IDs', () => {
      const enrollmentApi = TestBed.inject(EnrollmentApiService);
      vi.spyOn(enrollmentApi, 'searchStudents').mockReturnValue(of([
        { id: -1, studentIdNumber: 'APP-001', fullName: 'Applicant One', programCode: 'BSIT', yearLevel: 1, academicStatus: 'INCOMING_FIRST_YEAR' },
        { id: 25, studentIdNumber: '2026-0025', fullName: 'Enrolled Student', programCode: 'BSIT', yearLevel: 1, academicStatus: 'REGULAR' }
      ]));

      const setStudentIdSpy = vi.spyOn(store, 'setStudentId');
      store.studentId.set(null);

      store.searchStudents('');

      expect(store.searchedStudents()).toHaveLength(2);
      expect(setStudentIdSpy).toHaveBeenCalledWith(25);
      expect(setStudentIdSpy).not.toHaveBeenCalledWith(-1);
    });
  });
});
