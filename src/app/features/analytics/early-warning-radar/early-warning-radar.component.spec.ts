import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EarlyWarningRadarComponent } from './early-warning-radar.component';
import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { MessageService } from 'primeng/api';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EarlyWarningRadarItemDto } from '../../../core/models/analytics.model';

describe('EarlyWarningRadarComponent', () => {
  let component: EarlyWarningRadarComponent;
  let fixture: ComponentFixture<EarlyWarningRadarComponent>;
  let mockAnalyticsApi: any;
  let mockMessageService: any;

  const mockRadarItems: EarlyWarningRadarItemDto[] = [
    {
      studentId: 101,
      studentNumber: '2026-0001',
      studentName: 'Alice Student',
      programCode: 'BSCS',
      yearLevel: 3,
      riskLevel: 'CRITICAL',
      dropoutProbability: 0.85,
      primaryRiskFactor: 'Academic Deficit (GPA 3.80)',
      suggestedAction: 'Dispatch Academic Counselor'
    },
    {
      studentId: 102,
      studentNumber: '2026-0002',
      studentName: 'Bob Student',
      programCode: 'BSIT',
      yearLevel: 2,
      riskLevel: 'HIGH',
      dropoutProbability: 0.65,
      primaryRiskFactor: 'Attendance Absences',
      suggestedAction: 'Peer Tutoring Session'
    }
  ];

  beforeEach(async () => {
    mockAnalyticsApi = {
      getEarlyWarningRadar: vi.fn().mockReturnValue(of(mockRadarItems)),
      getStudentRiskProfile: vi.fn().mockReturnValue(of(null)),
      getStudentInterventions: vi.fn().mockReturnValue(of([])),
      dispatchIntervention: vi.fn().mockReturnValue(of({ id: 1, status: 'DISPATCHED' }))
    };

    await TestBed.configureTestingModule({
      imports: [EarlyWarningRadarComponent],
      providers: [
        provideAnimationsAsync(),
        MessageService,
        { provide: AnalyticsApiService, useValue: mockAnalyticsApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EarlyWarningRadarComponent);
    component = fixture.componentInstance;
    mockMessageService = TestBed.inject(MessageService);
    vi.spyOn(mockMessageService, 'add');
  });

  it('should create component and load early warning radar items on init', () => {
    fixture.detectChanges();

    expect(mockAnalyticsApi.getEarlyWarningRadar).toHaveBeenCalled();
    expect(component.radarItems().length).toBe(2);
    expect(component.radarItems()[0].studentNumber).toBe('2026-0001');
    expect(component.isLoading()).toBe(false);
  });

  it('should handle radar loading error gracefully with message toast', () => {
    mockAnalyticsApi.getEarlyWarningRadar.mockReturnValue(throwError(() => new Error('Forbidden')));

    component.loadRadar();

    expect(component.radarItems()).toEqual([]);
    expect(component.isLoading()).toBe(false);
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Radar Ingestion Error'
      })
    );
  });

  it('should open student detail and fetch risk profile and interventions', () => {
    fixture.detectChanges();
    const item = mockRadarItems[0];

    component.openDetail(item);

    expect(component.selectedStudent()).toEqual(item);
    expect(component.isDetailDrawerOpen()).toBe(true);
    expect(mockAnalyticsApi.getStudentRiskProfile).toHaveBeenCalledWith(item.studentId);
    expect(mockAnalyticsApi.getStudentInterventions).toHaveBeenCalledWith(item.studentId);
  });

  it('should open dispatch modal with pre-populated notes', () => {
    fixture.detectChanges();
    const item = mockRadarItems[0];

    component.openDispatchModal(item);

    expect(component.targetStudent()).toEqual(item);
    expect(component.isDispatchModalOpen()).toBe(true);
    expect(component.counselorNotes()).toBe(item.suggestedAction);
  });
});
