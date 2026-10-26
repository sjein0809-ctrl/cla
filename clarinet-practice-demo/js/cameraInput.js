// 카메라로 3D 프린팅 모형의 색 스티커를 보고 키 입력을 만든다.
//  - 앞쪽 구멍(L1~L3, R1~R3): 형광 스티커가 보이면 열림, 손가락에 가려지면 누름
//  - 뒤쪽 키(T, R): 누르면 앞쪽 창으로 색 캡이 튀어나온다 -> 색이 보이면 누름
// 처음에 "위치 지정"으로 각 스티커/창을 화면에서 한 번씩 눌러 위치와 색을 알려준다 (localStorage 에 저장).
// 불기(BLOW)는 마이크로 바람 소리를 감지하거나 Space/화면 BLOW 키로 한다.

import { KEY } from "./fingering.js";

const PROC_W = 640; // 분석용 해상도 (가로)
const FRAME_MS = 50;
const STORE_KEY = "camSpots";
const BREATH_KEY = "camBreath";
const AUTO_KEY = "camAutoBlow";

// 위치 지정 순서. 앞쪽 6구멍만 필수이고 나머지는 건너뛸 수 있다 (T 를 건너뛰면 엄지는 항상 막은 것으로 친다)
// 옆 키들도 앞쪽 구멍처럼 스티커가 가려지면 누름이다
const STEPS = [
  { bit: KEY.L1, name: "L1", kind: "front" },
  { bit: KEY.L2, name: "L2", kind: "front" },
  { bit: KEY.L3, name: "L3", kind: "front" },
  { bit: KEY.R1, name: "R1", kind: "front" },
  { bit: KEY.R2, name: "R2", kind: "front" },
  { bit: KEY.R3, name: "R3", kind: "front" },
  { bit: KEY.T, name: "T", kind: "back" },
  { bit: KEY.REG, name: "R", kind: "back" },
  { bit: KEY.A, name: "A", kind: "front", optional: true },
  { bit: KEY.TG_GS, name: "G#", kind: "front", optional: true },
  { bit: KEY.EB_KEY, name: "Eb", kind: "front", optional: true },
  { bit: KEY.B_KEY, name: "B", kind: "front", optional: true },
  { bit: KEY.SIDE1, name: "S1", kind: "front", optional: true },
  { bit: KEY.SIDE2, name: "S2", kind: "front", optional: true },
  { bit: KEY.SIDE3, name: "S3", kind: "front", optional: true },
  { bit: KEY.SIDE4, name: "S4", kind: "front", optional: true },
  { bit: KEY.LP_CS, name: "LC#", kind: "front", optional: true },
  { bit: KEY.LP_FS, name: "LF#", kind: "front", optional: true },
  { bit: KEY.LP_E, name: "LE", kind: "front", optional: true },
  { bit: KEY.LP_F, name: "LF", kind: "front", optional: true },
  { bit: KEY.RP_GS, name: "RG#", kind: "front", optional: true },
  { bit: KEY.RP_FS, name: "RF#", kind: "front", optional: true },
  { bit: KEY.RP_F, name: "RF", kind: "front", optional: true },
  { bit: KEY.RP_E, name: "RE", kind: "front", optional: true },
];

// 같은 색인지: 밝기를 뺀 색 비율(chroma)로 비교해서 그림자에 덜 흔들리게 한다
const CHROMA_TOL = 0.075;
const MIN_SUM = 70;
const MIN_SAT = 0.35; // (가장 센 색 - 가장 약한 색) / 가장 센 색. 회색·흰색·검은 배경은 스티커로 안 친다

function saturated(r, g, b) {
  const mx = Math.max(r, g, b);
  return mx > 0 && (mx - Math.min(r, g, b)) / mx >= MIN_SAT;
}

function chroma(r, g, b) {
  const s = r + g + b;
  return [r / s, g / s, s];
}

function loadJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

export class CameraInput {
  // onChange(keysMask, blowing), tr(key, vars) = 번역 함수
  constructor(host, onChange, tr) {
    this.host = host;
    this.onChange = onChange;
    this.tr = tr;
    this.spots = loadJson(STORE_KEY, []);
    this.calibStep = -1; // -1: 위치 지정 중 아님
    this.stream = null;
    this.timer = null;
    this.keys = 0;
    this.breath = { on: true, thr: 40, ...loadJson(BREATH_KEY, {}) };
    this.blowing = false;
    // 자동 소리: 키가 하나라도 눌려 보이면 불기 없이 바로 소리 낸다 (손 인식 신스처럼)
    this.autoBlow = loadJson(AUTO_KEY, true);
    this.audio = null;
    this.render();
  }

