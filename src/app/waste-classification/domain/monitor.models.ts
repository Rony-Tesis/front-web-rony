export type WasteCategory = 'cardboard' | 'plastic' | 'aluminum';
export type ClassificationResult = 'success' | 'failure';
export type EquipmentStatus = 'online' | 'offline' | 'unknown';
export type EquipmentId = 'camera' | 'yolo' | 'robot' | 'gripper' | 'planner';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Detection {
  readonly residue: string;
  readonly shortName: string;
  readonly category: WasteCategory;
  /** Normalized probability, from zero to one. */
  readonly confidence: number;
  readonly pixel: Position;
  readonly offsetMm: Position | null;
  readonly targetMm: Position | null;
  readonly destination: string;
}

export interface ClassificationOperation {
  readonly id: string;
  readonly completedAt: string;
  readonly residue: string;
  readonly category: WasteCategory;
  readonly confidence: number;
  readonly result: ClassificationResult;
  readonly durationMs: number;
}

export interface ClassificationSummary {
  readonly processedToday: number;
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly averageDurationMs: number;
}

export interface ProcessState {
  readonly stageIndex: number;
  readonly elapsedMs: number;
  readonly stageElapsedMs: number;
  readonly stageDurationsMs: readonly number[];
  readonly progressPercent: number;
  readonly completed: boolean;
  readonly lastResult: ClassificationResult | null;
  readonly gripperClosed: boolean;
}

export interface EquipmentHealth {
  readonly id: EquipmentId;
  readonly status: EquipmentStatus;
}

/** A coherent read model of the classification bounded context. */
export interface SimulationState {
  readonly paused: boolean;
  readonly cycleActive: boolean;
  readonly stableFrames: number;
  readonly requiredStableFrames: number;
  readonly targetReady?: boolean;
}

export type SimulationAction = 'pause' | 'resume' | 'cycle';

export interface MonitorSnapshot {
  readonly simulationState?: SimulationState;
  readonly sourceMode?: 'simulation' | 'live';
  readonly motionMode?: 'simulation';
  readonly cameraTransport?: 'jpeg' | 'mjpeg';
  readonly experimentalMode: 'optimized' | 'baseline';
  readonly updatedAt: string;
  readonly detection: Detection | null;
  readonly targetDetection?: Detection | null;
  readonly process: ProcessState;
  readonly summary: ClassificationSummary;
  readonly operations: readonly ClassificationOperation[];
  readonly equipment: readonly EquipmentHealth[];
  readonly framesPerSecond: number;
}

export const CATEGORY_LABELS: Readonly<Record<WasteCategory, string>> = {
  cardboard: 'Cartón',
  plastic: 'Plástico',
  aluminum: 'Aluminio',
};

export const EQUIPMENT_LABELS: Readonly<Record<EquipmentId, string>> = {
  camera: 'Cámara',
  yolo: 'Modelo YOLO',
  robot: 'Monitor',
  gripper: 'Pinza',
  planner: 'Planificación',
};

export const PROCESS_STAGES = [
  {
    name: 'Detección',
    state: 'Detectando',
    description: 'Analizando la imagen de la cámara.',
    icon: 'camera',
  },
  {
    name: 'Localización',
    state: 'Localizando',
    description: 'Estimando la posición del objeto.',
    icon: 'map',
  },
  {
    name: 'Planificación',
    state: 'Planificando',
    description: 'Generando la trayectoria.',
    icon: 'settings',
  },
  { name: 'Agarre', state: 'Sujetando', description: 'Preparando la pinza.', icon: 'gripper' },
  {
    name: 'Traslado',
    state: 'Trasladando',
    description: 'Moviendo hacia el contenedor.',
    icon: 'arrow',
  },
  {
    name: 'Clasificación',
    state: 'Clasificando',
    description: 'Confirmando el depósito.',
    icon: 'recycle',
  },
] as const;

export function stageStatus(process: ProcessState, index: number): 'done' | 'current' | 'pending' {
  return process.completed || index < process.stageIndex
    ? 'done'
    : index === process.stageIndex
      ? 'current'
      : 'pending';
}

export function processLabel(process: ProcessState, paused: boolean): string {
  if (paused) return 'Simulación pausada';
  if (process.completed)
    return process.lastResult === 'failure' ? 'Revisión requerida' : 'Ciclo completado';
  return PROCESS_STAGES[process.stageIndex]?.state ?? 'En espera';
}

export function percentage(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}
