import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { apiEndpoint, RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { CameraStream } from '../application/camera-stream';
import { MjpegDecoder } from './mjpeg-decoder';

@Injectable({ providedIn: 'root' })
export class HttpCameraStream implements CameraStream {
  private readonly config = inject(RUNTIME_CONFIG);
  private readonly frames = new Observable<Blob | null>((subscriber) => {
    let stopped = false;
    let connection: AbortController | undefined;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let wakeRetry = () => {};
    const clearIdle = () => {
      if (idle !== undefined) clearTimeout(idle);
    };
    const guard = (milliseconds: number) => {
      clearIdle();
      idle = setTimeout(() => connection?.abort(), milliseconds);
    };
    const run = async () => {
      let backoff = 1000;
      while (!stopped) {
        connection = new AbortController();
        let delay = 250;
        try {
          guard(15000);
          const grantResponse = await fetch(
            apiEndpoint(this.config.apiBasePath, 'v1/monitor/camera-access'),
            {
              credentials: 'same-origin',
              redirect: 'error',
              cache: 'no-store',
              signal: connection.signal,
            },
          );
          if (!grantResponse.ok) throw new Error('Camera session unavailable');
          const grant: unknown = await grantResponse.json();
          if (
            !grant ||
            typeof grant !== 'object' ||
            !('url' in grant) ||
            !('token' in grant) ||
            typeof grant.url !== 'string' ||
            typeof grant.token !== 'string' ||
            !/^[A-Za-z0-9_-]{43}$/.test(grant.token)
          )
            throw new Error('Invalid camera session');
          const url = new URL(grant.url);
          if (
            url.protocol !== 'https:' ||
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            url.pathname !== '/api/v1/monitor/camera-stream'
          )
            throw new Error('Invalid camera origin');
          const response = await fetch(url.href, {
            headers: { Authorization: 'Camera ' + grant.token },
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
            signal: connection.signal,
          });
          if (
            !response.ok ||
            !response.body ||
            !response.headers.get('Content-Type')?.startsWith('multipart/x-mixed-replace')
          ) {
            throw new Error('Camera stream unavailable');
          }
          const reader = response.body.getReader();
          const decoder = new MjpegDecoder();
          guard(10000);
          while (!stopped) {
            const next = await reader.read();
            if (next.done) break;
            const frame = decoder.push(next.value);
            if (frame) {
              guard(10000);
              backoff = 1000;
              subscriber.next(new Blob([new Uint8Array(frame)], { type: 'image/jpeg' }));
            }
          }
        } catch {
          delay = backoff;
          backoff = Math.min(15000, backoff * 2);
        } finally {
          clearIdle();
          connection.abort();
        }
        if (!stopped) {
          subscriber.next(null);
          await new Promise<void>((resolve) => {
            wakeRetry = resolve;
            retry = setTimeout(resolve, delay);
          });
        }
      }
    };
    void run();
    return () => {
      stopped = true;
      connection?.abort();
      clearIdle();
      if (retry !== undefined) clearTimeout(retry);
      wakeRetry();
    };
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  watch(): Observable<Blob | null> {
    return this.frames;
  }
}
