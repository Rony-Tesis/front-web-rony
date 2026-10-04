import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { apiErrorMessage } from '../../core/http/api-error';
import {
  MonitorSnapshot,
  processLabel,
  SimulationAction,
  RobotAction,
} from '../domain/monitor.models';
import { MONITOR_REPOSITORY } from './monitor-repository';

@Injectable({ providedIn: 'root' })
export class MonitorFacade {
  private readonly repository = inject(MONITOR_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  readonly isSimulation = inject(RUNTIME_CONFIG).dataSource === 'simulation';
  private readonly snapshotState = signal<MonitorSnapshot | null>(null);
  private readonly errorState = signal<string | null>(null);
  private readonly pausedState = signal(false);
  private readonly controlPendingState = signal(false);
  private readonly controlErrorState = signal<string | null>(null);
  readonly snapshot = this.snapshotState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly controlPending = this.controlPendingState.asReadonly();
  readonly controlError = this.controlErrorState.asReadonly();
  readonly paused = computed(() =>
    this.isSimulation ? this.pausedState() : (this.snapshot()?.simulationState?.paused ?? false),
  );
  readonly loading = computed(() => !this.snapshot() && !this.error());
  readonly stale = computed(() => !!this.snapshot() && !!this.error());
  readonly online = computed(
    () =>
      !this.error() &&
      !!this.snapshot() &&
      this.snapshot()!.equipment.every((item) => item.status === 'online'),
  );
  readonly canControlVirtual = computed(
    () =>
      this.isSimulation ||
      (!this.error() &&
        this.snapshot()?.motionMode === 'simulation' &&
        !!this.snapshot()?.simulationState &&
        !!this.repository.commandSimulation),
  );
  readonly canStartVirtualCycle = computed(() => {
    const snapshot = this.snapshot();
    const state = snapshot?.simulationState;
    return (
      !this.isSimulation &&
      this.canControlVirtual() &&
      !this.controlPending() &&
      !!state &&
      !state.cycleActive &&
      !!snapshot?.detection &&
      state.targetReady !== false &&
      state.stableFrames >= state.requiredStableFrames
    );
  });
  readonly canArmRobot = computed(() => {
    const snapshot = this.snapshot();
    return (
      !!this.repository.commandRobot &&
      !this.error() &&
      !this.controlPending() &&
      snapshot?.motionMode === 'physical' &&
      snapshot.robotState?.connected === true &&
      snapshot.robotState.state === 'idle' &&
      snapshot.equipment.some((item) => item.id === 'camera' && item.status === 'online')
    );
  });
  readonly canCancelRobot = computed(() => {
    const state = this.snapshot()?.robotState;
    return (
      !!this.repository.commandRobot &&
      !this.controlPending() &&
      !!state &&
      (state.autoEnabled || state.cycleActive)
    );
  });
  readonly stateLabel = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) return 'En espera';
    if (snapshot.motionMode === 'physical')
      return snapshot.robotState?.stepLabel ?? 'Conectando con JetMax';
    if (this.paused()) return processLabel(snapshot.process, true);
    if (
      !this.isSimulation &&
      snapshot.simulationState &&
      !snapshot.simulationState.cycleActive &&
      !snapshot.process.completed
    )
      return 'Esperando un ciclo virtual';
    return processLabel(snapshot.process, this.paused());
  });

  constructor() {
    this.repository
      .watch()
      .pipe(takeUntilDestroyed())
      .subscribe((update) => {
        if (update.snapshot) this.acceptSnapshot(update.snapshot);
        this.errorState.set(update.error);
      });
  }

  private acceptSnapshot(snapshot: MonitorSnapshot): void {
    const current = this.snapshot();
    if (!current || Date.parse(snapshot.updatedAt) >= Date.parse(current.updatedAt))
      this.snapshotState.set(snapshot);
  }

  toggleSimulation(): void {
    if (!this.canControlVirtual() || this.controlPending()) return;
    if (this.isSimulation) {
      const paused = !this.paused();
      this.repository.setSimulationPaused(paused);
      this.pausedState.set(paused);
    } else this.commandVirtual(this.paused() ? 'resume' : 'pause');
  }

  startVirtualCycle(): void {
    if (this.canStartVirtualCycle()) this.commandVirtual('cycle');
  }

  armRobot(): void {
    if (this.canArmRobot()) this.commandRobot('arm');
  }

  cancelRobot(): void {
    if (this.canCancelRobot()) this.commandRobot('cancel');
  }

  private commandRobot(action: RobotAction): void {
    if (!this.repository.commandRobot || this.controlPending()) return;
    this.controlPendingState.set(true);
    this.controlErrorState.set(null);
    this.repository
      .commandRobot(action)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.controlPendingState.set(false)),
      )
      .subscribe({
        next: (snapshot) => this.acceptSnapshot(snapshot),
        error: (error: unknown) =>
          this.controlErrorState.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'El robot bloqueó el comando. Revisa HOME, pinza vacía, conexión y que no haya otro ciclo activo.'
              : apiErrorMessage(error),
          ),
      });
  }

  private commandVirtual(action: SimulationAction): void {
    if (!this.repository.commandSimulation || this.controlPending()) return;
    this.controlPendingState.set(true);
    this.controlErrorState.set(null);
    this.repository
      .commandSimulation(action)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.controlPendingState.set(false)),
      )
      .subscribe({
        next: (snapshot) => this.acceptSnapshot(snapshot),
        error: (error: unknown) =>
          this.controlErrorState.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'No se puede iniciar el ciclo virtual. Espera que termine el anterior y que el plástico alcance 50 frames estables con confianza mínima de 0.80.'
              : apiErrorMessage(error),
          ),
      });
  }
}
