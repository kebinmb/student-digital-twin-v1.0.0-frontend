import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CameraTestComponent } from './camera-test.component';

describe('CameraTestComponent', () => {
  let component: CameraTestComponent;
  let fixture: ComponentFixture<CameraTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraTestComponent],
      providers: [
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CameraTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.stopCamera();
  });

  it('should create camera test diagnostic component', () => {
    expect(component).toBeTruthy();
  });

  it('should detect secure context status from window.isSecureContext', () => {
    expect(typeof component.isSecureContext()).toBe('boolean');
  });

  it('should report mediaDevices availability', () => {
    expect(typeof component.hasMediaDevices()).toBe('boolean');
  });

  it('should cleanly stop camera stream and reset states', () => {
    component.stopCamera();
    expect(component.isCameraActive()).toBe(false);
    expect(component.streamTrackLabel()).toBe('');
    expect(component.streamResolution()).toBe('');
  });
});
