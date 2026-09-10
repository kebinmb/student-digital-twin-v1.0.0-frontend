import { TestBed } from '@angular/core/testing';
import { DeduplicatingMessageService } from './toast.service';
import { MessageService, ToastMessageOptions } from 'primeng/api';

describe('DeduplicatingMessageService', () => {
  let service: DeduplicatingMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MessageService, useClass: DeduplicatingMessageService }
      ]
    });
    service = TestBed.inject(MessageService) as DeduplicatingMessageService;
  });

  it('should be created and extend MessageService', () => {
    expect(service).toBeTruthy();
    expect(service instanceof MessageService).toBe(true);
  });

  it('should emit a single message normally', async () => {
    const received: ToastMessageOptions[] = [];
    service.messageObserver.subscribe((msg) => {
      received.push(msg as ToastMessageOptions);
    });

    service.add({ severity: 'info', summary: 'Info Title', detail: 'Single message' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.length).toBe(1);
    expect(received[0].summary).toBe('Info Title');
  });

  it('should suppress exact duplicate messages within time window', async () => {
    const received: ToastMessageOptions[] = [];
    service.messageObserver.subscribe((msg) => {
      received.push(msg as ToastMessageOptions);
    });

    service.add({ severity: 'info', summary: 'Hello', detail: 'World' });
    service.add({ severity: 'info', summary: 'Hello', detail: 'World' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.length).toBe(1);
  });

  it('should suppress error messages with identical detail within window', async () => {
    const received: ToastMessageOptions[] = [];
    service.messageObserver.subscribe((msg) => {
      received.push(msg as ToastMessageOptions);
    });

    // Message 1 from interceptor
    service.add({ severity: 'warn', summary: 'Bad Request', detail: 'Username is taken' });
    // Message 2 from component error callback (different summary, same detail)
    service.add({ severity: 'error', summary: 'Update Failed', detail: 'Username is taken' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.length).toBe(1);
    expect(received[0].summary).toBe('Bad Request');
  });

  it('should suppress rapid consecutive error toasts in the burst window', async () => {
    const received: ToastMessageOptions[] = [];
    service.messageObserver.subscribe((msg) => {
      received.push(msg as ToastMessageOptions);
    });

    // Error 1: specific problem detail
    service.add({ severity: 'warn', summary: 'Validation Error', detail: 'username: must not be blank' });
    // Error 2: rapid cascading generic failure from subscriber
    service.add({ severity: 'error', summary: 'Creation Failed', detail: 'Failed to provision user.' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.length).toBe(1);
    expect(received[0].summary).toBe('Validation Error');
  });

  it('should allow success toasts even immediately following an error', async () => {
    const received: ToastMessageOptions[] = [];
    service.messageObserver.subscribe((msg) => {
      received.push(msg as ToastMessageOptions);
    });

    service.add({ severity: 'error', summary: 'Error', detail: 'Failed first' });
    service.add({ severity: 'success', summary: 'Success', detail: 'Action completed' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.length).toBe(2);
    expect(received[0].severity).toBe('error');
    expect(received[1].severity).toBe('success');
  });

  it('should handle addAll and deduplicate elements', async () => {
    const received: ToastMessageOptions[] = [];
    service.messageObserver.subscribe((msg) => {
      received.push(msg as ToastMessageOptions);
    });

    service.addAll([
      { severity: 'info', summary: 'Batch 1', detail: 'First' },
      { severity: 'info', summary: 'Batch 1', detail: 'First' }, // duplicate
      { severity: 'info', summary: 'Batch 2', detail: 'Second' }
    ]);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.length).toBe(2);
  });
});
