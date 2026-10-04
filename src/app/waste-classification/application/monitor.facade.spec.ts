import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { SimulationEngine } from '../domain/simulation-engine';
import { MONITOR_REPOSITORY, MonitorUpdate } from './monitor-repository';
import { MonitorFacade } from './monitor.facade';

describe('Shared monitor state', () => {
  function setup(dataSource: 'simulation' | 'api') {
    const stream = new Subject<MonitorUpdate>();
    const pause = vi.fn();
    const commands = new Subject<import('../domain/monitor.models').MonitorSnapshot>();
    const commandSimulation = vi.fn(() => commands.asObservable());
    const commandRobot = vi.fn(() => commands.asObservable());
    TestBed.configureTestingModule({
      providers: [
        { provide: RUNTIME_CONFIG, useValue: { dataSource } },
        {
          provide: MONITOR_REPOSITORY,
          useValue: {
            watch: () => stream.asObservable(),
            setSimulationPaused: pause,
            commandSimulation,
            commandRobot,
          },
        },
      ],
    });
    return {
      facade: TestBed.inject(MonitorFacade),
      stream,
      pause,
      commands,
      commandSimulation,
      commandRobot,
    };
  }

  it('retains the last valid snapshot as stale after an API error and recovers', () => {
    const { facade, stream } = setup('api');
    expect(facade.loading()).toBe(true);
    const snapshot = new SimulationEngine(Date.now()).snapshot(Date.now());
    stream.next({ snapshot, error: null });
    expect(facade.online()).toBe(true);
    stream.next({ snapshot: null, error: 'Sin conexión' });
    expect(facade.snapshot()).toBe(snapshot);
    expect(facade.stale()).toBe(true);
    expect(facade.online()).toBe(false);
    stream.next({ snapshot, error: null });
    expect(facade.stale()).toBe(false);
  });

  it('only permits the simulation adapter to pause', () => {
    const { facade, pause } = setup('api');
    facade.toggleSimulation();
    expect(pause).not.toHaveBeenCalled();
    expect(facade.paused()).toBe(false);
  });

  it('forwards simulation pause and resume without creating a second stream', () => {
    const { facade, stream, pause } = setup('simulation');
    stream.next({ snapshot: new SimulationEngine(Date.now()).snapshot(Date.now()), error: null });
    facade.toggleSimulation();
    expect(facade.stateLabel()).toBe('Simulación pausada');
    facade.toggleSimulation();
    expect(pause.mock.calls).toEqual([[true], [false]]);
  });

  it('controls backend virtual cycles, prevents duplicate commands and accepts server pause state', () => {
    const { facade, stream, commands, commandSimulation, pause } = setup('api');
    const dto = {
      ...new SimulationEngine(Date.now()).snapshot(Date.now()),
      motionMode: 'simulation' as const,
      simulationState: {
        paused: false,
        cycleActive: false,
        stableFrames: 49,
        requiredStableFrames: 50,
      },
    };
    stream.next({ snapshot: dto, error: null });
    expect(facade.canControlVirtual()).toBe(true);
    expect(facade.canStartVirtualCycle()).toBe(false);
    facade.toggleSimulation();
    facade.toggleSimulation();
    expect(commandSimulation.mock.calls).toEqual([['pause']]);
    expect(pause).not.toHaveBeenCalled();
    expect(facade.controlPending()).toBe(true);
    commands.next({ ...dto, simulationState: { ...dto.simulationState, paused: true } });
    commands.complete();
    expect(facade.paused()).toBe(true);
    expect(facade.stateLabel()).toBe('Simulación pausada');
    expect(facade.controlPending()).toBe(false);
  });

  it('does not enable virtual cycles for missing detections or stale API data', () => {
    const { facade, stream } = setup('api');
    const dto = {
      ...new SimulationEngine(Date.now()).snapshot(Date.now()),
      motionMode: 'simulation' as const,
      simulationState: {
        paused: false,
        cycleActive: false,
        stableFrames: 50,
        requiredStableFrames: 50,
      },
    };
    stream.next({ snapshot: dto, error: null });
    expect(facade.canStartVirtualCycle()).toBe(true);
    stream.next({ snapshot: { ...dto, detection: null }, error: null });
    expect(facade.canStartVirtualCycle()).toBe(false);
    stream.next({ snapshot: dto, error: 'Sin conexión' });
    expect(facade.canControlVirtual()).toBe(false);
  });

  it('requires live physical state for arming and permits cancellation when telemetry becomes stale', () => {
    const { facade, stream, commands, commandRobot } = setup('api');
    const seed = new SimulationEngine(Date.now()).snapshot(Date.now());
    const robotState = {
      connected: true,
      state: 'idle' as const,
      stepLabel: 'Listo',
      autoEnabled: false,
      cycleActive: false,
      holdingObject: null,
      completedGrasps: 0,
      reportedPosition: { x: 0, y: -162.94, z: 212.8 },
      gripperAngle: 90,
      telemetryAt: seed.updatedAt,
      error: null,
    };
    const dto = {
      ...seed,
      sourceMode: 'live' as const,
      motionMode: 'physical' as const,
      robotState,
    };
    stream.next({ snapshot: dto, error: null });
    expect(facade.canArmRobot()).toBe(true);
    expect(facade.canResetRobot()).toBe(true);
    expect(facade.canControlVirtual()).toBe(false);
    facade.armRobot();
    facade.armRobot();
    expect(commandRobot.mock.calls).toEqual([['arm']]);
    commands.complete();
    stream.next({
      snapshot: {
        ...dto,
        robotState: { ...robotState, state: 'moving', autoEnabled: true, cycleActive: true },
      },
      error: 'Telemetry lost',
    });
    expect(facade.canArmRobot()).toBe(false);
    expect(facade.canCancelRobot()).toBe(true);
    expect(facade.canResetRobot()).toBe(false);
    facade.resetRobot();
    expect(commandRobot.mock.calls).toEqual([['arm']]);
    facade.cancelRobot();
    expect(commandRobot.mock.calls.at(-1)).toEqual(['cancel']);
    stream.next({
      snapshot: { ...dto, robotState: { ...robotState, state: 'holding', gripperAngle: 80 } },
      error: null,
    });
    expect(facade.canArmRobot()).toBe(false);
    expect(facade.canCancelRobot()).toBe(false);
    expect(facade.canResetRobot()).toBe(true);
    facade.resetRobot();
    expect(commandRobot.mock.calls.at(-1)).toEqual(['reset']);
    stream.next({
      snapshot: { ...dto, robotState: { ...robotState, state: 'resetting', cycleActive: true } },
      error: null,
    });
    expect(facade.canArmRobot()).toBe(false);
    expect(facade.canResetRobot()).toBe(false);
    stream.next({ snapshot: dto, error: null });
    expect(facade.canArmRobot()).toBe(true);
  });

  it('shows detected aluminum while respecting backend target eligibility', () => {
    const { facade, stream } = setup('api');
    const seed = new SimulationEngine(Date.now()).snapshot(Date.now());
    stream.next({
      snapshot: {
        ...seed,
        motionMode: 'simulation',
        detection: { ...seed.detection!, category: 'aluminum', confidence: 0.38 },
        targetDetection: null,
        simulationState: {
          paused: false,
          cycleActive: false,
          stableFrames: 100,
          requiredStableFrames: 50,
          targetReady: false,
        },
      },
      error: null,
    });
    expect(facade.snapshot()?.detection?.category).toBe('aluminum');
    expect(facade.canStartVirtualCycle()).toBe(false);
  });
});
