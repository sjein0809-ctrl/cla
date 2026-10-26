import { INSTRUMENTS, midiToFrequency, centsBetween, generateRandomNotes } from "./noteUtils.js";
import { SUPPORTED_LANGS, DEFAULT_LANG, NOTE_NAMES, midiToName, t } from "./i18n.js";
import { PitchDetector } from "./pitchDetector.js";
import { KeyboardInput } from "./keyboardInput.js";
import { BoardSerial, boardSupported } from "./boardSerial.js";
import { buildClarinet } from "./clarinetDiagram.js";
import { fingeringFor, KEY_DEFS } from "./fingering.js";
import { CameraInput } from "./cameraInput.js";

const TOLERANCE_CENTS = 45;
const HOLD_MS = 300;
const RANDOM_PRACTICE_COUNT = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * 60; // 결과 화면 정확도 원형 그래프 둘레

const el = (id) => document.getElementById(id);

let freePlay = false; // 자유 연주 화면인지

const screens = {
  language: el("screen-language"),
  home: el("screen-home"),
  review: el("screen-review"),
  practice: el("screen-practice"),
  results: el("screen-results"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  // 키보드 연습 화면은 한 화면 안에 다 들어오도록 2단 배치(모형 | 나머지)를 쓴다
  document.body.classList.toggle("kb-practice", name === "practice" && (diagramShown || freePlay));
}

// ---------- 설정 & 언어 ----------
const storedLang = localStorage.getItem("lang");
// 예전 버전의 "clarinetKey" 저장값이 있으면 새 instrument 값으로 이어받는다.
const legacyClarinetKey = localStorage.getItem("clarinetKey");
const storedInstrument =
  localStorage.getItem("instrument") || (legacyClarinetKey ? `clarinet_${legacyClarinetKey}` : null);
const settings = {
  instrument: storedInstrument && INSTRUMENTS[storedInstrument] ? storedInstrument : "clarinet_bb",
  lang: SUPPORTED_LANGS.includes(storedLang) ? storedLang : DEFAULT_LANG,
  // mic: 실제 악기 소리 / keyboard: 키보드·화면·USB 보드 / camera: 색 스티커 모형을 카메라로
  inputMode: ["keyboard", "camera"].includes(localStorage.getItem("inputMode")) ? localStorage.getItem("inputMode") : "mic",
  keyMode: localStorage.getItem("keyMode") === "hold" ? "hold" : "toggle",
  // practice: 눌러야 할 키를 보여줌 / test: 힌트 없음
  sessionMode: localStorage.getItem("sessionMode") === "test" ? "test" : "practice",
};

function renderKeyModeOptions(lang) {
  const select = el("keyModeSelect");
  select.innerHTML = "";
  [
    ["toggle", "keyModeToggle"],
    ["hold", "keyModeHold"],
  ].forEach(([value, key]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = t(key, lang);
    select.appendChild(opt);
  });
  select.value = settings.keyMode;
}

// 키 입력 방식(토글/꾹 누르기) 표시와 안내 문구를 현재 설정에 맞춘다
function applyKeyModeUI() {
  el("keyModeToggleBtn").classList.toggle("active", settings.keyMode === "toggle");
  el("keyModeHoldBtn").classList.toggle("active", settings.keyMode === "hold");
  const prefix = freePlay ? "freeHint" : "keyboardHint";
  const hintKey = prefix + (settings.keyMode === "hold" ? "Hold" : "Toggle");
  el("keyboardHintText").textContent = t(settings.inputMode === "camera" ? "cameraHint" : hintKey, settings.lang);
  if (camInput) camInput.updateTexts();
  if (kbInput) kbInput.setMode(settings.keyMode);
  applyBoardUI();
}

function applySessionModeUI() {
  const test = settings.sessionMode === "test";
  el("sessionPracticeBtn").classList.toggle("active", !test);
  el("sessionTestBtn").classList.toggle("active", test);
  el("sessionPracticeBtn").textContent = t("sessionPractice", settings.lang);
  el("sessionTestBtn").textContent = t("sessionTest", settings.lang);
  el("sessionModeDescText").textContent = t(test ? "sessionTestDesc" : "sessionPracticeDesc", settings.lang);
}

function setSessionMode(mode) {
  settings.sessionMode = mode === "test" ? "test" : "practice";
  localStorage.setItem("sessionMode", settings.sessionMode);
  applySessionModeUI();
}

// ---------- USB 운지 버튼 보드 ----------
const board = new BoardSerial(
  (state) => {
    if (kbInput) kbInput.setBoardState(state);
  },
  (connected) => {
    if (kbInput) kbInput.setBoardState(0, connected);
    applyBoardUI();
  }
);

function applyBoardUI() {
  const btn = el("boardBtn");
  btn.hidden = !boardSupported;
  btn.classList.toggle("active", board.connected);
  btn.textContent = t(board.connected ? "boardConnected" : "boardConnect", settings.lang);
}

// 새로 만든 kbInput 에 현재 보드 상태를 넘겨준다
function attachBoard() {
  if (board.connected && kbInput) kbInput.setBoardState(board.lastState);
}

async function toggleBoard() {
  if (board.connected) {
    board.disconnect();
    return;
  }
  try {
    await board.connect();
  } catch (err) {
    if (err && err.name === "NotFoundError") return; // 포트 선택 창을 그냥 닫음
    alert(t("boardFail", settings.lang));
  }
}

function setKeyMode(mode) {
  settings.keyMode = mode === "hold" ? "hold" : "toggle";
  localStorage.setItem("keyMode", settings.keyMode);
  el("keyModeSelect").value = settings.keyMode;
  applyKeyModeUI();
}

function renderInputModeOptions(lang) {
  const select = el("inputModeSelect");
  select.innerHTML = "";
  [
    ["mic", "inputModeMic"],
    ["keyboard", "inputModeKeyboard"],
    ["camera", "inputModeCamera"],
  ].forEach(([value, key]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = t(key, lang);
    select.appendChild(opt);
  });
  select.value = settings.inputMode;
}

function renderInstrumentOptions(lang) {
  const select = el("instrumentSelect");
  const prevValue = select.value || settings.instrument;
  select.innerHTML = "";
  Object.keys(INSTRUMENTS).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = t(key, lang);
    select.appendChild(opt);
  });
  select.value = prevValue;
}

