import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { processLabel } from '../domain/monitor.models';
import { MONITOR_REPOSITORY } from './monitor-repository';

@Injectable({ providedIn: 'root' })
export class MonitorFacade {
  private readonly repository = inject(MONITOR_REPOSITORY);
  readonly isSimulation = inject(RUNTIME_CONFIG).dataSource === 'simulation';
  private readonly snapshotState = signal<
    import('../domain/monitor.models').MonitorSnapshot | null
  >(null);
  private readonly errorState = signal<string | null>(null);
  private readonly pausedState = signal(false);
  readonly snapshot = this.snapshotState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly paused = this.pausedState.asReadonly();
  readonly loading = computed(() => !this.snapshot() && !this.error());
  readonly stale = computed(() => !!this.snapshot() && !!this.error());
  readonly online = computed(
    () =>
      !this.error() &&
      !!this.snapshot() &&
      this.snapshot()!.equipment.every((item) => item.status === 'online'),
  );
  readonly stateLabel = computed(() => {
    const snapshot = this.snapshot();
    return snapshot ? processLabel(snapshot.process, this.paused()) : 'En espera';
  });

  constructor() {
    this.repository
      .watch()
      .pipe(takeUntilDestroyed())
      .subscribe((update) => {
        if (update.snapshot) this.snapshotState.set(update.snapshot);
        this.errorState.set(update.error);
      });
  }

  toggleSimulation(): void {
    if (!this.isSimulation) return;
    const paused = !this.paused();
    this.repository.setSimulationPaused(paused);
    this.pausedState.set(paused);
  }
}