  render() {
    this.host.innerHTML = `
      <div class="cam-view">
        <video playsinline muted></video>
        <canvas class="cam-overlay"></canvas>
      </div>
      <p class="cam-status"></p>
      <div class="cam-row">
        <button type="button" class="seg-btn cam-calib"></button>
        <button type="button" class="seg-btn cam-skip" hidden></button>
        <label class="cam-breath"><input type="checkbox" class="cam-auto-on"> <span class="cam-auto-label"></span></label>
        <label class="cam-breath"><input type="checkbox" class="cam-breath-on"> <span class="cam-breath-label"></span></label>
      </div>
      <div class="cam-breath-row">
        <div class="breath-meter"><div class="breath-bar"></div><div class="breath-mark"></div></div>
        <input type="range" class="breath-thr" min="5" max="95">
      </div>`;
    const q = (s) => this.host.querySelector(s);
    this.video = q("video");
    this.overlay = q(".cam-overlay");
    this.statusEl = q(".cam-status");
    this.calibBtn = q(".cam-calib");
    this.skipBtn = q(".cam-skip");
    this.breathOn = q(".cam-breath-on");
    this.breathBar = q(".breath-bar");
    this.breathMark = q(".breath-mark");
    this.breathThr = q(".breath-thr");
    this.proc = document.createElement("canvas");
    this.procCtx = this.proc.getContext("2d", { willReadFrequently: true });

    this.calibBtn.addEventListener("click", (e) => {
      e.currentTarget.blur();
      this.calibStep >= 0 ? this.finishCalib() : this.beginCalib();
    });
    this.skipBtn.addEventListener("click", (e) => {
      e.currentTarget.blur();
      this.nextCalibStep();
    });
    this.overlay.addEventListener("click", (e) => this.onOverlayClick(e));
    this.autoOn = q(".cam-auto-on");
    this.autoOn.checked = this.autoBlow;
    this.autoOn.addEventListener("change", () => {
      this.autoBlow = this.autoOn.checked;
      saveJson(AUTO_KEY, this.autoBlow);
    });
    this.breathOn.checked = this.breath.on;
    this.breathThr.value = this.breath.thr;
    this.breathOn.addEventListener("change", () => {
      this.breath.on = this.breathOn.checked;
      this.saveBreath();
      this.breath.on ? this.startBreath() : this.stopBreath();
    });
    this.breathThr.addEventListener("input", () => {
      this.breath.thr = Number(this.breathThr.value);
      this.breathMark.style.left = `${this.breath.thr}%`;
      this.saveBreath();
    });
    this.breathMark.style.left = `${this.breath.thr}%`;
    this.updateTexts();
  }

  saveBreath() {
    saveJson(BREATH_KEY, this.breath);
  }

  updateTexts() {
    this.calibBtn.textContent = this.tr(this.calibStep >= 0 ? "camCalibDone" : "camCalibBtn");
    this.skipBtn.textContent = this.tr("camSkip");
    this.host.querySelector(".cam-breath-label").textContent = this.tr("camBreath");
    this.host.querySelector(".cam-auto-label").textContent = this.tr("camAuto");
    this.setStatus();
  }

  setStatus(msg) {
    if (msg) {
      this.statusEl.textContent = msg;
      return;
    }
    if (this.calibStep >= 0) {
      const step = STEPS[this.calibStep];
      const key = step.kind === "back" ? "camCalibBack" : step.optional ? "camCalibSide" : "camCalibFront";
      this.statusEl.textContent = this.tr(key, { name: step.name });
    } else if (!this.spots.some((s) => s.kind === "front")) {
      this.statusEl.textContent = this.tr("camNeedCalib");
    } else {
      this.statusEl.textContent = this.tr("camReady");
    }
  }

