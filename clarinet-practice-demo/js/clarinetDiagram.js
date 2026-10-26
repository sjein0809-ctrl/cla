// 클라리넷 모형(SVG, 뵘식). 켜진 키/구멍을 실제 위치에 표시하고, 누르면(토글/꾹 누르기) 입력된다.
// 연주자가 보는 방향 기준: 왼손 새끼 키는 왼쪽, 사이드(트릴) 키와 오른손 새끼 키는 오른쪽.

import { KEY, BLOW_BIT } from "./fingering.js";

const HOLE_R = 8;
const RING_R = 11;
const CX = 90; // 관 가운데
const BACK_X = 28; // 뒤쪽(왼손 엄지) 키를 따로 그리는 자리

// shape: hole(원, ring: 링 키 여부) | key(알약 모양, rot: 기울기)
const PARTS = [
  // 뒤쪽(왼손 엄지): 레지스터 키가 엄지 구멍 바로 위에 있다
  { bit: KEY.REG, shape: "key", x: BACK_X, y: 146, w: 13, h: 30, label: "R" },
  { bit: KEY.T, shape: "hole", x: BACK_X, y: 186, ring: true, label: "T" },
  // 목(throat) 키: A 키는 L1 구멍 바로 위, G# 키는 그 왼쪽 위
  { bit: KEY.A, shape: "key", x: 88, y: 122, w: 13, h: 24, rot: -8, label: "A" },
  { bit: KEY.TG_GS, shape: "key", x: 62, y: 112, w: 24, h: 12, rot: -28, label: "G#" },
  // 왼손 구멍 (L3 은 링이 없다)
  { bit: KEY.L1, shape: "hole", x: CX, y: 152, ring: true, label: "L1" },
  { bit: KEY.L2, shape: "hole", x: CX, y: 186, ring: true, label: "L2" },
  { bit: KEY.L3, shape: "hole", x: CX, y: 224, label: "L3" },
  // 왼손 약지 슬리버 키 (L2 와 L3 사이)
  { bit: KEY.EB_KEY, shape: "key", x: 113, y: 205, w: 22, h: 10, rot: -32, label: "Eb" },
  // 왼손 새끼 C#/G# 키 (윗관 왼쪽 아래)
  { bit: KEY.LP_CS, shape: "key", x: 55, y: 250, w: 26, h: 12, rot: 24, label: "C#" },
  // 사이드(트릴) 키: 윗관 오른쪽 아래, 오른손 검지 옆. 맨 아래가 S4
  { bit: KEY.SIDE1, shape: "key", x: 132, y: 238, w: 26, h: 11, label: "S1" },
  { bit: KEY.SIDE2, shape: "key", x: 132, y: 252, w: 26, h: 11, label: "S2" },
  { bit: KEY.SIDE3, shape: "key", x: 132, y: 266, w: 26, h: 11, label: "S3" },
  { bit: KEY.SIDE4, shape: "key", x: 132, y: 280, w: 26, h: 11, label: "S4" },
  // 왼손 새끼 레버 3개 (아랫관 왼쪽 위): 바깥 E, 안쪽 위 F#, 아래 F
  { bit: KEY.LP_FS, shape: "key", x: 59, y: 306, w: 22, h: 12, rot: 12, label: "F#" },
  { bit: KEY.LP_E, shape: "key", x: 33, y: 314, w: 22, h: 12, rot: 12, label: "E" },
  { bit: KEY.LP_F, shape: "key", x: 51, y: 329, w: 22, h: 12, rot: 12, label: "F" },
  // 오른손 구멍 (모두 링 키)
  { bit: KEY.R1, shape: "hole", x: CX, y: 322, ring: true, label: "R1" },
  { bit: KEY.R2, shape: "hole", x: CX, y: 356, ring: true, label: "R2" },
  { bit: KEY.R3, shape: "hole", x: CX, y: 392, ring: true, label: "R3" },
  // 오른손 약지 슬리버 키 (R2 와 R3 사이)
  { bit: KEY.B_KEY, shape: "key", x: 113, y: 374, w: 22, h: 10, rot: -32, label: "B" },
  // 오른손 새끼 키 4개 (아랫관 오른쪽 아래): 윗줄 G#(Ab/Eb)·F#, 아랫줄 F·E
  { bit: KEY.RP_GS, shape: "key", x: 121, y: 416, w: 23, h: 12, rot: -10, label: "G#" },
  { bit: KEY.RP_FS, shape: "key", x: 147, y: 412, w: 23, h: 12, rot: -10, label: "F#" },
  { bit: KEY.RP_F, shape: "key", x: 124, y: 432, w: 23, h: 12, rot: -10, label: "F" },
  { bit: KEY.RP_E, shape: "key", x: 150, y: 428, w: 23, h: 12, rot: -10, label: "E" },
];

