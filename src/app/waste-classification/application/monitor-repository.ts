import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MonitorSnapshot } from '../domain/monitor.models';

export interface MonitorUpdate {
  readonly snapshot: MonitorSnapshot | null;
  readonly error: string | null;
}

export interface MonitorRepository {
  watch(): Observable<MonitorUpdate>;
  setSimulationPaused(paused: boolean): void;
}

export const MONITOR_REPOSITORY = new InjectionToken<MonitorRepository>('MONITOR_REPOSITORY');
