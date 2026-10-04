import { CYCLE_DURATION_MS, SimulationEngine } from './simulation-engine';
import { percentage, stageStatus } from './monitor.models';

describe('Classification simulation rules', () => {
  const now = Date.parse('2026-10-03T15:00:00Z');
  function complete(engine: SimulationEngine) {
    for (let step = 1; step <= Math.ceil(CYCLE_DURATION_MS / 1000); step++)
      engine.advance(1000, now + step * 1000);
    return engine.snapshot(now + 16000);
  }

  it('starts at detection and advances across each stage boundary', () => {
    const engine = new SimulationEngine(now);
    expect(engine.snapshot(now).process.stageIndex).toBe(0);
    engine.advance(1000, now + 1000);
    const snapshot = engine.advance(800, now + 1800);
    expect(snapshot.process.stageIndex).toBe(1);
    expect(snapshot.process.stageElapsedMs).toBe(0);
    expect(stageStatus(snapshot.process, 0)).toBe('done');
    expect(stageStatus(snapshot.process, 1)).toBe('current');
    expect(stageStatus(snapshot.process, 2)).toBe('pending');
  });

  it('records a successful cycle exactly once and keeps summary totals consistent', () => {
    const engine = new SimulationEngine(now, () => 0.99);
    const snapshot = complete(engine);
    expect(snapshot.summary.total).toBe(129);
    expect(snapshot.summary.successful).toBe(120);
    expect(snapshot.summary.failed).toBe(9);
    expect(snapshot.operations[0]?.durationMs).toBe(CYCLE_DURATION_MS);
    expect(snapshot.process.completed).toBe(true);
    expect(snapshot.process.gripperClosed).toBe(false);
    expect(stageStatus(snapshot.process, 5)).toBe('done');
    expect(engine.advance(1000, now + 17000).summary.total).toBe(129);
    expect(snapshot.summary.averageDurationMs).toBeCloseTo((128 * 15900 + CYCLE_DURATION_MS) / 129);
  });

  it('records failures and rotates to the next detected object after the delay', () => {
    const engine = new SimulationEngine(now, () => 0.01);
    const snapshot = complete(engine);
    expect(snapshot.summary.failed).toBe(10);
    expect(snapshot.process.lastResult).toBe('failure');
    engine.advance(1000, now + 17000);
    engine.advance(1000, now + 18000);
    const next = engine.advance(500, now + 18500);
    expect(next.detection?.category).toBe('plastic');
    expect(next.process.completed).toBe(false);
    expect(next.process.elapsedMs).toBe(0);
  });

  it('caps suspended-tab time and rejects invalid time deltas', () => {
    const engine = new SimulationEngine(now);
    const snapshot = engine.advance(3600000, now + 3600000);
    expect(snapshot.process.elapsedMs).toBe(1000);
    expect(snapshot.summary.total).toBe(128);
    expect(() => engine.advance(-1, now)).toThrow();
    expect(() => engine.advance(NaN, now)).toThrow();
  });

  it('resets the daily counter at midnight in Lima and handles empty percentages', () => {
    const beforeMidnight = Date.parse('2026-10-04T04:59:59Z');
    const engine = new SimulationEngine(beforeMidnight);
    expect(engine.advance(1000, beforeMidnight + 1000).summary.processedToday).toBe(0);
    expect(percentage(0, 0)).toBe(0);
  });
});
