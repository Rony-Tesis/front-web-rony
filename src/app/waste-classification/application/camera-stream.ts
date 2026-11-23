import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface CameraStream {
  /** Latest JPEG only; null means reconnecting and permits snapshot fallback. */
  watch(): Observable<Blob | null>;
}

export const CAMERA_STREAM = new InjectionToken<CameraStream>('CAMERA_STREAM');
