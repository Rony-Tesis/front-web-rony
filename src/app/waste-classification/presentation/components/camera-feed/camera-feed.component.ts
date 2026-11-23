import { DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { apiEndpoint, RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { MonitorSnapshot } from '../../../domain/monitor.models';
import { CAMERA_STREAM } from '../../../application/camera-stream';

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
  private readonly stream = inject(CAMERA_STREAM, { optional: true });
  private readonly page = inject(DOCUMENT);
  private readonly visible = signal(this.page.visibilityState !== 'hidden');
  private readonly liveImage = signal<string | null>(null);
  protected readonly videoFps = signal(0);
  protected readonly videoAt = signal<string | null>(null);
  private loadedFrame = () => {};
  private readonly wantsVideo = computed(
    () =>
      this.visible() &&
      !this.simulation() &&
      this.snapshot().sourceMode === 'live' &&
      this.snapshot().cameraTransport === 'jpeg' &&
      this.snapshot().framesPerSecond > 0 &&
      this.snapshot().equipment.some((item) => item.id === 'camera' && item.status === 'online'),
  );

  constructor() {
    const visibilityChanged = () => this.visible.set(this.page.visibilityState !== 'hidden');
    this.page.addEventListener('visibilitychange', visibilityChanged);
    inject(DestroyRef).onDestroy(() =>
      this.page.removeEventListener('visibilitychange', visibilityChanged),
    );
    effect((onCleanup) => {
      if (!this.wantsVideo() || !this.stream) return;
      let busy = false;
      let pending: Blob | null = null;
      let current: string | null = null;
      let previous: string | null = null;
      let lastLoaded = 0;
      const release = () => {
        if (current) URL.revokeObjectURL(current);
        if (previous) URL.revokeObjectURL(previous);
        current = previous = null;
        pending = null;
        busy = false;
        this.liveImage.set(null);
        this.videoFps.set(0);
        this.videoAt.set(null);
      };
      const publish = (blob: Blob) => {
        busy = true;
        previous = current;
        current = URL.createObjectURL(blob);
        this.liveImage.set(current);
      };
      this.loadedFrame = () => {
        if (!busy) return;
        if (previous) URL.revokeObjectURL(previous);
        previous = null;
        busy = false;
        const now = performance.now();
        if (lastLoaded) this.videoFps.set(Math.min(60, 1000 / Math.max(1, now - lastLoaded)));
        lastLoaded = now;
        this.videoAt.set(new Date().toISOString());
        if (pending) {
          const latest = pending;
          pending = null;
          publish(latest);
        }
      };
      const subscription = this.stream.watch().subscribe((blob) => {
        if (!blob) release();
        else if (busy) pending = blob;
        else publish(blob);
      });
      onCleanup(() => {
        subscription.unsubscribe();
        this.loadedFrame = () => {};
        release();
      });
    });
  }
  protected readonly available = computed(
    () =>
      (this.liveImage() !== null || this.failedVersion() !== this.snapshot().updatedAt) &&
      (this.simulation() ||
        (this.snapshot().framesPerSecond > 0 &&
          this.snapshot().equipment.some(
            (item) => item.id === 'camera' && item.status === 'online',
          ))),
  );
  protected readonly cameraLabel = computed(() => {
    if (this.simulation()) return this.paused() ? 'SIMULACIÓN PAUSADA' : 'SIMULACIÓN EN VIVO';
    if (this.snapshot().sourceMode === 'simulation') return 'CÁMARA SIMULADA · API';
    return this.liveImage() || (this.snapshot().cameraTransport === 'mjpeg' && !this.compact())
      ? 'CÁMARA REAL · VIDEO'
      : 'ÚLTIMA CAPTURA';
  });
  protected readonly imageUrl = computed(() => {
    if (this.simulation()) return 'assets/detection-mock-es.png';
    if (this.liveImage()) return this.liveImage()!;
    if (this.snapshot().cameraTransport === 'mjpeg' && !this.compact())
      return apiEndpoint(this.config.apiBasePath, 'v1/monitor/stream');
    return `${apiEndpoint(this.config.apiBasePath, 'v1/monitor/frame')}?at=${encodeURIComponent(this.snapshot().updatedAt)}`;
  });
  protected imageFailed(): void {
    if (this.liveImage()) {
      this.loadedFrame();
      return;
    }
    this.failedVersion.set(this.snapshot().updatedAt);
  }
  protected imageLoaded(): void {
    this.loadedFrame();
  }
}
