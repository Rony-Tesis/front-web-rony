/** Incremental Content-Length parser. Drop intermediate frames in a buffered network chunk. */
export class MjpegDecoder {
  private buffer = new Uint8Array();
  private expected: number | null = null;

  push(chunk: Uint8Array): Uint8Array | undefined {
    if (this.buffer.length + chunk.length > 1048576) throw new Error('Camera buffer exceeded');
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    this.buffer = combined;
    let latest: Uint8Array | undefined;
    while (true) {
      if (this.expected === null) {
        let end = -1;
        for (let i = 0; i + 3 < this.buffer.length; i++) {
          if (
            this.buffer[i] === 13 &&
            this.buffer[i + 1] === 10 &&
            this.buffer[i + 2] === 13 &&
            this.buffer[i + 3] === 10
          ) {
            end = i;
            break;
          }
        }
        if (end < 0) {
          if (this.buffer.length > 2048) throw new Error('Invalid camera headers');
          break;
        }
        if (end > 2048) throw new Error('Invalid camera headers');
        const headers = new TextDecoder().decode(this.buffer.subarray(0, end));
        const length = /^Content-Length:\s*(\d+)\s*$/im.exec(headers);
        if (!/^Content-Type:\s*image\/jpeg\s*$/im.test(headers) || !length) {
          throw new Error('Invalid camera frame');
        }
        const expected = Number(length[1]);
        if (expected < 4 || expected > 300000) throw new Error('Invalid camera size');
        this.expected = expected;
        this.buffer = this.buffer.slice(end + 4);
      }
      if (this.buffer.length < this.expected) break;
      latest = this.buffer.slice(0, this.expected);
      if (latest[0] !== 255 || latest[1] !== 216 || latest.at(-2) !== 255 || latest.at(-1) !== 217)
        throw new Error('Invalid JPEG');
      this.buffer = this.buffer.slice(this.expected);
      this.expected = null;
    }
    return latest;
  }
}