function applyLanguage(lang) {
  document.title = t("appTitle", lang).replace(/^🎵\s*/, "");
  el("appTitleText").textContent = t("appTitle", lang);
  el("appSubtitleText").textContent = t("appSubtitle", lang);
  updateFreeNoteButtons();
  el("cardRandomTitleText").textContent = t("cardRandomTitle", lang);
  el("cardRandomDescText").textContent = t("cardRandomDesc", lang);
  el("cardFreeTitleText").textContent = t("cardFreeTitle", lang);
  el("cardFreeDescText").textContent = t("cardFreeDesc", lang);
  el("reviewLeadText").textContent = t("review_lead", lang);
  el("reviewCancelBtn").textContent = t("reviewCancelBtn", lang);
  el("startPracticeBtn").textContent = t("startPracticeBtn", lang);
  el("skipNoteBtn").textContent = t("skipNoteBtn", lang);
  el("stopPracticeBtn").textContent = t(freePlay ? "freeExitBtn" : "stopPracticeBtn", lang);
  el("resultsTitleText").textContent = t(settings.sessionMode === "test" ? "resultsTitleTest" : "resultsTitle", lang);
  applySessionModeUI();
  el("resultsSubtitleText").textContent = t("resultsSubtitle", lang);
  el("resultCorrectLabelText").textContent = t("resultCorrectLabel", lang);
  el("resultIncorrectLabelText").textContent = t("resultIncorrectLabel", lang);
  el("resultAccuracyLabelText").textContent = t("resultAccuracyLabel", lang);
  el("retryPracticeBtn").textContent = t("retryPracticeBtn", lang);
  el("newScoreBtn").textContent = t("newScoreBtn", lang);
  el("settingsTitleText").textContent = t("settingsTitle", lang);
  el("settingsLanguageLabelText").textContent = t("settingsLanguage", lang);
  el("settingsInstrumentLabelText").textContent = t("settingsInstrument", lang);
  el("settingsInputModeLabelText").textContent = t("settingsInputMode", lang);
  el("settingsKeyModeLabelText").textContent = t("settingsKeyMode", lang);
  el("keyModeToggleBtn").textContent = t("keyModeToggleShort", lang);
  el("keyModeHoldBtn").textContent = t("keyModeHoldShort", lang);
  el("settingsSaveBtn").textContent = t("settingsSaveBtn", lang);
  el("settingsCloseBtn").textContent = t("settingsCloseBtn", lang);
  el("noteEditorTitleText").textContent = t("noteEditorTitle", lang);
  el("octaveLabelText").textContent = t("octaveLabel", lang);
  el("noteDeleteBtn").textContent = t("noteDeleteBtn", lang);
  el("noteEditorCloseBtn").textContent = t("noteEditorCloseBtn", lang);
  el("languageSelect").value = lang;

  renderInstrumentOptions(lang);
  renderInputModeOptions(lang);
  renderKeyModeOptions(lang);
  applyKeyModeUI();
  renderNoteList();
  if (screens.practice.classList.contains("active") && practiceTargets.length) {
    updateTargetDisplay();
  }
}