function partSvg(p) {
  let shape;
  if (p.shape === "hole") {
    const ring = p.ring ? `<circle class="cl-ring" cx="${p.x}" cy="${p.y}" r="${RING_R}" />` : "";
    shape = `${ring}<circle cx="${p.x}" cy="${p.y}" r="${HOLE_R}" />`;
  } else {
    const rot = p.rot ? ` transform="rotate(${p.rot} ${p.x} ${p.y})"` : "";
    const rx = Math.min(p.w, p.h) / 2;
    shape = `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" rx="${rx}"${rot} />`;
  }
  const label = `<text x="${p.x}" y="${p.y + 2.8}" text-anchor="middle" class="in-key">${p.label}</text>`;
  return `<g class="ck" data-bit="${p.bit}">${shape}${label}</g>`;
}

export function buildClarinet(container, onPress, onRelease) {
  container.innerHTML = `
    <svg class="clarinet-svg" viewBox="0 0 180 528" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="clarinet">
      <!-- 배럴 -->
      <path class="cl-body" d="M75 60 Q70 79 75 98 H105 Q110 79 105 60 Z" />
      <!-- 윗관 / 아랫관 -->
      <rect class="cl-body" x="76" y="100" width="28" height="194" />
      <rect class="cl-body" x="76" y="296" width="28" height="158" />
      <!-- 벨 -->
      <path class="cl-body" d="M76 458 H104 Q108 496 134 520 H46 Q72 496 76 458 Z" />
      <!-- 이음매 금속 링 -->
      <rect class="cl-band" x="73" y="58" width="34" height="4" rx="1.5" />
      <rect class="cl-band" x="73" y="96" width="34" height="5" rx="1.5" />
      <rect class="cl-band" x="73" y="292" width="34" height="5" rx="1.5" />
      <rect class="cl-band" x="73" y="453" width="34" height="5" rx="1.5" />
      <rect class="cl-band" x="44" y="518" width="92" height="4" rx="2" />
      <!-- 키 막대(장식): 트릴 키, 왼손 새끼 레버, 아랫관 링 키 -->
      <line class="cl-rod" x1="108" y1="118" x2="108" y2="286" />
      <line class="cl-rod" x1="72" y1="300" x2="72" y2="446" />
      <line class="cl-rod" x1="108" y1="306" x2="108" y2="404" />
      <!-- 아랫관 끝의 큰 패드(장식) -->
      <circle class="cl-pad" cx="${CX}" cy="424" r="8" />
      <circle class="cl-pad" cx="${CX}" cy="443" r="8" />
      <!-- 마우스피스 = BLOW -->
      <g class="ck mp" data-bit="${BLOW_BIT}">
        <path d="M83 6 Q90 1 96 5 L103 58 H77 Z" />
        <line class="cl-rod" x1="79" y1="40" x2="101" y2="40" />
        <line class="cl-rod" x1="78" y1="50" x2="102" y2="50" />
        <text x="${CX}" y="30" text-anchor="middle" class="in-key">BLOW</text>
      </g>
      <text x="${BACK_X}" y="122" text-anchor="middle" class="note-txt">BACK</text>
      ${PARTS.map(partSvg).join("")}
    </svg>`;

  const groups = new Map();
  container.querySelectorAll(".ck").forEach((g) => {
    const bit = Number(g.dataset.bit);
    groups.set(bit, g);
    g.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      onPress(bit);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
      g.addEventListener(ev, () => onRelease(bit))
    );
  });

  return {
    // state: 켜진 키, hint: 눌러야 할 키(연습 모드의 운지 힌트)
    update(state, hint = 0) {
      groups.forEach((g, bit) => {
        g.classList.toggle("on", (state & (1 << bit)) !== 0);
        g.classList.toggle("hint", (hint & (1 << bit)) !== 0);
      });
    },
  };
}
