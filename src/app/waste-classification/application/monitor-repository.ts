import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MonitorSnapshot, SimulationAction, RobotAction } from '../domain/monitor.models';

export interface MonitorUpdate {
  readonly snapshot: MonitorSnapshot | null;
  readonly error: string | null;
}

export interface MonitorRepository {
  watch(): Observable<MonitorUpdate>;
  setSimulationPaused(paused: boolean): void;
  commandRobot?(action: RobotAction): Observable<MonitorSnapshot>;
  commandSimulation?(action: SimulationAction): Observable<MonitorSnapshot>;
}

export const MONITOR_REPOSITORY = new InjectionToken<MonitorRepository>('MONITOR_REPOSITORY');
