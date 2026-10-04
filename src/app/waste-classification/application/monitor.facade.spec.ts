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
    TestBed.configureTestingModule({
      providers: [
        { provide: RUNTIME_CONFIG, useValue: { dataSource } },
        {
          provide: MONITOR_REPOSITORY,
          useValue: { watch: () => stream.asObservable(), setSimulationPaused: pause },
        },
      ],
    });
    return { facade: TestBed.inject(MonitorFacade), stream, pause };
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
});
