import {
  ClassificationOperation,
  Detection,
  MonitorSnapshot,
  PROCESS_STAGES,
} from './monitor.models';

const DURATIONS = [1800, 1400, 2200, 3000, 5500, 2000] as const;
export const CYCLE_DURATION_MS = DURATIONS.reduce((sum, value) => sum + value, 0);
export const INTER_CYCLE_DELAY_MS = 2600;
const DETECTIONS: readonly Detection[] = [
  {
    residue: 'Pedazo de cartón',
    shortName: 'Cartón',
    category: 'cardboard',
    confidence: 0.86,
    pixel: { x: 174, y: 254 },
    offsetMm: { x: 55.5, y: -36 },
    targetMm: { x: 55.5, y: -199 },
    destination: 'Contenedor de cartón',
  },
  {
    residue: 'Tapa plástica morada',
    shortName: 'Tapa',
    category: 'plastic',
    confidence: 0.9,
    pixel: { x: 326, y: 367 },
    offsetMm: { x: -12.2, y: 4.8 },
    targetMm: { x: -12.2, y: -158.1 },
    destination: 'Contenedor de plástico',
  },
  {
    residue: 'Tapa plástica transparente',
    shortName: 'Tapa',
    category: 'plastic',
    confidence: 0.88,
    pixel: { x: 452, y: 307 },
    offsetMm: { x: -66.2, y: -23.1 },
    targetMm: { x: -66.2, y: -186 },
    destination: 'Contenedor de plástico',
  },
];

/** Pure simulation: no Angular, DOM, HTTP, storage or timers. */
export class SimulationEngine {
  private elapsed = 0;
  private objectIndex = 0;
  private sequence = 0;
  private completed = false;
  private lastResult: 'success' | 'failure' | null = null;
  private total = 128;
  private successful = 119;
  private failed = 9;
  private processedToday = 48;
  private averageDurationMs = 15900;
  private currentDay: string;
  private operations: ClassificationOperation[];

  constructor(
    private readonly initialTime: number,
    private readonly random: () => number = Math.random,
  ) {
    this.currentDay = this.dayKey(initialTime);
    const seeds = [
      { residue: 'Lata de aluminio', category: 'aluminum', confidence: 0.94, durationMs: 15800 },
      { residue: 'Botella plástica', category: 'plastic', confidence: 0.87, durationMs: 16200 },
      { residue: 'Caja de cartón', category: 'cardboard', confidence: 0.91, durationMs: 15400 },
      { residue: 'Tapa plástica', category: 'plastic', confidence: 0.76, durationMs: 17100 },
      { residue: 'Tubo de cartón', category: 'cardboard', confidence: 0.82, durationMs: 15700 },
      { residue: 'Lata de aluminio', category: 'aluminum', confidence: 0.89, durationMs: 16000 },
    ] as const;
    this.operations = seeds.map((seed, index) => ({
      ...seed,
      id: `demo-seed-${index}`,
      completedAt: new Date(initialTime - (index + 1) * 52000).toISOString(),
      result: index === 3 ? 'failure' : 'success',
    }));
  }

  advance(deltaMs: number, now: number): MonitorSnapshot {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid simulation delta.');
    if (this.dayKey(now) !== this.currentDay) {
      this.processedToday = 0;
      this.currentDay = this.dayKey(now);
    }
    // Background tabs resume from where they stopped; never fabricate a backlog of operations.
    this.elapsed += Math.min(deltaMs, 1000);
    if (!this.completed && this.elapsed >= CYCLE_DURATION_MS) this.complete(now);
    if (this.elapsed >= CYCLE_DURATION_MS + INTER_CYCLE_DELAY_MS) {
      this.elapsed = 0;
      this.completed = false;
      this.objectIndex = (this.objectIndex + 1) % DETECTIONS.length;
    }
    return this.snapshot(now);
  }

  snapshot(now: number): MonitorSnapshot {
    let stageIndex = 0;
    let start = 0;
    while (
      stageIndex < PROCESS_STAGES.length - 1 &&
      this.elapsed >= start + DURATIONS[stageIndex]!
    ) {
      start += DURATIONS[stageIndex]!;
      stageIndex++;
    }
    return {
      experimentalMode: 'optimized',
      updatedAt: new Date(now).toISOString(),
      detection: DETECTIONS[this.objectIndex]!,
      process: {
        stageIndex,
        elapsedMs: Math.min(this.elapsed, CYCLE_DURATION_MS),
        stageElapsedMs: Math.min(Math.max(0, this.elapsed - start), DURATIONS[stageIndex]!),
        stageDurationsMs: DURATIONS,
        progressPercent: Math.min(100, (this.elapsed / CYCLE_DURATION_MS) * 100),
        completed: this.completed,
        lastResult: this.lastResult,
        gripperClosed: !this.completed && (stageIndex === 3 || stageIndex === 4),
      },
      summary: {
        total: this.total,
        successful: this.successful,
        failed: this.failed,
        processedToday: this.processedToday,
        averageDurationMs: this.averageDurationMs,
      },
      operations: [...this.operations],
      equipment: ['camera', 'yolo', 'robot', 'gripper', 'planner'].map(
        (id) => ({ id, status: 'online' }) as const,
      ) as MonitorSnapshot['equipment'],
      framesPerSecond: 29.8,
    };
  }

  private complete(now: number): void {
    const detection = DETECTIONS[this.objectIndex]!;
    const result: ClassificationOperation['result'] = this.random() >= 0.07 ? 'success' : 'failure';
    this.sequence++;
    this.operations = [
      {
        id: `demo-${this.initialTime}-${this.sequence}`,
        completedAt: new Date(now).toISOString(),
        residue: detection.residue,
        category: detection.category,
        confidence: detection.confidence,
        result,
        durationMs: CYCLE_DURATION_MS,
      },
      ...this.operations,
    ].slice(0, 6);
    this.averageDurationMs =
      (this.averageDurationMs * this.total + CYCLE_DURATION_MS) / (this.total + 1);
    this.total++;
    this.processedToday++;
    this.successful += result === 'success' ? 1 : 0;
    this.failed += result === 'failure' ? 1 : 0;
    this.lastResult = result;
    this.completed = true;
  }

  private dayKey(now: number): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now);
  }
}
