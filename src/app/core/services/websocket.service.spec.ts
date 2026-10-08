import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketService } from './websocket.service';
import { AuthService } from '../service/authentication/auth-service';

describe('WebSocketService', () => {
  let service: WebSocketService;

  const mockAuthService = {
    accessToken: vi.fn().mockReturnValue('mock-jwt-token')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with disconnected state', () => {
    expect(service.isConnected).toBe(false);
  });

  it('should disconnect cleanly', () => {
    service.disconnect();
    expect(service.isConnected).toBe(false);
  });
});