  async start() {
    this.stop();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
    } catch (err) {
      this.setStatus(this.tr("camNoCamera"));
      return;
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    this.timer = setInterval(() => this.frame(), FRAME_MS);
    if (this.breath.on) this.startBreath();
    this.setStatus();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.stream) {
      this.stream.getTracks().forEach((tr) => tr.stop());
      this.stream = null;
    }
    this.stopBreath();
    this.calibStep = -1;
    this.keys = 0;
    this.blowing = false;
  }

  // ---------- 위치 지정 ----------
  beginCalib() {
    this.calibStep = 0;
    this.newSpots = [];
    this.skipBtn.hidden = true;
    this.updateTexts();
  }

  nextCalibStep() {
    if (this.calibStep < 0) return;
    this.calibStep++;
    if (this.calibStep >= STEPS.length) {
      this.finishCalib();
      return;
    }
    // 앞쪽 6개는 꼭 지정해야 하고, 뒤쪽 T/R 은 건너뛸 수 있다
    const step = STEPS[this.calibStep];
    this.skipBtn.hidden = !(step.optional || step.kind === "back");
    this.setStatus();
  }

  finishCalib() {
    if (this.newSpots && this.newSpots.some((s) => s.kind === "front")) {
      this.spots = this.newSpots;
      saveJson(STORE_KEY, this.spots);
    }
    this.newSpots = null;
    this.calibStep = -1;
    this.skipBtn.hidden = true;
    this.updateTexts();
  }

  onOverlayClick(e) {
    if (this.calibStep < 0 || !this.lastImage) return;
    const rect = this.overlay.getBoundingClientRect();
    // 화면은 거울처럼 좌우를 뒤집어 보여주므로 x 를 되돌린다
    const fx = 1 - (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const spot = this.measureSpot(Math.round(fx * this.proc.width), Math.round(fy * this.proc.height));
    if (!spot) {
      this.setStatus(this.tr("camNotFound"));
      return;
    }
    const step = STEPS[this.calibStep];
    this.newSpots.push({ ...spot, bit: step.bit, name: step.name, kind: step.kind, on: step.kind === "front" ? false : true });
    this.nextCalibStep();
  }

  // 누른 자리의 색을 기준색으로 잡고, 주변에서 같은 색 덩어리의 중심과 크기를 찾는다
  measureSpot(cx, cy) {
    const { data, width, height } = this.lastImage;
    let rs = 0, gs = 0, bs = 0, n = 0;
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; n++;
      }
    }
    if (!n) return null;
    const [cr, cg, sum] = chroma(rs / n, gs / n, bs / n);
    if (sum < MIN_SUM || !saturated(rs / n, gs / n, bs / n)) return null;
    const ref = [cr, cg];
    const blob = this.findBlob(cx, cy, 30, ref);
    // 너무 작으면 잡음, 찾는 범위를 거의 다 채우면 스티커가 아니라 넓은 색 면
    if (blob.count < 6 || blob.count > Math.PI * 30 * 30 * 0.7) return null;
    const r = Math.max(3, Math.min(25, Math.sqrt(blob.count / Math.PI) * 0.8));
    return { x: blob.x, y: blob.y, r, ref };
  }

  // (cx,cy) 주변 반경 rad 안에서 기준색과 같은 픽셀 수와 중심
  findBlob(cx, cy, rad, ref) {
    const { data, width, height } = this.lastImage;
    let count = 0, sx = 0, sy = 0;
    const x0 = Math.max(0, Math.round(cx - rad)), x1 = Math.min(width - 1, Math.round(cx + rad));
    const y0 = Math.max(0, Math.round(cy - rad)), y1 = Math.min(height - 1, Math.round(cy + rad));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const s = r + g + b;
        if (s < MIN_SUM || !saturated(r, g, b)) continue;
        if (Math.abs(r / s - ref[0]) + Math.abs(g / s - ref[1]) > CHROMA_TOL) continue;
        count++; sx += x; sy += y;
      }
    }
    return { count, x: count ? sx / count : cx, y: count ? sy / count : cy };
  }

  // ---------- 매 프레임 ----------
  frame() {
    const v = this.video;
    if (!v.videoWidth) return;
    const w = PROC_W;
    const h = Math.round((v.videoHeight / v.videoWidth) * w);
    if (this.proc.width !== w || this.proc.height !== h) {
      this.proc.width = w; this.proc.height = h;
      this.overlay.width = w; this.overlay.height = h;
    }
    this.procCtx.drawImage(v, 0, 0, w, h);
    this.lastImage = this.procCtx.getImageData(0, 0, w, h);

    let keys = 0;
    if (this.calibStep < 0) {
      this.track();
      for (const s of this.spots) if (s.on) keys |= 1 << s.bit;
    }
    const seen = keys; // 카메라가 실제로 본 키 (엄지 기본값 제외)
    if (this.calibStep < 0 && !this.spots.some((s) => s.bit === KEY.T)) keys |= 1 << KEY.T; // 엄지 위치를 안 정했으면 항상 막음
    this.keys = keys;
    this.updateBreath();
    this.drawOverlay();
    // 자동 소리: 손가락이 모형에 하나라도 올라가 있으면 분다고 친다 (아무 키도 안 누르는 솔4 만은 마이크/Space 로)
    const auto = this.autoBlow && seen !== 0;
    this.onChange(this.keys, this.blowing || auto);
  }

  // 스티커마다 가장 가까운 다른 스티커까지 거리 (찾는 범위가 이웃 스티커까지 넘어가지 않게)
  neighborDist(s) {
    let best = Infinity;
    for (const o of this.spots) if (o !== s) best = Math.min(best, Math.hypot(o.x - s.x, o.y - s.y));
    return best;
  }

  // 매 프레임: 모형이 움직인 만큼 모든 점을 같이 옮기고, 점마다 보임/가림을 판정한다
  track() {
    const PRESS_FRAMES = 3;   // 이만큼 연속으로 가려져야 누름 (약 0.15초)
    const RELEASE_FRAMES = 2; // 이만큼 연속으로 보여야 뗌
    const shifts = [];
    for (const s of this.spots) {
      const area = Math.PI * s.r * s.r;
      // 원래 자리 주변을 넓게 찾되, 이웃 스티커의 절반 거리까지만
      const search = Math.max(s.r * 1.2, Math.min(s.r * 3, this.neighborDist(s) * 0.45));
      const blob = this.findBlob(s.x, s.y, search, s.ref);
      s.seen = blob.count >= area * 0.45 ? 1 : blob.count < area * 0.18 ? -1 : 0; // 1 보임, -1 안 보임, 0 애매
      s.blob = blob;
      // 거의 다 보이는 앞쪽 스티커만 모형 이동량 계산에 쓴다
      if (s.kind === "front" && blob.count >= area * 0.6) shifts.push([blob.x - s.x, blob.y - s.y]);
    }
    // 모형 전체 이동량 = 보이는 스티커들 이동량의 중앙값. 가려진 스티커도 같이 옮긴다
    if (shifts.length) {
      const med = (arr) => arr.sort((p, q) => p - q)[arr.length >> 1];
      const dx = med(shifts.map((v) => v[0])), dy = med(shifts.map((v) => v[1]));
      for (const s of this.spots) {
        s.x += dx * 0.6;
        s.y += dy * 0.6;
      }
    }
    for (const s of this.spots) {
      // 잘 보이는 스티커는 자기 자리로 조금 더 맞춘다
      if (s.seen === 1 && s.kind === "front") {
        s.x += (s.blob.x - s.x) * 0.3;
        s.y += (s.blob.y - s.y) * 0.3;
      }
      // 앞쪽/옆 키: 안 보이면 누름. 뒤쪽 키 창: 보이면 누름
      const pressedNow = s.kind === "front" ? s.seen === -1 : s.seen === 1;
      const releasedNow = s.kind === "front" ? s.seen === 1 : s.seen === -1;
      s.pressCount = pressedNow ? (s.pressCount || 0) + 1 : 0;
      s.releaseCount = releasedNow ? (s.releaseCount || 0) + 1 : 0;
      if (!s.on && s.pressCount >= PRESS_FRAMES) s.on = true;
      if (s.on && s.releaseCount >= RELEASE_FRAMES) s.on = false;
    }
  }

  drawOverlay() {
    const ctx = this.overlay.getContext("2d");
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    const spots = this.calibStep >= 0 ? this.newSpots || [] : this.spots;
    ctx.lineWidth = 3;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    for (const s of spots) {
      const pressed = this.calibStep < 0 && s.on;
      ctx.strokeStyle = pressed ? "#ff9f6f" : "#4fd18b";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r + 4, 0, Math.PI * 2);
      ctx.stroke();
      // 화면이 거울처럼 뒤집혀 보이므로 글자만 다시 뒤집어 그린다
      ctx.save();
      ctx.translate(s.x, s.y - s.r - 9);
      ctx.scale(-1, 1);
      ctx.fillStyle = pressed ? "#ff9f6f" : "#ffffff";
      ctx.fillText(s.name, 0, 0);
      ctx.restore();
    }
  }

  // ---------- 마이크 불기 감지 ----------
  async startBreath() {
    if (this.audio || !this.breath.on) return;
    try {
      // 잡음 제거를 켜면 바람 소리가 지워지므로 끈다. 스피커 소리 되울림은 줄인다
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      // 바람 소리는 높은 대역에 넓게 퍼져 있다. 앱이 내는 음(대부분 1.5kHz 아래)은 걸러낸다
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800;
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(hp).connect(an);
      this.audio = { ctx, stream, an, buf: new Float32Array(an.fftSize) };
    } catch (_) {
      this.audio = null;
    }
  }

  stopBreath() {
    if (!this.audio) return;
    this.audio.stream.getTracks().forEach((tr) => tr.stop());
    this.audio.ctx.close();
    this.audio = null;
    this.blowing = false;
    if (this.breathBar) this.breathBar.style.width = "0%";
  }

  updateBreath() {
    if (!this.audio) {
      this.blowing = false;
      return;
    }
    const { an, buf } = this.audio;
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const level = Math.min(100, Math.sqrt(rms) * 200);
    this.breathBar.style.width = `${level}%`;
    // 켜질 때와 꺼질 때 기준을 달리해서 깜빡이지 않게
    if (level > this.breath.thr) this.blowing = true;
    else if (level < this.breath.thr * 0.7) this.blowing = false;
    this.breathBar.classList.toggle("on", this.blowing);
  }
}
