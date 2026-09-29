import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NoticeApiService } from './notice-api.service';
import { environment } from '../../../../environments/environment';

describe('NoticeApiService', () => {
  let service: NoticeApiService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/v1/notices`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NoticeApiService
      ]
    });
    service = TestBed.inject(NoticeApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch active notices from backend API', () => {
    const mockNotices = [
      { id: '101', title: 'Advisory 101', category: 'Registrar', date: 'Today', unread: true }
    ];

    service.getActiveNotices().subscribe(notices => {
      expect(notices).toEqual(mockNotices);
    });

    const req = httpTesting.expectOne(`${baseUrl}/active`);
    expect(req.request.method).toBe('GET');
    req.flush(mockNotices);
  });

  it('should gracefully fallback to seed notices when backend is offline or errors', () => {
    service.getActiveNotices().subscribe(notices => {
      expect(notices.length).toBeGreaterThan(0);
      expect(notices[0].title).toContain('Examination Schedule');
    });

    const req = httpTesting.expectOne(`${baseUrl}/active`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should post a new notice', () => {
    const payload = {
      title: 'New Grade Verification Notice',
      category: 'Registrar',
      content: 'Please submit midterm grades by Friday.'
    };

    service.createNotice(payload).subscribe(created => {
      expect(created.title).toBe(payload.title);
      expect(created.category).toBe(payload.category);
    });

    const req = httpTesting.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ ...payload, id: '202', date: 'Just now', unread: true });
  });

  it('should acknowledge a notice', () => {
    service.acknowledgeNotice('1').subscribe(res => {
      expect(res == null).toBe(true);
    });

    const req = httpTesting.expectOne(`${baseUrl}/1/acknowledge`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
