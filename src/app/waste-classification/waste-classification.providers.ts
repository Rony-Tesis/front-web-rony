import { inject, Provider } from '@angular/core';
import { RUNTIME_CONFIG } from '../core/config/runtime-config';
import { MONITOR_REPOSITORY } from './application/monitor-repository';
import { HttpMonitorRepository } from './infrastructure/http-monitor.repository';
import { SimulatedMonitorRepository } from './infrastructure/simulated-monitor.repository';
import { CAMERA_STREAM } from './application/camera-stream';
import { HttpCameraStream } from './infrastructure/http-camera-stream';

export function provideWasteClassification(): Provider[] {
  return [
    { provide: CAMERA_STREAM, useExisting: HttpCameraStream },
    {
      provide: MONITOR_REPOSITORY,
      useFactory: () =>
        inject(RUNTIME_CONFIG).dataSource === 'simulation'
          ? inject(SimulatedMonitorRepository)
          : inject(HttpMonitorRepository),
    },
  ];
}