function chooseLang(lang) {
  settings.lang = lang;
  localStorage.setItem("lang", lang);
  applyLanguage(lang);
  showScreen("home");
}

el("langKoBtn").addEventListener("click", () => chooseLang("ko"));
el("langEnBtn").addEventListener("click", () => chooseLang("en"));
el("langZhBtn").addEventListener("click", () => chooseLang("zh"));

el("settingsBtn").addEventListener("click", () => {
  el("languageSelect").value = settings.lang;
  el("instrumentSelect").value = settings.instrument;
  el("inputModeSelect").value = settings.inputMode;
  el("keyModeSelect").value = settings.keyMode;
  el("settingsOverlay").classList.add("active");
});
el("settingsCloseBtn").addEventListener("click", () => el("settingsOverlay").classList.remove("active"));
el("settingsSaveBtn").addEventListener("click", () => {
  settings.instrument = el("instrumentSelect").value;
  localStorage.setItem("instrument", settings.instrument);

  const mode = el("inputModeSelect").value;
  settings.inputMode = ["keyboard", "camera"].includes(mode) ? mode : "mic";
  localStorage.setItem("inputMode", settings.inputMode);

  setKeyMode(el("keyModeSelect").value);

  const newLang = el("languageSelect").value;
  if (newLang !== settings.lang && SUPPORTED_LANGS.includes(newLang)) {
    settings.lang = newLang;
    localStorage.setItem("lang", newLang);
    applyLanguage(newLang);
  }
  el("settingsOverlay").classList.remove("active");
});

el("keyModeToggleBtn").addEventListener("click", () => setKeyMode("toggle"));
el("keyModeHoldBtn").addEventListener("click", () => setKeyMode("hold"));
el("boardBtn").addEventListener("click", toggleBoard);
el("sessionPracticeBtn").addEventListener("click", () => setSessionMode("practice"));
el("sessionTestBtn").addEventListener("click", () => setSessionMode("test"));

// ---------- 음표 목록 상태 (midi 기준, 표시 이름은 언어별로 계산) ----------
let workingNotes = []; // { midi }
let editIndex = null; // 편집 중인 노트의 인덱스 (null이면 신규 추가)
let editMidi = 60;

function renderNoteList() {
  const listEl = el("noteList");
  listEl.innerHTML = "";
  workingNotes.forEach((note, idx) => {
    const { name, octave } = midiToName(note.midi, settings.lang);
    const chip = document.createElement("div");
    chip.className = "note-chip";
    chip.innerHTML = `${name}<span class="octave">${t("octaveLabel", settings.lang)} ${octave}</span>`;
    chip.addEventListener("click", () => openNoteEditor(idx));
    listEl.appendChild(chip);
  });
  renderNotePalette();
}

// 모든 음을 버튼으로 보여준다. 누르면 그 음이 목록 끝에 추가된다.
const PALETTE_MIN_MIDI = 52; // 미3 (클라리넷 최저음)
const PALETTE_MAX_MIDI = 91; // 솔6

