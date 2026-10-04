import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, exhaustMap, filter, map, of, takeWhile, timeout, timer } from 'rxjs';
import { apiEndpoint, RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { apiErrorMessage } from '../../core/http/api-error';
import { MonitorRepository } from '../application/monitor-repository';
import { mapMonitorSnapshot } from './monitor-snapshot.mapper';

@Injectable({ providedIn: 'root' })
export class HttpMonitorRepository implements MonitorRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RUNTIME_CONFIG);
  private readonly endpoint = apiEndpoint(this.config.apiBasePath, 'v1/monitor/snapshot');

  watch() {
    return defer(() => {
      let nextAttemptAt = 0;
      let failures = 0;
      return timer(0, this.config.pollingIntervalMs).pipe(
        filter(() => Date.now() >= nextAttemptAt),
        exhaustMap(() =>
          this.http.get<unknown>(this.endpoint, { withCredentials: true }).pipe(
            timeout(this.config.requestTimeoutMs),
            map((response) => {
              const snapshot = mapMonitorSnapshot(response);
              failures = 0;
              return { snapshot, error: null, terminal: false };
            }),
            catchError((error: unknown) => {
              failures++;
              const terminal =
                error instanceof HttpErrorResponse &&
                (error.status === 401 || error.status === 403);
              const retryAfter =
                error instanceof HttpErrorResponse ? error.headers.get('Retry-After') : null;
              const requestedDelay = retryAfter ? Number(retryAfter) * 1000 : 0;
              const backoff = Math.min(
                30000,
                this.config.pollingIntervalMs * 2 ** Math.min(failures, 4),
              );
              nextAttemptAt =
                Date.now() +
                (Number.isFinite(requestedDelay) && requestedDelay > 0
                  ? Math.min(300000, Math.max(backoff, requestedDelay))
                  : backoff);
              return of({ snapshot: null, error: apiErrorMessage(error), terminal });
            }),
          ),
        ),
        takeWhile((update) => !update.terminal, true),
        map(({ snapshot, error }) => ({ snapshot, error })),
      );
    });
  }

  // This application does not send physical robot commands through the simulation control.
  setSimulationPaused(_paused: boolean): void {}
}
