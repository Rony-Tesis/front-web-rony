import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Observable,
  concat,
  catchError,
  defer,
  exhaustMap,
  filter,
  map,
  of,
  takeWhile,
  timeout,
  timer,
  switchMap,
} from 'rxjs';
import { apiEndpoint, RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { apiErrorMessage } from '../../core/http/api-error';
import { SimulationAction, RobotAction } from '../domain/monitor.models';
import { MonitorRepository, MonitorUpdate } from '../application/monitor-repository';
import { mapMonitorSnapshot } from './monitor-snapshot.mapper';

@Injectable({ providedIn: 'root' })
export class HttpMonitorRepository implements MonitorRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RUNTIME_CONFIG);
  private readonly endpoint = apiEndpoint(this.config.apiBasePath, 'v1/monitor/snapshot');

  watch(): Observable<MonitorUpdate> {
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
        takeWhile(
          (update) => !update.terminal && update.snapshot?.telemetryTransport !== 'sse',
          true,
        ),
        switchMap(({ snapshot, error }) =>
          snapshot?.telemetryTransport === 'sse'
            ? concat(of({ snapshot, error }), this.events())
            : of({ snapshot, error }),
        ),
      );
    });
  }

  private events(): Observable<MonitorUpdate> {
    return new Observable<MonitorUpdate>((subscriber) => {
      const source = new EventSource(apiEndpoint(this.config.apiBasePath, 'v1/monitor/events'), {
        withCredentials: true,
      });
      source.onmessage = (event) => {
        try {
          subscriber.next({ snapshot: mapMonitorSnapshot(JSON.parse(event.data)), error: null });
        } catch {
          subscriber.error(new Error('Invalid telemetry'));
        }
      };
      source.onerror = () => {
        subscriber.next({
          snapshot: null,
          error: 'Telemetría sin conexión; reconectando con el backend.',
        });
        if (source.readyState === EventSource.CLOSED)
          subscriber.error(new Error('Telemetry closed'));
      };
      return () => source.close();
    }).pipe(
      timeout({ each: 4000 }),
      catchError(() =>
        concat(
          of({ snapshot: null, error: 'Telemetría no disponible; reconectando con el backend.' }),
          timer(2000).pipe(switchMap(() => this.watch())),
        ),
      ),
    );
  }

  commandRobot(action: RobotAction) {
    return this.command('v1/robot/commands', action);
  }

  commandSimulation(action: SimulationAction) {
    return this.command('v1/simulation/commands', action);
  }

  private command(path: string, action: SimulationAction | RobotAction) {
    return this.http
      .post<unknown>(
        apiEndpoint(this.config.apiBasePath, path),
        { action },
        { withCredentials: true, headers: { 'X-Rony-Control': '1' } },
      )
      .pipe(
        switchMap(() => this.http.get<unknown>(this.endpoint, { withCredentials: true })),
        timeout(this.config.requestTimeoutMs),
        map(mapMonitorSnapshot),
      );
  }

  setSimulationPaused(_paused: boolean): void {}
}
