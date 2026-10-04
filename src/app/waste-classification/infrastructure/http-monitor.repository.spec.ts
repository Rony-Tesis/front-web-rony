import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIG, apiEndpoint } from '../../core/config/runtime-config';
import { MonitorUpdate } from '../application/monitor-repository';
import { SimulationEngine } from '../domain/simulation-engine';
import { HttpMonitorRepository } from './http-monitor.repository';

describe('HTTP monitoring boundary', () => {
  let http: HttpTestingController;
  const endpoint = '/api/v1/monitor/snapshot';
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: RUNTIME_CONFIG,
          useValue: {
            dataSource: 'api',
            apiBasePath: '/api',
            pollingIntervalMs: 2000,
            requestTimeoutMs: 10000,
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('uses same-origin credentials and does not overlap pending requests', () => {
    const updates: MonitorUpdate[] = [];
    const subscription = TestBed.inject(HttpMonitorRepository)
      .watch()
      .subscribe((value) => updates.push(value));
    vi.advanceTimersByTime(0);
    const request = http.expectOne(endpoint);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.method).toBe('GET');
    vi.advanceTimersByTime(6000);
    http.expectNone(endpoint);
    request.flush(new SimulationEngine(Date.now()).snapshot(Date.now()));
    expect(updates[0]?.snapshot?.summary.total).toBe(128);
    subscription.unsubscribe();
  });

  it('stops polling when authentication is required', () => {
    const updates: MonitorUpdate[] = [];
    let completed = false;
    TestBed.inject(HttpMonitorRepository)
      .watch()
      .subscribe({
        next: (value) => updates.push(value),
        complete: () => {
          completed = true;
        },
      });
    vi.advanceTimersByTime(0);
    http
      .expectOne(endpoint)
      .flush({ secret: 'must not appear' }, { status: 401, statusText: 'Unauthorized' });
    expect(updates[0]?.error).toContain('no está autenticada');
    expect(updates[0]?.error).not.toContain('secret');
    expect(completed).toBe(true);
    vi.advanceTimersByTime(30000);
    http.expectNone(endpoint);
  });

  it('backs off after malformed responses and recovers with valid data', () => {
    const updates: MonitorUpdate[] = [];
    const subscription = TestBed.inject(HttpMonitorRepository)
      .watch()
      .subscribe((value) => updates.push(value));
    vi.advanceTimersByTime(0);
    http.expectOne(endpoint).flush({ invalid: true });
    expect(updates[0]?.snapshot).toBeNull();
    vi.advanceTimersByTime(2000);
    http.expectNone(endpoint);
    vi.advanceTimersByTime(2000);
    http.expectOne(endpoint).flush(new SimulationEngine(Date.now()).snapshot(Date.now()));
    expect(updates[1]?.error).toBeNull();
    subscription.unsubscribe();
  });

  it('honors Retry-After and cancels requests when the consumer is destroyed', () => {
    const subscription = TestBed.inject(HttpMonitorRepository).watch().subscribe();
    vi.advanceTimersByTime(0);
    http
      .expectOne(endpoint)
      .flush(
        {},
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '10' } },
      );
    vi.advanceTimersByTime(8000);
    http.expectNone(endpoint);
    vi.advanceTimersByTime(2000);
    const pending = http.expectOne(endpoint);
    subscription.unsubscribe();
    expect(pending.cancelled).toBe(true);
  });

  it('rejects external API paths and protocol-relative credential destinations', () => {
    expect(() => apiEndpoint('https://example.com', 'v1/monitor/snapshot')).toThrow();
    expect(() => apiEndpoint('//example.com', 'v1/monitor/snapshot')).toThrow();
    expect(apiEndpoint('/api/', 'v1/monitor/snapshot')).toBe(endpoint);
  });
});