function renderNotePalette() {
  const wrap = el("notePalette");
  wrap.innerHTML = "";
  const names = NOTE_NAMES[settings.lang];
  for (let octave = 3; octave <= 6; octave++) {
    const label = document.createElement("div");
    label.className = "palette-octave";
    label.textContent = `${t("octaveLabel", settings.lang)} ${octave}`;
    wrap.appendChild(label);
    const row = document.createElement("div");
    row.className = "palette-row";
    for (let pc = 0; pc < 12; pc++) {
      const midi = (octave + 1) * 12 + pc;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-btn" + (names[pc].length > 1 ? " palette-btn--sharp" : "");
      btn.textContent = names[pc];
      if (midi < PALETTE_MIN_MIDI || midi > PALETTE_MAX_MIDI) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => {
          workingNotes.push({ midi });
          renderNoteList();
        });
      }
      row.appendChild(btn);
    }
    wrap.appendChild(row);
  }
}

function openNoteEditor(idx) {
  editIndex = idx;
  editMidi = idx === null ? 60 : workingNotes[idx].midi;
  renderPitchGrid();
  el("octaveValue").textContent = Math.floor(editMidi / 12) - 1;
  el("noteDeleteBtn").style.visibility = idx === null ? "hidden" : "visible";
  el("noteEditorOverlay").classList.add("active");
}

function renderPitchGrid() {
  const grid = el("noteEditorPitches");
  grid.innerHTML = "";
  const pitchClass = ((Math.round(editMidi) % 12) + 12) % 12;
  NOTE_NAMES[settings.lang].forEach((label, idx) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (idx === pitchClass) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      const octave = Math.floor(editMidi / 12) - 1;
      editMidi = (octave + 1) * 12 + idx;
      renderPitchGrid();
    });
    grid.appendChild(btn);
  });
}

el("octaveUpBtn").addEventListener("click", () => {
  if (Math.floor(editMidi / 12) - 1 < 7) editMidi += 12;
  el("octaveValue").textContent = Math.floor(editMidi / 12) - 1;
});
el("octaveDownBtn").addEventListener("click", () => {
  if (Math.floor(editMidi / 12) - 1 > 1) editMidi -= 12;
  el("octaveValue").textContent = Math.floor(editMidi / 12) - 1;
});

el("noteEditorCloseBtn").addEventListener("click", () => {
  if (editIndex === null) {
    workingNotes.push({ midi: editMidi });
  } else {
    workingNotes[editIndex] = { midi: editMidi };
  }
  el("noteEditorOverlay").classList.remove("active");
  renderNoteList();
});

el("noteDeleteBtn").addEventListener("click", () => {
  if (editIndex !== null) workingNotes.splice(editIndex, 1);
  el("noteEditorOverlay").classList.remove("active");
  renderNoteList();
});


// ---------- 홈: 랜덤 연습 (직접 음표 입력은 자유 연주 화면 안에 있다) ----------

el("randomPracticeBtn").addEventListener("click", () => {
  workingNotes = generateRandomNotes(RANDOM_PRACTICE_COUNT);
  renderNoteList();
  startPracticeSession();
});

el("reviewCancelBtn").addEventListener("click", () => showScreen("home"));

// ---------- 연습 ----------
let practiceTargets = [];
let practiceIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let pitchDetector = null;
let holdStart = null; // 안정적으로 소리가 들리기 시작한 시각
let locked = false; // 판정 처리 중 잠깐 입력 무시
let diagramShown = false; // 연습 화면에 클라리넷 모형을 보여주는지
let hintDiagram = null; // 마이크 + 연습 모드에서 운지 힌트만 보여주는 모형

el("startPracticeBtn").addEventListener("click", () => {
  if (workingNotes.length === 0) {
    alert(t("alertAddNoteFirst", settings.lang));
    return;
  }
  startPracticeSession();
});

function resetPracticeUi() {
  freePlay = false;
  el("progressDots").hidden = false;
  el("skipNoteBtn").hidden = false;
  el("freeListBtn").hidden = true;
  el("stopPracticeBtn").textContent = t("stopPracticeBtn", settings.lang);
}

