import { TestBed } from '@angular/core/testing';
import { HttpCameraStream } from './http-camera-stream';

describe('Camera connection lifecycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shares one stream, sends only a camera capability and aborts when the last viewer leaves', async () => {
    const received = vi.fn();
    const token = 'c'.repeat(43);
    const blob = new Uint8Array([255, 216, 1, 255, 217]);
    const header = new TextEncoder().encode(
      '--rony-frame\r\nContent-Type: image/jpeg\r\nContent-Length: 5\r\n\r\n',
    );
    let cameraSignal: AbortSignal | undefined;
    const request = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      if (request.mock.calls.length === 1) {
        return Response.json({
          url: 'https://camera-api.example.invalid/api/v1/monitor/camera-stream',
          token,
        });
      }
      cameraSignal = options.signal!;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([...header, ...blob]));
            cameraSignal!.addEventListener('abort', () =>
              controller.error(new DOMException('Aborted', 'AbortError')),
            );
          },
        }),
        { headers: { 'Content-Type': 'multipart/x-mixed-replace; boundary=rony-frame' } },
      );
    });
    vi.stubGlobal('fetch', request);
    const camera = TestBed.inject(HttpCameraStream);
    const first = camera.watch().subscribe(received);
    const second = camera.watch().subscribe(received);
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]![1].credentials).toBe('same-origin');
    expect(request.mock.calls[1]![1]).toMatchObject({
      credentials: 'omit',
      redirect: 'error',
      headers: { Authorization: 'Camera ' + token },
    });
    expect(received).toHaveBeenCalledTimes(2);
    first.unsubscribe();
    expect(cameraSignal!.aborted).toBe(false);
    second.unsubscribe();
    expect(cameraSignal!.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
  });

  it('rejects credential URLs before sending a capability and backs off with snapshot fallback', async () => {
    const request = vi.fn().mockResolvedValue(
      Response.json({
        url: 'https://camera-api.example.invalid/api/v1/monitor/camera-stream?token=unsafe',
        token: 'c'.repeat(43),
      }),
    );
    vi.stubGlobal('fetch', request);
    const received = vi.fn();
    const subscription = TestBed.inject(HttpCameraStream).watch().subscribe(received);
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith(null);
    subscription.unsubscribe();
    await vi.advanceTimersByTimeAsync(5000);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
