import { SimulationEngine } from '../domain/simulation-engine';
import { mapMonitorSnapshot } from './monitor-snapshot.mapper';

describe('API anti-corruption layer', () => {
  const seed = () => structuredClone(new SimulationEngine(Date.now()).snapshot(Date.now()));

  it('accepts the documented aggregate and constructs a new domain snapshot', () => {
    const dto = seed();
    const snapshot = mapMonitorSnapshot(dto);
    expect(snapshot).toEqual(dto);
    expect(snapshot).not.toBe(dto);
    expect(snapshot.detection).not.toBe(dto.detection);
  });

  it.each([null, {}, { process: [] }, 'unexpected'])('rejects malformed roots: %s', (value) => {
    expect(() => mapMonitorSnapshot(value)).toThrow();
  });

  it('rejects unknown categories, non-finite confidence and out-of-range stages', () => {
    const dto = seed();
    expect(() =>
      mapMonitorSnapshot({ ...dto, detection: { ...dto.detection, category: 'script' } }),
    ).toThrow();
    expect(() =>
      mapMonitorSnapshot({ ...dto, detection: { ...dto.detection, confidence: NaN } }),
    ).toThrow();
    expect(() =>
      mapMonitorSnapshot({ ...dto, process: { ...dto.process, stageIndex: 6 } }),
    ).toThrow();
  });

  it('rejects contradictory counters, missing equipment and duplicate IDs', () => {
    const dto = seed();
    expect(() => mapMonitorSnapshot({ ...dto, summary: { ...dto.summary, total: 0 } })).toThrow();
    expect(() => mapMonitorSnapshot({ ...dto, equipment: dto.equipment.slice(1) })).toThrow();
    expect(() =>
      mapMonitorSnapshot({ ...dto, operations: [dto.operations[0], dto.operations[0]] }),
    ).toThrow();
  });

  it('rejects unbounded strings, oversized history and timestamps without a timezone', () => {
    const dto = seed();
    expect(() => mapMonitorSnapshot({ ...dto, updatedAt: '2026-10-03 10:00:00' })).toThrow();
    expect(() =>
      mapMonitorSnapshot({ ...dto, operations: Array(101).fill(dto.operations[0]) }),
    ).toThrow();
    expect(() =>
      mapMonitorSnapshot({ ...dto, detection: { ...dto.detection, residue: 'x'.repeat(161) } }),
    ).toThrow();
  });

  it('validates camera provenance and transport without requiring prototype metadata', () => {
    const dto = seed();
    const snapshot = mapMonitorSnapshot({
      ...dto,
      sourceMode: 'live',
      motionMode: 'simulation',
      cameraTransport: 'mjpeg',
    });
    expect(snapshot.sourceMode).toBe('live');
    expect(snapshot.motionMode).toBe('simulation');
    expect(snapshot.cameraTransport).toBe('mjpeg');
    expect(() => mapMonitorSnapshot({ ...dto, sourceMode: 'unexpected' })).toThrow();
    expect(() => mapMonitorSnapshot({ ...dto, motionMode: 'physical' })).toThrow();
    expect(() => mapMonitorSnapshot({ ...dto, cameraTransport: 'javascript:' })).toThrow();
    expect(mapMonitorSnapshot(dto).sourceMode).toBeUndefined();
  });

  it('validates virtual control state and stability limits', () => {
    const dto = seed();
    const simulationState = {
      paused: false,
      cycleActive: false,
      stableFrames: 50,
      requiredStableFrames: 50,
    };
    expect(mapMonitorSnapshot({ ...dto, simulationState }).simulationState).toEqual(
      simulationState,
    );
    expect(() =>
      mapMonitorSnapshot({ ...dto, simulationState: { ...simulationState, paused: 'true' } }),
    ).toThrow();
    expect(() =>
      mapMonitorSnapshot({ ...dto, simulationState: { ...simulationState, stableFrames: -1 } }),
    ).toThrow();
    expect(() =>
      mapMonitorSnapshot({
        ...dto,
        simulationState: { ...simulationState, requiredStableFrames: 0 },
      }),
    ).toThrow();
  });

  it('keeps visible low-confidence aluminum separate from an eligible cycle target', () => {
    const dto = seed();
    const snapshot = mapMonitorSnapshot({
      ...dto,
      detection: {
        ...dto.detection,
        category: 'aluminum',
        confidence: 0.38,
        offsetMm: null,
        targetMm: null,
      },
      targetDetection: null,
      simulationState: {
        paused: false,
        cycleActive: false,
        stableFrames: 0,
        requiredStableFrames: 50,
        targetReady: false,
      },
    });
    expect(snapshot.detection?.category).toBe('aluminum');
    expect(snapshot.detection?.confidence).toBe(0.38);
    expect(snapshot.detection?.targetMm).toBeNull();
    expect(snapshot.targetDetection).toBeNull();
    expect(snapshot.simulationState?.targetReady).toBe(false);
    expect(() => mapMonitorSnapshot({ ...dto, targetDetection: {} })).toThrow();
    expect(() =>
      mapMonitorSnapshot({
        ...snapshot,
        simulationState: { ...snapshot.simulationState, targetReady: 'yes' },
      }),
    ).toThrow();
  });

  it('supports no detection and preserves dangerous-looking text as plain data', () => {
    const dto = seed();
    expect(mapMonitorSnapshot({ ...dto, detection: null }).detection).toBeNull();
    const snapshot = mapMonitorSnapshot({
      ...dto,
      detection: { ...dto.detection, residue: '<img src=x onerror=alert(1)>' },
    });
    expect(snapshot.detection?.residue).toBe('<img src=x onerror=alert(1)>');
  });
});
