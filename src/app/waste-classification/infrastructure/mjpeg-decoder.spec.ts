import { MjpegDecoder } from './mjpeg-decoder';

const jpeg = (value: number) => new Uint8Array([255, 216, value, 255, 217]);
function packet(value: number): Uint8Array {
  const headers = new TextEncoder().encode(
    '--rony-frame\r\nContent-Type: image/jpeg\r\nContent-Length: 5\r\n\r\n',
  );
  return new Uint8Array([...headers, ...jpeg(value), 13, 10]);
}

describe('Incremental camera transport', () => {
  it('decodes headers and payload split at every possible network boundary', () => {
    const bytes = packet(7);
    for (let split = 1; split < bytes.length; split++) {
      const parser = new MjpegDecoder();
      const frames = [parser.push(bytes.slice(0, split)), parser.push(bytes.slice(split))].filter(
        Boolean,
      );
      expect(frames).toEqual([jpeg(7)]);
    }
  });

  it('discards older buffered pictures and keeps the latest, without a playback queue', () => {
    const parser = new MjpegDecoder();
    expect(parser.push(new Uint8Array([...packet(1), ...packet(2), ...packet(3)]))).toEqual(
      jpeg(3),
    );
    expect(parser.push(packet(4))).toEqual(jpeg(4));
  });

  it('bounds memory and rejects oversized frames, invalid JPEGs and incomplete headers', () => {
    expect(() => new MjpegDecoder().push(new Uint8Array(1048577))).toThrow();
    const oversized = new TextEncoder().encode(
      '--rony-frame\r\nContent-Type: image/jpeg\r\nContent-Length: 300001\r\n\r\n',
    );
    expect(() => new MjpegDecoder().push(oversized)).toThrow();
    const bad = packet(1);
    bad[bad.length - 3] = 0;
    expect(() => new MjpegDecoder().push(bad)).toThrow();
    expect(() => new MjpegDecoder().push(new Uint8Array(2049))).toThrow();
  });
});
