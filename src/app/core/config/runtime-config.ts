import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface RuntimeConfig {
  readonly dataSource: 'simulation' | 'api';
  /** Same-origin path: cookie credentials must never be sent to an arbitrary host. */
  readonly apiBasePath: string;
  readonly pollingIntervalMs: number;
  readonly requestTimeoutMs: number;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG', {
  providedIn: 'root',
  factory: () => environment,
});

export function apiEndpoint(basePath: string, resource: string): string {
  if (
    !/^\/[a-zA-Z0-9/_-]+$/.test(basePath) ||
    basePath.startsWith('//') ||
    basePath.includes('//')
  ) {
    throw new Error('API base path must be a same-origin absolute path.');
  }
  return `${basePath.replace(/\/$/, '')}/${resource}`;
}
