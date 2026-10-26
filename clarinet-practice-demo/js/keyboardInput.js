// 컴퓨터 키보드(또는 화면의 키/모형)로 클라리넷 운지를 입력받는다.
// 두 가지 방식:
//   toggle: 한 번 누르면 켜지고 다시 누르면 꺼진다.
//   hold  : 누르고 있는 동안만 켜진다.
//           Shift 를 누르면 지금 누르고 있는 키가 잠겨서 손을 떼도 켜져 있다
//           (키보드가 한 번에 6개쯤만 인식하는 한계를 피하는 용도).
//           잠긴 키를 다시 누르면 풀리고, 아무 키도 안 누른 채 Shift 를 누르면 전부 풀린다.
// 30ms마다 onTick(악보 음 MIDI 또는 -1, 불고 있는지)를 호출한다.

import { KEY_DEFS, BLOW_BIT, KEY_MASK, lookupMidi } from "./fingering.js";
import { midiToFrequency } from "./noteUtils.js";
import { buildClarinet } from "./clarinetDiagram.js";

const TICK_MS = 30;

export class KeyboardInput {
  constructor(panelEl, clarinetEl) {
    this.panelEl = panelEl;
    this.clarinetEl = clarinetEl;
    this.diagram = null;
    this.mode = "toggle";
    this.state = 0; // 켜져 있는 키 비트마스크
    this.locked = 0; // Shift 로 잠근 키 비트마스크 (hold 모드)
    this.boardActive = false; // USB 보드가 연결돼 있으면 보드의 버튼 상태가 그대로 state 가 된다
    this.boardState = 0;
    this.hint = 0; // 모형에 표시할 운지 힌트 (연습 모드)
    this.extKeys = 0; // 카메라가 본 키 (키보드 입력에 더해진다)
    this.extBlow = false; // 마이크로 감지한 불기
    this.pointerHeld = new Set(); // 마우스/터치로 누르고 있는 키 (hold 모드)
    this.caps = new Map(); // bit -> button
    this.timer = null;
    this.audio = null;
    this.osc = null;
    this.gain = null;
    this.running = false;
    this.onKeyDown = (e) => this.handleKey(e, true);
    this.onKeyUp = (e) => this.handleKey(e, false);
    this.onBlur = () => {
      if (this.mode === "hold") this.clear();
    };
  }

  setMode(mode) {
    this.mode = mode === "hold" ? "hold" : "toggle";
    this.pointerHeld.clear();
    this.clear();
  }

  start(onTick, getTransposition) {
    this.stop();
    this.running = true;
    this.onTick = onTick;
    this.getTransposition = getTransposition;

    this.state = 0;
    this.renderPanel();

    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audio = new Ctx();
    this.osc = this.audio.createOscillator();
    this.osc.type = "triangle";
    this.gain = this.audio.createGain();
    this.gain.gain.value = 0;
    this.osc.connect(this.gain).connect(this.audio.destination);
    this.osc.start();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    if (this.osc) {
      try { this.osc.stop(); } catch (_) {}
      this.osc = null;
    }
    if (this.audio) {
      this.audio.close();
      this.audio = null;
    }
    this.gain = null;
  }

  // 켜진 키를 전부 끈다
  clear() {
    this.state = this.boardActive ? this.boardState : 0;
    this.locked = 0;
    this.refreshPanel();
  }

  // 음 하나를 판정한 뒤 호출. 토글 모드에서만 켜둔 키를 풀어준다.
  // (꾹 누르기 모드는 손가락이 아직 눌려 있을 수 있어서 건드리지 않음)
  clearAfterNote() {
    if (this.mode === "toggle") this.clear();
  }

  // 보드에서 받은 버튼 상태(BLOW 포함). active=false 면 보드 연결이 끊긴 것.
  setBoardState(raw, active = true) {
    this.boardActive = active;
    this.boardState = active ? raw >>> 0 : 0;
    this.locked = 0;
    this.state = this.boardState;
    this.refreshPanel();
  }

  // 카메라 입력: 키와 불기를 키보드 상태에 더한다
  setExternal(keys, blow) {
    if (keys === this.extKeys && blow === this.extBlow) return;
    this.extKeys = keys >>> 0;
    this.extBlow = !!blow;
    this.refreshPanel();
  }

