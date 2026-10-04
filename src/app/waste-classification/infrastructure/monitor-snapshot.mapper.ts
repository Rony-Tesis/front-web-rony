import {
  ClassificationOperation,
  Detection,
  EquipmentHealth,
  MonitorSnapshot,
  Position,
  PROCESS_STAGES,
} from '../domain/monitor.models';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected object.');
  return value as Record<string, unknown>;
}

function text(value: unknown, limit = 160): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit)
    throw new Error('Invalid text.');
  return value;
}

function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error('Invalid number.');
  return value;
}

function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = number(value, 0, max);
  if (!Number.isSafeInteger(parsed)) throw new Error('Invalid integer.');
  return parsed;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid boolean.');
  return value;
}

function choice<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T))
    throw new Error('Unknown enum value.');
  return value as T;
}

function date(value: unknown): string {
  const parsed = text(value, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(parsed) ||
    !Number.isFinite(Date.parse(parsed))
  )
    throw new Error('Expected ISO timestamp with timezone.');
  return parsed;
}

function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid list.');
  return value;
}

function position(value: unknown): Position {
  const source = record(value);
  return { x: number(source['x'], -1e6, 1e6), y: number(source['y'], -1e6, 1e6) };
}

function detection(value: unknown): Detection | null {
  if (value === null) return null;
  const source = record(value);
  return {
    residue: text(source['residue']),
    shortName: text(source['shortName'], 40),
    category: choice(source['category'], ['cardboard', 'plastic', 'aluminum']),
    confidence: number(source['confidence'], 0, 1),
    pixel: position(source['pixel']),
    offsetMm: position(source['offsetMm']),
    targetMm: position(source['targetMm']),
    destination: text(source['destination']),
  };
}

function operation(value: unknown): ClassificationOperation {
  const source = record(value);
  return {
    id: text(source['id'], 100),
    completedAt: date(source['completedAt']),
    residue: text(source['residue']),
    category: choice(source['category'], ['cardboard', 'plastic', 'aluminum']),
    confidence: number(source['confidence'], 0, 1),
    result: choice(source['result'], ['success', 'failure']),
    durationMs: number(source['durationMs'], 0, 86400000),
  };
}

function simulationState(value: unknown) {
  const source = record(value);
  const requiredStableFrames = integer(source['requiredStableFrames'], 10000);
  if (requiredStableFrames === 0) throw new Error('Invalid stability threshold.');
  return {
    paused: boolean(source['paused']),
    cycleActive: boolean(source['cycleActive']),
    stableFrames: integer(source['stableFrames']),
    requiredStableFrames,
  };
}

/** Anti-corruption layer: unknown transport data is reconstructed before entering the application. */
export function mapMonitorSnapshot(value: unknown): MonitorSnapshot {
  const source = record(value);
  const process = record(source['process']);
  const summary = record(source['summary']);
  const durations = list(process['stageDurationsMs'], PROCESS_STAGES.length).map((value) =>
    number(value, 0, 86400000),
  );
  if (durations.length !== PROCESS_STAGES.length) throw new Error('Expected six stage durations.');
  const operations = list(source['operations'], 100).map(operation);
  if (new Set(operations.map((item) => item.id)).size !== operations.length)
    throw new Error('Duplicate operation IDs.');
  operations.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const equipment = list(source['equipment'], 5).map((value): EquipmentHealth => {
    const item = record(value);
    return {
      id: choice(item['id'], ['camera', 'yolo', 'robot', 'gripper', 'planner']),
      status: choice(item['status'], ['online', 'offline', 'unknown']),
    };
  });
  if (equipment.length !== 5 || new Set(equipment.map((item) => item.id)).size !== 5)
    throw new Error('Expected all equipment IDs.');
  const total = integer(summary['total']);
  const successful = integer(summary['successful']);
  const failed = integer(summary['failed']);
  const processedToday = integer(summary['processedToday']);
  if (total !== successful + failed || processedToday > total || operations.length > total)
    throw new Error('Inconsistent totals.');
  const stageIndex = integer(process['stageIndex'], PROCESS_STAGES.length - 1);
  const completed = boolean(process['completed']);
  const progressPercent = number(process['progressPercent'], 0, 100);
  const lastResult =
    process['lastResult'] === null ? null : choice(process['lastResult'], ['success', 'failure']);
  const gripperClosed = boolean(process['gripperClosed']);
  if (completed && (progressPercent !== 100 || lastResult === null || gripperClosed))
    throw new Error('Inconsistent completed cycle.');
  return {
    ...(source['sourceMode'] === undefined
      ? {}
      : { sourceMode: choice(source['sourceMode'], ['simulation', 'live'] as const) }),
    ...(source['motionMode'] === undefined
      ? {}
      : { motionMode: choice(source['motionMode'], ['simulation'] as const) }),
    ...(source['cameraTransport'] === undefined
      ? {}
      : { cameraTransport: choice(source['cameraTransport'], ['jpeg', 'mjpeg'] as const) }),
    ...(source['simulationState'] === undefined
      ? {}
      : { simulationState: simulationState(source['simulationState']) }),
    experimentalMode: choice(source['experimentalMode'], ['optimized', 'baseline']),
    updatedAt: date(source['updatedAt']),
    detection: detection(source['detection']),
    process: {
      stageIndex,
      completed,
      lastResult,
      gripperClosed,
      progressPercent,
      elapsedMs: number(process['elapsedMs'], 0, 86400000),
      stageElapsedMs: number(process['stageElapsedMs'], 0, durations[stageIndex]),
      stageDurationsMs: durations,
    },
    summary: {
      total,
      successful,
      failed,
      processedToday,
      averageDurationMs: number(summary['averageDurationMs'], 0, 86400000),
    },
    operations,
    equipment,
    framesPerSecond: number(source['framesPerSecond'], 0, 240),
  };
}
