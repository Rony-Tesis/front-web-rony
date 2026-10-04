import { SimulatedMonitorRepository } from './simulated-monitor.repository';
import { MonitorUpdate } from '../application/monitor-repository';

describe('Simulation timer lifecycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('freezes both cycle and feed while paused, resumes without a time jump, and unsubscribes', () => {
    const repository = new SimulatedMonitorRepository();
    let latest: MonitorUpdate | undefined;
    const subscription = repository.watch().subscribe((value) => {
      latest = value;
    });
    vi.advanceTimersByTime(1000);
    const beforePause = latest!.snapshot!;
    repository.setSimulationPaused(true);
    vi.advanceTimersByTime(5000);
    expect(latest!.snapshot!.process.elapsedMs).toBe(beforePause.process.elapsedMs);
    expect(latest!.snapshot!.updatedAt).toBe(beforePause.updatedAt);
    repository.setSimulationPaused(false);
    vi.advanceTimersByTime(100);
    expect(latest!.snapshot!.process.elapsedMs - beforePause.process.elapsedMs).toBeCloseTo(100);
    subscription.unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
  });
});
