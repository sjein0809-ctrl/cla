// 마이크 입력에서 자기상관(autocorrelation) 방식으로 기본 주파수(음높이)를 추출한다.

const BUFFER_SIZE = 2048;
const RMS_THRESHOLD = 0.01; // 이보다 작은 소리는 무시(무음 처리)

export class PitchDetector {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.buffer = new Float32Array(BUFFER_SIZE);
    this.running = false;
  }

  async start(onFrame) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = BUFFER_SIZE;
    this.source.connect(this.analyser);

    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.analyser.getFloatTimeDomainData(this.buffer);
      let rms = 0;
      for (let i = 0; i < this.buffer.length; i++) rms += this.buffer[i] * this.buffer[i];
      rms = Math.sqrt(rms / this.buffer.length);
      const freq = this._autoCorrelate(this.buffer, this.audioContext.sampleRate);
      onFrame(freq, rms);
      this._rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.audioContext) this.audioContext.close();
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }

  // 표준 자기상관 알고리즘. 신뢰도 있는 주파수를 못 찾으면 -1 반환.
  _autoCorrelate(buf, sampleRate) {
    const size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / size);
    if (rms < RMS_THRESHOLD) return -1;

    // 앞뒤 무음 구간 잘라내기
    let start = 0;
    let end = size - 1;
    const trimThreshold = 0.2;
    while (start < size && Math.abs(buf[start]) < trimThreshold) start++;
    while (end > start && Math.abs(buf[end]) < trimThreshold) end--;
    const trimmed = buf.slice(start, end + 1);
    const n = trimmed.length;
    if (n < 512) return -1;

    const c = new Array(n).fill(0);
    for (let lag = 0; lag < n; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) sum += trimmed[i] * trimmed[i + lag];
      c[lag] = sum;
    }

    let d = 0;
    while (d < n - 1 && c[d] > c[d + 1]) d++;

    let maxVal = -1;
    let maxPos = -1;
    for (let i = d; i < n; i++) {
      if (c[i] > maxVal) {
        maxVal = c[i];
        maxPos = i;
      }
    }
    if (maxPos <= 0) return -1;

    // 포물선 보간으로 정밀도 향상
    let T0 = maxPos;
    const x1 = c[T0 - 1] || 0;
    const x2 = c[T0] || 0;
    const x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    if (T0 <= 0) return -1;
    const freq = sampleRate / T0;
    if (freq < 60 || freq > 2000) return -1; // 연습 대상 악기들의 실용 음역 밖이면 무시
    return freq;
  }
}