async function startPracticeSession() {
  resetPracticeUi();
  practiceTargets = workingNotes.map((n) => ({ midi: n.midi }));
  practiceIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  holdStart = null;
  locked = false;
  hintDiagram = null;

  stopKeyboardInput();
  if (pitchDetector) {
    pitchDetector.stop();
    pitchDetector = null;
  }

  const keyboardMode = settings.inputMode !== "mic"; // 카메라도 키 입력 흐름을 같이 쓴다
  // 마이크 방식이어도 연습 모드 + 클라리넷이면 운지 힌트용 모형을 보여준다
  const micHint = !keyboardMode && settings.sessionMode === "practice" && settings.instrument.startsWith("clarinet");
  diagramShown = keyboardMode || micHint;
  el("resultsTitleText").textContent = t(settings.sessionMode === "test" ? "resultsTitleTest" : "resultsTitle", settings.lang);
  if (micHint) {
    el("keyPanel").innerHTML = "";
    hintDiagram = buildClarinet(el("clarinetWrap"), () => {}, () => {});
  }
  el("kbLayout").hidden = !diagramShown;
  el("keyboardHintText").hidden = !keyboardMode;
  el("keyModeSwitch").hidden = !keyboardMode;

  renderProgressDots();
  showScreen("practice");

  if (keyboardMode) {
    kbCandidate = -1;
    kbNeedRelease = false;
    kbInput = new KeyboardInput(el("keyPanel"), el("clarinetWrap"));
    kbInput.setMode(settings.keyMode);
    applyKeyModeUI();
    kbInput.start(onKeyboardTick, () => INSTRUMENTS[settings.instrument].semitones);
    attachBoard();
    attachCamera();
    updateTargetDisplay();
    return;
  }

  updateTargetDisplay();
  pitchDetector = new PitchDetector();
  try {
    await pitchDetector.start(onPitchFrame);
  } catch (err) {
    alert(t("alertMicUnavailable", settings.lang));
    showScreen("review");
  }
}

function renderProgressDots() {
  const wrap = el("progressDots");
  wrap.innerHTML = "";
  practiceTargets.forEach(() => {
    const dot = document.createElement("div");
    dot.className = "dot";
    wrap.appendChild(dot);
  });
  updateProgressDots();
}

function updateProgressDots() {
  const dots = el("progressDots").children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle("current", i === practiceIndex);
  }
}

function updateTargetDisplay() {
  const target = practiceTargets[practiceIndex];
  const { name, octave } = midiToName(target.midi, settings.lang);
  el("targetNoteKorean").textContent = name;
  el("targetNoteOctave").textContent = `${t("octaveLabel", settings.lang)} ${octave}`;
  el("targetNoteCard").className = "target-note listening";
  updateProgressDots();
  setStatus(t("statusListen", settings.lang), "");
  // 연습 모드: 목표 음의 운지를 모형에 표시
  const hint = settings.sessionMode === "practice" ? fingeringFor(target.midi) : -1;
  if (kbInput) kbInput.setHint(hint);
  if (hintDiagram) hintDiagram.update(0, hint > 0 ? hint : 0);
  showFingeringHint(hint);
}

// 눌러야 할 키 목록을 음 카드 옆(아래)에 글자로 보여준다. hint < 0 이면 숨김.
function showFingeringHint(hint) {
  const box = el("fingeringHintText");
  box.hidden = hint < 0;
  if (hint < 0) return;
  const keyboard = settings.inputMode === "keyboard";
  const chips = KEY_DEFS.filter((d) => hint & (1 << d.bit)).map(
    (d) => `<span class="fh-chip">${keyboard ? `<b>${d.key}</b> ` : ""}${d.name}</span>`
  );
  box.innerHTML =
    `<span class="fh-label">${t("fingeringHintLabel", settings.lang)}</span>` +
    (chips.length ? chips.join("") : `<span class="fh-chip">${t("fingeringHintOpen", settings.lang)}</span>`);
}

function setStatus(text, cls) {
  const statusEl = el("practiceStatus");
  statusEl.textContent = text;
  statusEl.className = `status ${cls}`;
}

// 어떤 음이든(정답/오답 상관없이) 안정적으로 HOLD_MS 이상 들리면 즉시 판정하고 바로 다음 음으로 넘어간다.
function onPitchFrame(freq, rms) {
  el("micLevelBar").style.width = `${Math.min(100, rms * 400)}%`;
  if (locked) return;

  if (freq <= 0) {
    holdStart = null;
    setStatus(t("statusListen", settings.lang), "");
    return;
  }

  const now = performance.now();
  if (holdStart === null) holdStart = now;

  if (now - holdStart < HOLD_MS) {
    setStatus(t("statusListening", settings.lang), "");
    return;
  }

  const target = practiceTargets[practiceIndex];
  const transposition = INSTRUMENTS[settings.instrument].semitones;
  const expectedConcertMidi = target.midi - transposition;
  const expectedFreq = midiToFrequency(expectedConcertMidi);
  const cents = centsBetween(freq, expectedFreq);
  const isCorrect = Math.abs(cents) <= TOLERANCE_CENTS;

  finalizeNote(isCorrect, target);
}

