// 클라리넷 운지표 (clarinet_buttons.ino 의 DEFAULTS 와 같은 내용)
// 눌린 키 조합(비트마스크) -> 악보에 적히는 음(MIDI 번호)

export const KEY = {
  T: 0,
  L1: 1, L2: 2, L3: 3,
  R1: 4, R2: 5, R3: 6,
  REG: 7,
  A: 8,
  LP_CS: 9, LP_E: 10, LP_F: 11, LP_FS: 12,
  RP_E: 13, RP_F: 14, RP_FS: 15, RP_GS: 16,
  SIDE4: 17,
  SIDE1: 18, SIDE2: 19, SIDE3: 20,
  B_KEY: 21,
  EB_KEY: 22,
  TG_GS: 23, // 목(throat) G# 키 — 운지표에서 G# 단독으로 쓰는 키
};
export const BLOW_BIT = 27; // 키는 0~26번(최대 27개), 27번이 BLOW
export const KEY_MASK = (1 << 27) - 1;
const REGISTER_KEY_OFFSET = 19;

// 컴퓨터 키보드 배치: 왼손 S D F + 엄지 V/B, 오른손 J K L, 윗줄 Q W E R / U I O P 는 새끼손가락 키
export const KEY_DEFS = [
  { bit: KEY.T, code: "KeyV", key: "V", name: "T" },
  { bit: KEY.REG, code: "KeyB", key: "B", name: "REG" },
  { bit: KEY.L1, code: "KeyF", key: "F", name: "L1" },
  { bit: KEY.L2, code: "KeyD", key: "D", name: "L2" },
  { bit: KEY.L3, code: "KeyS", key: "S", name: "L3" },
  { bit: KEY.A, code: "KeyG", key: "G", name: "A" },
  { bit: KEY.R1, code: "KeyJ", key: "J", name: "R1" },
  { bit: KEY.R2, code: "KeyK", key: "K", name: "R2" },
  { bit: KEY.R3, code: "KeyL", key: "L", name: "R3" },
  { bit: KEY.SIDE4, code: "KeyH", key: "H", name: "S4" },
  { bit: KEY.LP_CS, code: "KeyQ", key: "Q", name: "LP C#" },
  { bit: KEY.LP_E, code: "KeyW", key: "W", name: "LP E" },
  { bit: KEY.LP_F, code: "KeyE", key: "E", name: "LP F" },
  { bit: KEY.LP_FS, code: "KeyR", key: "R", name: "LP F#" },
  { bit: KEY.RP_E, code: "KeyU", key: "U", name: "RP E" },
  { bit: KEY.RP_F, code: "KeyI", key: "I", name: "RP F" },
  { bit: KEY.RP_FS, code: "KeyO", key: "O", name: "RP F#" },
  { bit: KEY.RP_GS, code: "KeyP", key: "P", name: "RP G#" },
  { bit: KEY.SIDE1, code: "Digit1", key: "1", name: "S1" },
  { bit: KEY.SIDE2, code: "Digit2", key: "2", name: "S2" },
  { bit: KEY.SIDE3, code: "Digit3", key: "3", name: "S3" },
  { bit: KEY.B_KEY, code: "KeyZ", key: "Z", name: "B" },
  { bit: KEY.EB_KEY, code: "KeyX", key: "X", name: "Eb" },
  { bit: KEY.TG_GS, code: "KeyC", key: "C", name: "TG#" },
  { bit: BLOW_BIT, code: "Space", key: "Space", name: "BLOW" },
];

const m = (...bits) => bits.reduce((acc, b) => acc | (1 << b), 0);

const HOLES = m(KEY.T, KEY.L1, KEY.L2, KEY.L3, KEY.R1, KEY.R2, KEY.R3);
const LEFT3 = m(KEY.T, KEY.L1, KEY.L2, KEY.L3);

// [키 조합, midi]. 운지표 그림의 "Basic." 운지 (E3 ~ G6)
const TABLE = [
  [HOLES | m(KEY.LP_E), 52],
  [HOLES | m(KEY.RP_E), 52],
  [HOLES | m(KEY.LP_F), 53],
  [HOLES | m(KEY.RP_F), 53],
  [HOLES | m(KEY.LP_FS), 54],
  [HOLES | m(KEY.RP_FS), 54],
  [HOLES, 55],
  [HOLES | m(KEY.RP_GS), 56],
  [HOLES | m(KEY.LP_CS), 56],
  [LEFT3 | m(KEY.R1, KEY.R2), 57],
  [LEFT3 | m(KEY.R1), 58],
  [LEFT3 | m(KEY.R2), 59],
  [LEFT3, 60],
  [LEFT3 | m(KEY.LP_CS), 61],
  [m(KEY.T, KEY.L1, KEY.L2), 62],
  [m(KEY.T, KEY.L1, KEY.L2, KEY.SIDE4), 63],
  [m(KEY.T, KEY.L1), 64],
  [m(KEY.T), 65],
  [m(KEY.L1), 66],
  [0, 67],
  [m(KEY.TG_GS), 68], // 솔#4: 운지표의 "G#—|—" (목 G# 키 하나)
  [m(KEY.A), 69],
  [m(KEY.REG, KEY.A), 70],
  // 하부 알티시모
  [m(KEY.REG, KEY.T, KEY.L2, KEY.L3, KEY.R1, KEY.R2), 85],
  [m(KEY.REG, KEY.T, KEY.L2, KEY.L3, KEY.R1, KEY.RP_GS), 86],
  [m(KEY.REG, KEY.T, KEY.L2, KEY.L3, KEY.RP_GS), 88],
  [m(KEY.REG, KEY.T, KEY.L2, KEY.L3, KEY.LP_CS, KEY.RP_GS), 89],
  [m(KEY.REG, KEY.T, KEY.L2, KEY.RP_GS), 90],
  [m(KEY.REG, KEY.T, KEY.L2, KEY.R1, KEY.R2, KEY.RP_GS), 91],
];

function findExact(keys) {
  for (const [mask, midi] of TABLE) {
    if (mask === keys) return midi;
  }
  return -1;
}

// 악보 음 MIDI -> 기본 운지(키 조합). 등록된 운지가 없으면 -1. (연습 모드의 운지 힌트용)
export function fingeringFor(midi) {
  for (const [mask, m] of TABLE) {
    if (m === midi) return mask;
  }
  const base = midi - REGISTER_KEY_OFFSET;
  if (base >= 52 && base <= 65) {
    const mask = fingeringFor(base);
    if (mask >= 0) return mask | (1 << KEY.REG);
  }
  return -1;
}

// 눌린 키 조합(블로우 비트 제외) -> 악보 음 MIDI. 없으면 -1.
export function lookupMidi(keys) {
  const exact = findExact(keys);
  if (exact >= 0) return exact;
  // 클라리온 음역: 레지스터 키를 뗀 운지(E3~F4) + 19반음
  if (keys & (1 << KEY.REG)) {
    const base = findExact(keys & ~(1 << KEY.REG));
    if (base >= 52 && base <= 65) return base + REGISTER_KEY_OFFSET;
  }
  return -1;
}
