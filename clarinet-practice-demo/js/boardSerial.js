// 운지 버튼 보드(Arduino)와 USB 시리얼(Web Serial)로 연결해 버튼 상태를 받는다.
// 보드는 버튼 상태가 바뀔 때마다 "K <16진수>" 한 줄을 보낸다 (비트 번호는 fingering.js 와 같음, 27 = BLOW).
// Web Serial 은 컴퓨터용 Chrome/Edge 에서만 된다.

const BAUD = 115200;

export const boardSupported = "serial" in navigator;

// "K 8F" -> 0x8F. 다른 줄(도움말, 로그)은 -1.
export function parseBoardLine(line) {
  const m = /^K ([0-9A-Fa-f]{1,8})$/.exec(line.trim());
  return m ? parseInt(m[1], 16) : -1;
}

export class BoardSerial {
  constructor(onState, onStatus) {
    this.onState = onState;
    this.onStatus = onStatus; // (connected: boolean)
    this.port = null;
    this.reader = null;
    this.connected = false;
    this.lastState = 0;
  }

  async connect() {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: BAUD });
    this.port = port;
    this.connected = true;
    this.lastState = 0;
    this.onStatus(true);
    this.readLoop();
  }

  async disconnect() {
    if (this.reader) {
      try { await this.reader.cancel(); } catch (_) {}
    }
  }

  async readLoop() {
    const decoder = new TextDecoder();
    let buf = "";
    try {
      this.reader = this.port.readable.getReader();
      for (;;) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          const state = parseBoardLine(line);
          if (state < 0) continue;
          this.lastState = state;
          this.onState(state);
        }
      }
    } catch (_) {
      // 케이블이 뽑힌 경우 등
    }
    try { this.reader.releaseLock(); } catch (_) {}
    try { await this.port.close(); } catch (_) {}
    this.reader = null;
    this.port = null;
    this.connected = false;
    this.lastState = 0;
    this.onStatus(false);
  }
}
