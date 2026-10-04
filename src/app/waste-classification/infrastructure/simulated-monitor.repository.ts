import { Injectable } from '@angular/core';
import { defer, map, timer } from 'rxjs';
import { MonitorRepository } from '../application/monitor-repository';
import { SimulationEngine } from '../domain/simulation-engine';

@Injectable({ providedIn: 'root' })
export class SimulatedMonitorRepository implements MonitorRepository {
  private paused = false;

  watch() {
    return defer(() => {
      const engine = new SimulationEngine(Date.now());
      let lastTick = performance.now();
      let snapshot = engine.snapshot(Date.now());
      return timer(0, 100).pipe(
        map(() => {
          const now = performance.now();
          const delta = now - lastTick;
          lastTick = now;
          if (!this.paused) snapshot = engine.advance(delta, Date.now());
          return { snapshot, error: null };
        }),
      );
    });
  }

  setSimulationPaused(paused: boolean): void {
    this.paused = paused;
  }
}
