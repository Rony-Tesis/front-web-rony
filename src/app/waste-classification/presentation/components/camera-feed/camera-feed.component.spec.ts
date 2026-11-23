import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { CAMERA_STREAM } from '../../../application/camera-stream';
import { SimulationEngine } from '../../../domain/simulation-engine';
import { CameraFeedComponent } from './camera-feed.component';

describe('Live camera display', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps streaming across metadata polls, drops queued pictures and releases image URLs', async () => {
    const create = vi.fn().mockImplementation(() => 'blob:camera-' + create.mock.calls.length);
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = create;
        static override revokeObjectURL = revoke;
      },
    );
    const frames = new Subject<Blob | null>();
    const watch = vi.fn(() => frames.asObservable());
    await TestBed.configureTestingModule({
      imports: [CameraFeedComponent],
      providers: [{ provide: CAMERA_STREAM, useValue: { watch } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CameraFeedComponent);
    const seed = new SimulationEngine(Date.now()).snapshot(Date.now());
    const snapshot = {
      ...seed,
      sourceMode: 'live',
      cameraTransport: 'jpeg',
      framesPerSecond: 10,
      equipment: [{ id: 'camera', status: 'online' }],
    };
    fixture.componentRef.setInput('snapshot', snapshot);
    fixture.componentRef.setInput('simulation', false);
    fixture.detectChanges();
    expect(watch).toHaveBeenCalledOnce();
    const first = new Blob(['first']);
    const obsolete = new Blob(['obsolete']);
    const latest = new Blob(['latest']);
    frames.next(first);
    frames.next(obsolete);
    frames.next(latest);
    fixture.detectChanges();
    expect(create).toHaveBeenCalledTimes(1);
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenLastCalledWith(latest);
    fixture.componentRef.setInput('snapshot', { ...snapshot, updatedAt: new Date().toISOString() });
    fixture.detectChanges();
    expect(watch).toHaveBeenCalledOnce();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(revoke).toHaveBeenCalledWith('blob:camera-1');
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:camera-2');
    expect(frames.observed).toBe(false);
  });
});
