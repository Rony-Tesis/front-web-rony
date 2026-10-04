import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { apiEndpoint, RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { MonitorSnapshot } from '../../../domain/monitor.models';

@Component({
  selector: 'app-camera-feed',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './camera-feed.component.html',
  styleUrl: './camera-feed.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraFeedComponent {
  readonly snapshot = input.required<MonitorSnapshot>();
  readonly compact = input(false);
  readonly paused = input(false);
  readonly simulation = input.required<boolean>();
  private readonly config = inject(RUNTIME_CONFIG);
  private readonly failedVersion = signal<string | null>(null);
  protected readonly available = computed(
    () =>
      this.failedVersion() !== this.snapshot().updatedAt &&
      (this.simulation() ||
        (this.snapshot().framesPerSecond > 0 &&
          this.snapshot().equipment.some(
            (item) => item.id === 'camera' && item.status === 'online',
          ))),
  );
  protected readonly cameraLabel = computed(() => {
    if (this.simulation()) return this.paused() ? 'SIMULACIÓN PAUSADA' : 'SIMULACIÓN EN VIVO';
    if (this.snapshot().sourceMode === 'simulation') return 'CÁMARA SIMULADA · API';
    return this.snapshot().cameraTransport === 'mjpeg' && !this.compact()
      ? 'CÁMARA REAL · VIDEO'
      : 'ÚLTIMA CAPTURA';
  });
  protected readonly imageUrl = computed(() => {
    if (this.simulation()) return 'assets/detection-mock-es.png';
    if (this.snapshot().cameraTransport === 'mjpeg' && !this.compact())
      return apiEndpoint(this.config.apiBasePath, 'v1/monitor/stream');
    return `${apiEndpoint(this.config.apiBasePath, 'v1/monitor/frame')}?at=${encodeURIComponent(this.snapshot().updatedAt)}`;
  });
  protected imageFailed(): void {
    this.failedVersion.set(this.snapshot().updatedAt);
  }
}