// ---------- 자유 연주: 목표 음 없이, 운지를 만들고 BLOW(Space)를 켜면 그 음이 소리 난다 ----------
let lastFreeKey = "";

function startFreePlay() {
  stopKeyboardInput();
  if (pitchDetector) {
    pitchDetector.stop();
    pitchDetector = null;
  }
  freePlay = true;
  el("freeListBtn").hidden = false;
  updateFreeNoteButtons();
  hintDiagram = null;
  showFingeringHint(-1);
  lastFreeKey = "";
  practiceTargets = [];
  el("kbLayout").hidden = false;
  el("keyboardHintText").hidden = false;
  el("keyModeSwitch").hidden = false;
  el("progressDots").hidden = true;
  el("skipNoteBtn").hidden = true;
  el("stopPracticeBtn").textContent = t("freeExitBtn", settings.lang);
  setStatus(t("freeIdle", settings.lang), "");
  el("targetNoteKorean").textContent = "–";
  el("targetNoteOctave").textContent = "";
  el("targetNoteCard").className = "target-note listening";
  showScreen("practice");

  kbInput = new KeyboardInput(el("keyPanel"), el("clarinetWrap"));
  kbInput.setMode(settings.keyMode);
  applyKeyModeUI();
  kbInput.start(onFreePlayTick, () => INSTRUMENTS[settings.instrument].semitones);
  attachBoard();
  attachCamera();
}

function exitFreePlay() {
  stopKeyboardInput();
  resetPracticeUi();
  showScreen("home");
}

// 자유 연주 화면에서 직접 음표 입력(음 버튼 화면)으로 넘어간다
function updateFreeNoteButtons() {
  el("freeListBtn").textContent = t("freeListBtn", settings.lang);
}

el("freeListBtn").addEventListener("click", () => {
  stopKeyboardInput();
  resetPracticeUi();
  workingNotes = [];
  renderNoteList();
  showScreen("review");
});

function onFreePlayTick(midi, blowing) {
  el("micLevelBar").style.width = midi >= 0 ? "60%" : "0%";
  const key = `${midi}:${blowing}:${settings.lang}`;
  if (key === lastFreeKey) return;
  lastFreeKey = key;

  const card = el("targetNoteCard");
  if (midi >= 0) {
    const { name, octave } = midiToName(midi, settings.lang);
    el("targetNoteKorean").textContent = name;
    el("targetNoteOctave").textContent = `${t("octaveLabel", settings.lang)} ${octave}`;
    card.className = "target-note correct";
    setStatus(t("freePlaying", settings.lang), "correct");
  } else {
    el("targetNoteKorean").textContent = "–";
    el("targetNoteOctave").textContent = "";
    card.className = "target-note listening";
    if (blowing) setStatus(t("freeUnknown", settings.lang), "incorrect");
    else setStatus(t("freeIdle", settings.lang), "");
  }
}

el("freePlayBtn").addEventListener("click", startFreePlay);

// ---------- 키보드 운지 입력 ----------
let kbInput = null;
let kbCandidate = -1; // 지금 후보로 보고 있는 음
let kbSince = 0; // 후보가 유지되기 시작한 시각
let kbNeedRelease = false; // 한 번 판정한 뒤에는 불기를 떼거나 다른 음으로 바꿀 때까지 다음 판정 안 함
let kbJudgedMidi = -1; // 마지막으로 판정한 음

function stopKeyboardInput() {
  if (kbInput) {
    kbInput.stop();
    kbInput = null;
  }
  if (camInput) camInput.stop();
  el("camPanel").hidden = true;
  document.body.classList.remove("cam-mode");
}

// ---------- 카메라(색 스티커 모형) 입력 ----------
let camInput = null;

