// 손 모양 입력: 웹캠으로 손가락을 인식해서 키 입력을 만든다 (모형·스티커 없이).
// 구글 MediaPipe 손 인식(Hand Landmarker)으로 손마다 21개 마디 위치를 받고, 손가락이 구부러졌는지 본다.
//   왼손 검지·중지·약지 = L1 L2 L3, 오른손 검지·중지·약지 = R1 R2 R3
//   왼손 새끼 = 레지스터 키(R), 오른손 새끼 = 오른손 새끼 E 키
//   엄지 구멍(T)은 항상 막은 것으로 친다. 손가락을 하나라도 구부리면 불기 없이 바로 소리 난다.

import { KEY } from "./fingering.js";

const MP_VERSION = "0.10.14";
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const SENS_KEY = "handSensitivity";

// 손가락: [끝 마디, 가운데 마디, 뿌리 마디] 번호 (MediaPipe 손 마디 번호)
const FINGERS = {
  index: [8, 6, 5],
  middle: [12, 10, 9],
  ring: [16, 14, 13],
  pinky: [20, 18, 17],
};
const MAP = {
  left: { index: KEY.L1, middle: KEY.L2, ring: KEY.L3, pinky: KEY.REG },
  right: { index: KEY.R1, middle: KEY.R2, ring: KEY.R3, pinky: KEY.RP_E },
};
const LABELS = {
  [KEY.L1]: "L1", [KEY.L2]: "L2", [KEY.L3]: "L3", [KEY.REG]: "R",
  [KEY.R1]: "R1", [KEY.R2]: "R2", [KEY.R3]: "R3", [KEY.RP_E]: "E",
};

let landmarkerPromise = null;

function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      const make = (delegate) =>
        vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numHands: 2,
        });
      try {
        return await make("GPU");
      } catch (_) {
        return await make("CPU");
      }
    })();
    landmarkerPromise.catch(() => (landmarkerPromise = null));
  }
  return landmarkerPromise;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class HandInput {
  // onChange(keysMask, blowing), tr(key, vars) = 번역 함수
  constructor(host, onChange, tr) {
    this.host = host;
    this.onChange = onChange;
    this.tr = tr;
    this.stream = null;
    this.raf = 0;
    this.landmarker = null;
    this.pressed = new Set(); // 지금 눌린 키 비트
    this.hands = [];
    let sens = 50;
    try {
      sens = Number(localStorage.getItem(SENS_KEY)) || 50;
    } catch (_) {}
    this.sensitivity = sens;
    this.render();
  }

  render() {
    this.host.innerHTML = `
      <div class="cam-view">
        <video playsinline muted></video>
        <canvas class="cam-overlay"></canvas>
      </div>
      <p class="cam-status"></p>
      <p class="hand-map"></p>
      <div class="cam-breath-row">
        <span class="hand-sens-label"></span>
        <input type="range" class="hand-sens" min="10" max="90">
      </div>`;
    const q = (s) => this.host.querySelector(s);
    this.video = q("video");
    this.overlay = q(".cam-overlay");
    this.statusEl = q(".cam-status");
    this.sensEl = q(".hand-sens");
    this.sensEl.value = this.sensitivity;
    this.sensEl.addEventListener("input", () => {
      this.sensitivity = Number(this.sensEl.value);
      try {
        localStorage.setItem(SENS_KEY, String(this.sensitivity));
      } catch (_) {}
    });
    this.updateTexts();
  }

  updateTexts() {
    this.host.querySelector(".hand-map").textContent = this.tr("handMap");
    this.host.querySelector(".hand-sens-label").textContent = this.tr("handSens");
    if (!this.statusMsg) this.setStatus(this.tr("handLoading"));
  }

  setStatus(msg) {
    this.statusMsg = msg;
    this.statusEl.textContent = msg;
  }

  async start() {
    this.stop();
    this.setStatus(this.tr("handLoading"));
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
    } catch (_) {
      this.setStatus(this.tr("camNoCamera"));
      return;
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    try {
      this.landmarker = await loadLandmarker();
    } catch (_) {
      this.setStatus(this.tr("handLoadFail"));
      return;
    }
    if (!this.stream) return; // 불러오는 사이에 화면을 나감
    this.setStatus(this.tr("handReady"));
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.pressed.clear();
    this.hands = [];
  }

  frame() {
    const v = this.video;
    if (!v.videoWidth || !this.landmarker || v.currentTime === this.lastTime) return;
    this.lastTime = v.currentTime;
    let res;
    try {
      res = this.landmarker.detectForVideo(v, performance.now());
    } catch (_) {
      return;
    }
    this.process(res.landmarks || [], res.handedness || []);
    this.draw(v.videoWidth, v.videoHeight);
  }

  // 손마다 왼손/오른손을 정하고 손가락이 구부러졌는지 판정한다 (시험용으로 바로 불러도 된다)
  process(landmarks, handedness) {
    // 화면(카메라 원본)에서 오른쪽에 보이는 손이 사용자의 왼손이다
    const hands = landmarks.map((lm, i) => {
      const label = handedness[i]?.[0]?.categoryName;
      return { lm, x: lm[0].x, label };
    });
    if (hands.length === 2) {
      hands.sort((a, b) => b.x - a.x);
      hands[0].side = "left";
      hands[1].side = "right";
    } else if (hands.length === 1) {
      // MediaPipe 는 거울 화면 기준으로 왼/오른손을 붙이므로 원본 영상에서는 반대다
      const h = hands[0];
      h.side = h.label ? (h.label === "Left" ? "right" : "left") : h.x > 0.5 ? "left" : "right";
    }

    // 민감도: 높을수록 조금만 구부려도 누름
    const pressAt = 1.15 + (this.sensitivity / 100) * 0.6; // 끝-손목 / 뿌리-손목 비율이 이보다 작으면 누름
    const releaseAt = pressAt + 0.15;
    const next = new Set();
    for (const h of hands) {
      h.curled = {};
      const wrist = h.lm[0];
      for (const [name, [tip, , mcp]] of Object.entries(FINGERS)) {
        const bit = MAP[h.side][name];
        const ratio = dist(h.lm[tip], wrist) / Math.max(1e-6, dist(h.lm[mcp], wrist));
        const was = this.pressed.has(bit);
        const on = was ? ratio < releaseAt : ratio < pressAt;
        h.curled[name] = on;
        if (on) next.add(bit);
      }
    }
    this.pressed = next;
    this.hands = hands;

    let keys = 1 << KEY.T; // 엄지는 항상 막음
    for (const bit of next) keys |= 1 << bit;
    // 손가락을 하나라도 구부리면 분다고 친다
    this.onChange(keys >>> 0, next.size > 0);
    if (this.landmarker) this.setStatus(hands.length ? this.tr("handReady") : this.tr("handNone"));
  }

  draw(w, h) {
    const c = this.overlay;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    for (const hand of this.hands) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (const p of hand.lm) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [name, [tip]] of Object.entries(FINGERS)) {
        const bit = MAP[hand.side][name];
        const on = hand.curled[name];
        const p = hand.lm[tip];
        ctx.strokeStyle = on ? "#ff9f6f" : "#4fd18b";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 16, 0, Math.PI * 2);
        ctx.stroke();
        // 화면을 거울처럼 뒤집어 보여주므로 글자만 다시 뒤집어 그린다
        ctx.save();
        ctx.translate(p.x * w, p.y * h - 26);
        ctx.scale(-1, 1);
        ctx.fillStyle = on ? "#ff9f6f" : "#ffffff";
        ctx.fillText(LABELS[bit], 0, 0);
        ctx.restore();
      }
    }
  }
}
