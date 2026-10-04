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
    TestBed.configureTestingModule({
      providers: [
        { provide: RUNTIME_CONFIG, useValue: { dataSource } },
        {
          provide: MONITOR_REPOSITORY,
          useValue: {
            watch: () => stream.asObservable(),
            setSimulationPaused: pause,
            commandSimulation,
          },
        },
      ],
    });
    return { facade: TestBed.inject(MonitorFacade), stream, pause, commands, commandSimulation };
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
});
