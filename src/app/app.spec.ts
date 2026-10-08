import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { App } from './app';
import { WebSocketService } from './core/services/websocket.service';
import { AuthService } from './core/service/authentication/auth-service';
import { signal } from '@angular/core';

describe('App', () => {
  const mockWsService = {
    connect: vi.fn(),
    disconnect: vi.fn()
  };

  const mockAuthService = {
    isAuthenticated: signal(true),
    accessToken: signal('mock-token')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        MessageService,
        provideRouter([]),
        { provide: WebSocketService, useValue: mockWsService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have correct title', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect((app as any).title()).toBe('student-digital-twin-v1.0.0-frontend');
  });

  it('should call wsService.connect on init and disconnect on destroy', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(mockWsService.connect).toHaveBeenCalled();

    fixture.destroy();
    expect(mockWsService.disconnect).toHaveBeenCalled();
  });
});
