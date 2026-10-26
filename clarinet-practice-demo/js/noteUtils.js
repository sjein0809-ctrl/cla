// 주파수 <-> MIDI 변환, 악기별 이조(移調) 데이터
// 음이름 표기(한국어/영어/중국어)와 악기 표시 이름은 i18n.js에서 다룬다.

// 악기별 이조 폭(반음 단위). "실제 소리 = 악보 음 - 이 값" 이 되도록 정의.
// 바이올린/첼로/오보에/플룻은 이조 없는(콘서트 피치) 악기라서 semitones: 0.
export const INSTRUMENTS = {
  clarinet_bb: { semitones: 2 },
  clarinet_a: { semitones: 3 },
  clarinet_eb: { semitones: -3 },
  clarinet_c: { semitones: 0 },
  violin: { semitones: 0 },
  cello: { semitones: 0 },
  oboe: { semitones: 0 },
  flute: { semitones: 0 },
};

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

export function centsBetween(freqA, freqB) {
  return 1200 * Math.log2(freqA / freqB);
}

// 연습용 랜덤 음 목록 생성. 초보자가 다루기 좋은 음역대의
// 자연음(샵/플랫 없는 음)만 대상으로 한다. (모든 악기 공통)
const RANDOM_POOL_MIDI = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79]; // C4 ~ G5 자연음

export function generateRandomNotes(count) {
  const notes = [];
  for (let i = 0; i < count; i++) {
    const midi = RANDOM_POOL_MIDI[Math.floor(Math.random() * RANDOM_POOL_MIDI.length)];
    notes.push({ midi });
  }
  return notes;
}