function attachCamera() {
  const on = settings.inputMode === "camera";
  el("camPanel").hidden = !on;
  document.body.classList.toggle("cam-mode", on);
  if (!on) return;
  if (!camInput) {
    camInput = new CameraInput(
      el("camPanel"),
      (keys, blow) => {
        if (kbInput) kbInput.setExternal(keys, blow);
      },
      (key, vars) => t(key, settings.lang, vars)
    );
  }
  camInput.updateTexts();
  camInput.start();
}

// 운지로 정해진 음(악보 기준)이 target.midi 와 같으면 정답. 마이크 방식과 달리 이조 계산이 필요 없다.
function onKeyboardTick(midi, blowing) {
  el("micLevelBar").style.width = blowing ? "60%" : "0%";
  if (locked) return;

  if (!blowing) {
    kbNeedRelease = false;
    kbCandidate = -1;
    setStatus(t("statusListen", settings.lang), "");
    return;
  }
  if (kbNeedRelease && midi === kbJudgedMidi) return;
  kbNeedRelease = false;

  const now = performance.now();
  if (midi < 0) {
    kbCandidate = -1;
    setStatus(t("statusListen", settings.lang), "");
    return;
  }
  if (midi !== kbCandidate) {
    kbCandidate = midi;
    kbSince = now;
    setStatus(t("statusListening", settings.lang), "");
    return;
  }
  if (now - kbSince < HOLD_MS) return;

  kbNeedRelease = true;
  kbJudgedMidi = midi;
  kbCandidate = -1;
  const target = practiceTargets[practiceIndex];
  finalizeNote(midi === target.midi, target);
}

function finalizeNote(isCorrect, target) {
  locked = true;
  holdStart = null;

  const dots = el("progressDots").children;
  if (isCorrect) {
    correctCount++;
    setStatus(t("statusCorrect", settings.lang), "correct");
    el("targetNoteCard").classList.add("correct");
    if (dots[practiceIndex]) dots[practiceIndex].classList.add("correct");
  } else {
    incorrectCount++;
    const { name, octave } = midiToName(target.midi, settings.lang);
    const noteLabel = `${name} (${t("octaveLabel", settings.lang)} ${octave})`;
    setStatus(t("statusWrong", settings.lang, { note: noteLabel }), "incorrect");
    el("targetNoteCard").classList.add("incorrect");
    if (dots[practiceIndex]) dots[practiceIndex].classList.add("incorrect");
  }

  setTimeout(() => {
    locked = false;
    advancePractice();
  }, 500);
}

el("skipNoteBtn").addEventListener("click", () => {
  incorrectCount++;
  const dots = el("progressDots").children;
  if (dots[practiceIndex]) dots[practiceIndex].classList.add("incorrect");
  holdStart = null;
  advancePractice();
});

function advancePractice() {
  if (kbInput) kbInput.clearAfterNote(); // 토글 모드: 켜둔 키를 풀어서 다음 음을 새로 시작
  practiceIndex++;
  if (practiceIndex >= practiceTargets.length) {
    finishPractice();
  } else {
    updateTargetDisplay();
  }
}

function finishPractice() {
  stopKeyboardInput();
  if (pitchDetector) {
    pitchDetector.stop();
    pitchDetector = null;
  }
  const total = correctCount + incorrectCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  el("resultCorrect").textContent = correctCount;
  el("resultIncorrect").textContent = incorrectCount;
  el("resultAccuracy").textContent = `${accuracy}%`;

  const ring = el("accuracyRingFill");
  const offset = RING_CIRCUMFERENCE * (1 - accuracy / 100);
  // 화면 전환 애니메이션이 끝난 뒤 채워지도록 살짝 지연
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
  showScreen("results");
  requestAnimationFrame(() => {
    setTimeout(() => {
      ring.style.strokeDashoffset = offset;
    }, 80);
  });
}

el("stopPracticeBtn").addEventListener("click", () => (freePlay ? exitFreePlay() : finishPractice()));

el("retryPracticeBtn").addEventListener("click", () => startPracticeSession());
el("newScoreBtn").addEventListener("click", () => {
  workingNotes = [];
  showScreen("home");
});

// ---------- 초기화 ----------
applyLanguage(settings.lang);
if (SUPPORTED_LANGS.includes(storedLang)) {
  showScreen("home");
} else {
  showScreen("language");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
