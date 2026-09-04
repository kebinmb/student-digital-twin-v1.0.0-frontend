import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SectionBuilderComponent } from './section-builder.component';
import { SchedulingStore } from '../../state/scheduling.store';

describe('SectionBuilderComponent', () => {
  let component: SectionBuilderComponent;
  let fixture: ComponentFixture<SectionBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionBuilderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        SchedulingStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize section form with default capacity 40', () => {
    expect(component.sectionForm).toBeDefined();
    expect(component.sectionForm.get('maxCapacity')?.value).toBe(40);
  });

  it('should add and remove schedule slots', () => {
    expect(component.scheduleSlotsArray.length).toBe(1);
    component.addSlot();
    expect(component.scheduleSlotsArray.length).toBe(2);
    component.removeSlot(1);
    expect(component.scheduleSlotsArray.length).toBe(1);
  });

  it('should reject whitespace-only sectionCode', () => {
    const codeControl = component.sectionForm.get('sectionCode');
    codeControl?.setValue('   ');
    expect(codeControl?.errors?.['whitespace']).toBe(true);
    codeControl?.setValue('BSIT-1A');
    expect(codeControl?.errors).toBeNull();
  });

  it('should validate time order in slot', () => {
    const slot = component.scheduleSlotsArray.at(0);
    slot.get('startTime')?.setValue('10:00');
    slot.get('endTime')?.setValue('08:00');
    expect(slot.errors?.['invalidTimeOrder']).toBe(true);

    slot.get('endTime')?.setValue('12:00');
    expect(slot.errors).toBeNull();
  });

  it('should toggle create, slot details, and faculty load modals', () => {
    expect(component.isCreateModalVisible()).toBe(false);
    component.openCreateModal();
    expect(component.isCreateModalVisible()).toBe(true);
    component.closeCreateModal();
    expect(component.isCreateModalVisible()).toBe(false);

    expect(component.isSlotDetailsModalVisible()).toBe(false);
    component.openSlotDetailsModal({
      id: 1,
      termId: 1,
      termName: 'Term 1',
      curriculumId: 1,
      curriculumCode: 'BSIT-2026',
      curriculumName: 'BSIT',
      courseId: 10,
      courseCode: 'CS101',
      courseTitle: 'Intro to CS',
      lectureUnits: 2,
      labUnits: 1,
      creditUnits: 3,
      sectionCode: 'BSIT-1A',
      maxCapacity: 40,
      enrolledCount: 5,
      status: 'OPEN',
      schedules: []
    });
    expect(component.isSlotDetailsModalVisible()).toBe(true);
    component.closeSlotDetailsModal();
    expect(component.isSlotDetailsModalVisible()).toBe(false);

    expect(component.isFacultyLoadModalVisible()).toBe(false);
    component.openFacultyLoadModal(1);
    expect(component.isFacultyLoadModalVisible()).toBe(true);
    component.closeFacultyLoadModal();
    expect(component.isFacultyLoadModalVisible()).toBe(false);
  });

  it('should toggle slot days and apply quick presets', () => {
    component.applyDayPreset(0, 'MW');
    expect(component.isDaySelected(0, 'MONDAY')).toBe(true);
    expect(component.isDaySelected(0, 'WEDNESDAY')).toBe(true);
    expect(component.isDaySelected(0, 'FRIDAY')).toBe(false);
    expect(component.getActivePreset(0)).toBe('MW');

    component.applyDayPreset(0, 'MWF');
    expect(component.isDaySelected(0, 'MONDAY')).toBe(true);
    expect(component.isDaySelected(0, 'WEDNESDAY')).toBe(true);
    expect(component.isDaySelected(0, 'FRIDAY')).toBe(true);
    expect(component.getActivePreset(0)).toBe('MWF');

    // Toggle Friday off -> Custom
    component.toggleSlotDay(0, 'FRIDAY');
    expect(component.isDaySelected(0, 'FRIDAY')).toBe(false);
    expect(component.getActivePreset(0)).toBe('MW');

    // Test isDayChecked and onDayCheckboxChange
    expect(component.isDayChecked(0, 'MONDAY')).toBe(true);
    expect(component.isDayChecked(0, 'FRIDAY')).toBe(false);

    component.onDayCheckboxChange(0, 'FRIDAY', true);
    expect(component.isDayChecked(0, 'FRIDAY')).toBe(true);

    component.onDayCheckboxChange(0, 'FRIDAY', false);
    expect(component.isDayChecked(0, 'FRIDAY')).toBe(false);

    // Uncheck MONDAY so only WEDNESDAY is left
    component.onDayCheckboxChange(0, 'MONDAY', false);
    expect(component.isDayChecked(0, 'MONDAY')).toBe(false);
    expect(component.isDayChecked(0, 'WEDNESDAY')).toBe(true);

    // Attempt to uncheck WEDNESDAY (the last remaining day) - should be blocked
    component.onDayCheckboxChange(0, 'WEDNESDAY', false);
    expect(component.isDayChecked(0, 'WEDNESDAY')).toBe(true);
  });

  it('should detect when slot duration exceeds term maxHoursPerClass', () => {
    const slot = component.scheduleSlotsArray.at(0);
    // 08:00 to 12:00 = 4 hours > default 3.0 hours limit
    slot.get('startTime')?.setValue('08:00');
    slot.get('endTime')?.setValue('12:00');
    component.formSlots.set(component.sectionForm.value.scheduleSlots);

    const error = component.getSlotDurationError(0);
    expect(error).toContain('exceeds term maximum allowed duration');
    expect(component.areSessionDurationsValid()).toBe(false);

    // Set within 3 hours: 08:00 to 10:00 = 2 hours <= 3.0
    slot.get('endTime')?.setValue('10:00');
    component.formSlots.set(component.sectionForm.value.scheduleSlots);
    expect(component.getSlotDurationError(0)).toBeNull();
    expect(component.areSessionDurationsValid()).toBe(true);
  });

  it('should toggle override panel and manage edit max hours dialog', () => {
    expect(component.isOverridePanelOpen()).toBe(false);
    component.toggleOverridePanel();
    expect(component.isOverridePanelOpen()).toBe(true);
    component.toggleOverridePanel();
    expect(component.isOverridePanelOpen()).toBe(false);

    expect(component.isEditMaxHoursModalVisible()).toBe(false);
    component.openEditMaxHoursModal();
    expect(component.isEditMaxHoursModalVisible()).toBe(true);
    expect(component.editMaxHoursValue()).toBe(3.0);
    component.closeEditMaxHoursModal();
    expect(component.isEditMaxHoursModalVisible()).toBe(false);
  });
});
