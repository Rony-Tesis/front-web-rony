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