  effectiveState() {
    return (this.state | this.extKeys | (this.extBlow ? 1 << BLOW_BIT : 0)) >>> 0;
  }

  setHint(mask) {
    this.hint = mask > 0 ? mask : 0;
    this.refreshPanel();
  }

  setBit(bit, on) {
    this.state = (on ? this.state | (1 << bit) : this.state & ~(1 << bit)) >>> 0;
    this.refreshPanel();
  }

  press(bit) {
    if (this.mode === "toggle") {
      this.setBit(bit, !(this.state & (1 << bit)));
    } else {
      this.locked = (this.locked & ~(1 << bit)) >>> 0; // 잠긴 키를 다시 누르면 잠금 해제
      this.setBit(bit, true);
    }
  }

  release(bit) {
    if (this.mode !== "hold" || this.locked & (1 << bit)) return;
    this.setBit(bit, false);
  }

  // hold 모드에서 Shift: 누르고 있는 운지 키를 잠근다. 새로 잠글 키가 없으면 전부 푼다.
  lockHeld() {
    if (this.mode !== "hold") return;
    const held = this.state & KEY_MASK & ~this.locked;
    if (held) {
      this.locked = (this.locked | held) >>> 0;
    } else {
      this.state = (this.state & ~this.locked) >>> 0;
      this.locked = 0;
    }
    this.refreshPanel();
  }

  // 마우스/터치 입력 (모형, 화면 키 공통)
  pointerPress(bit) {
    this.press(bit);
    if (this.mode === "hold") this.pointerHeld.add(bit);
  }

  pointerRelease(bit) {
    if (!this.pointerHeld.has(bit)) return;
    this.pointerHeld.delete(bit);
    this.release(bit);
  }

  handleKey(e, down) {
    if (!this.running) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (document.querySelector(".overlay.active")) return;
    if (e.key === "Shift") {
      if (down && !e.repeat) this.lockHeld();
      return;
    }
    const def = KEY_DEFS.find((d) => d.code === e.code);
    if (!def) return;
    e.preventDefault();
    if (down) {
      if (e.repeat) return;
      this.press(def.bit);
    } else {
      this.release(def.bit);
    }
  }

  renderPanel() {
    this.diagram = buildClarinet(
      this.clarinetEl,
      (bit) => this.pointerPress(bit),
      (bit) => this.pointerRelease(bit)
    );
    this.panelEl.innerHTML = "";
    this.caps.clear();
    KEY_DEFS.forEach((def) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keycap" + (def.bit === BLOW_BIT ? " keycap--blow" : "");
      btn.innerHTML = `<span class="keycap-key">${def.key}</span><span class="keycap-name">${def.name}</span>`;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault(); // 포커스가 버튼으로 가서 Space가 다시 눌리는 일 방지
        this.pointerPress(def.bit);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
        btn.addEventListener(ev, () => this.pointerRelease(def.bit))
      );
      this.panelEl.appendChild(btn);
      this.caps.set(def.bit, btn);
    });
    this.refreshPanel();
  }

  refreshPanel() {
    const state = this.effectiveState();
    if (this.diagram) this.diagram.update(state, this.hint);
    this.caps.forEach((btn, bit) => {
      btn.classList.toggle("down", (state & (1 << bit)) !== 0);
      btn.classList.toggle("latched", (this.locked & (1 << bit)) !== 0);
      btn.classList.toggle("hint", (this.hint & (1 << bit)) !== 0);
    });
  }

  tick() {
    const state = this.effectiveState();
    const blowing = (state & (1 << BLOW_BIT)) !== 0;
    const midi = blowing ? lookupMidi(state & KEY_MASK) : -1;
    this.updateSound(midi);
    this.onTick(midi, blowing);
  }

  updateSound(midi) {
    if (!this.audio || !this.gain) return;
    const now = this.audio.currentTime;
    if (midi >= 0) {
      const concert = midi - this.getTransposition();
      this.osc.frequency.setTargetAtTime(midiToFrequency(concert), now, 0.005);
      this.gain.gain.setTargetAtTime(0.12, now, 0.01);
    } else {
      this.gain.gain.setTargetAtTime(0, now, 0.02);
    }
  }
}
