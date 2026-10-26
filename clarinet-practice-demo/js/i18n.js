// 다국어(한국어/영어/중국어) 텍스트 및 음이름 표기

export const SUPPORTED_LANGS = ["ko", "en", "zh"];
export const DEFAULT_LANG = "ko";

// 언어별 12음 이름 (반음 포함). 중국어는 표준 숫자보(간보) 표기를 사용한다.
export const NOTE_NAMES = {
  ko: ["도", "도#", "레", "레#", "미", "파", "파#", "솔", "솔#", "라", "라#", "시"],
  en: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  zh: ["1", "1#", "2", "2#", "3", "4", "4#", "5", "5#", "6", "6#", "7"],
};

export function midiToName(midi, lang) {
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return { name: NOTE_NAMES[lang][pitchClass], octave };
}

export function nameToMidi(name, octave, lang) {
  const idx = NOTE_NAMES[lang].indexOf(name);
  return (octave + 1) * 12 + idx;
}

const STRINGS = {
  appTitle: { ko: "🎵 악기 연습", en: "🎵 Instrument Practice", zh: "🎵 乐器练习" },
  appSubtitle: {
    ko: "듣고 · 연주하고 · 바로 확인해요",
    en: "Listen · Play · Get instant feedback",
    zh: "听 · 演奏 · 立即获得反馈",
  },

  langScreenTitle: {
    ko: "언어를 선택하세요",
    en: "Choose your language",
    zh: "请选择语言",
  },

  cardRandomTitle: { ko: "랜덤 8음 연습", en: "8 Random Notes", zh: "随机8音练习" },
  cardRandomDesc: {
    ko: "바로 무작위 음 8개로 즉석 연습을 시작해요",
    en: "Jump straight into practice with 8 random notes",
    zh: "立即用8个随机音符开始练习",
  },

  cardFreeTitle: { ko: "자유 연주", en: "Free Play", zh: "自由演奏" },
  cardFreeDesc: {
    ko: "키를 눌러 마음대로 소리 내고, 음표를 직접 골라 나만의 연습도 만들어요",
    en: "Play freely, or pick notes yourself to build your own practice",
    zh: "随意按键发声，也可以自己选音符组成练习",
  },
  freeListBtn: { ko: "✍️ 음표 입력 ›", en: "✍️ Enter notes ›", zh: "✍️ 输入音符 ›" },
  freeExitBtn: { ko: "나가기", en: "Exit", zh: "退出" },
  freeIdle: {
    ko: "키를 누르고 Space(불기)를 켜세요",
    en: "Set a fingering, then turn on Space (blow)",
    zh: "按好指法，再开启空格（吹奏）",
  },
  freePlaying: { ko: "♪ 연주 중", en: "♪ Playing", zh: "♪ 演奏中" },
  freeUnknown: { ko: "없는 키 조합이에요 (소리 없음)", en: "Unknown fingering (no sound)", zh: "没有这个指法（无声）" },
  freeHintToggle: {
    ko: "키를 한 번 누르면 켜지고, 다시 누르면 꺼져요. 키를 다 누른 뒤 Space(불기)를 켜야 소리가 나요. 등록된 키 조합만 소리가 나고, 없는 조합은 무음이에요.",
    en: "Press a key once to turn it on, again to turn it off. Set a fingering, then turn on Space (blow) to hear it. Only registered fingerings sound; unknown combinations are silent.",
    zh: "按一次开启，再按一次关闭。设好指法后开启空格（吹奏）才会发声。只有已登记的指法发声，未登记的组合无声。",
  },
  freeHintHold: {
    ko: "키를 누르고 있는 동안만 켜져요. 키를 누른 채 Space(불기)도 같이 눌러야 소리가 나요. Shift를 누르면 누르고 있는 키가 잠겨요(Shift만 누르면 해제). 등록된 키 조합만 소리가 나고, 없는 조합은 무음이에요.",
    en: "Keys are on only while held. Hold the fingering keys and press Space (blow) to hear it. Shift locks the keys you are holding (Shift alone unlocks). Only registered fingerings sound; unknown combinations are silent.",
    zh: "仅在按住时开启。按住指法键并同时按空格（吹奏）才会发声。按 Shift 可锁定正在按住的键（单按 Shift 解锁）。只有已登记的指法发声，未登记的组合无声。",
  },

  review_lead: {
    ko: "아래 음 버튼을 누르면 목록에 추가돼요. 목록의 음을 누르면 고치거나 지울 수 있어요.",
    en: "Tap a note button below to add it. Tap a note in the list to edit or delete it.",
    zh: "点击下面的音符按钮即可添加。点击列表中的音符可以修改或删除。",
  },
  reviewCancelBtn: { ko: "처음으로", en: "Start over", zh: "重新开始" },
  startPracticeBtn: { ko: "연습 시작 ▶", en: "Start practice ▶", zh: "开始练习 ▶" },

  octaveLabel: { ko: "옥타브", en: "Octave", zh: "音组" },

  statusListen: { ko: "🎤 소리를 들려주세요", en: "🎤 Play a note", zh: "🎤 请吹奏一个音" },
  statusListening: { ko: "듣고 있어요…", en: "Listening…", zh: "正在聆听…" },
  statusCorrect: { ko: "정확합니다!", en: "Correct!", zh: "正确！" },
  statusWrong: {
    ko: '아쉬워요. 정답은 "{note}"였어요',
    en: 'Not quite. The answer was "{note}"',
    zh: '差一点。正确答案是 "{note}"',
  },
  skipNoteBtn: { ko: "다음 음으로 건너뛰기", en: "Skip to next note", zh: "跳到下一个音" },
  stopPracticeBtn: { ko: "연습 중지", en: "Stop practice", zh: "停止练习" },

  sessionPractice: { ko: "📖 연습 모드", en: "📖 Practice", zh: "📖 练习模式" },
  sessionTest: { ko: "📝 시험 모드", en: "📝 Test", zh: "📝 测试模式" },
  sessionPracticeDesc: {
    ko: "눌러야 할 키를 모형과 글자로 보여줘요.",
    en: "Shows which keys to press, on the model and as text.",
    zh: "在模型上并用文字显示要按的键。",
  },
  sessionTestDesc: {
    ko: "누를 키 힌트 없이 음마다 한 번만 판정하고 점수를 내요.",
    en: "No fingering hints. Each note is judged once and you get a score.",
    zh: "不显示指法提示，每个音只判定一次并计分。",
  },
  fingeringHintLabel: { ko: "누를 키", en: "Press", zh: "按键" },
  fingeringHintOpen: { ko: "아무 키도 누르지 않기", en: "No keys (open)", zh: "不按任何键" },
  resultsTitleTest: { ko: "시험 완료!", en: "Test complete!", zh: "测试完成！" },
  resultsTitle: { ko: "연습 완료!", en: "Practice complete!", zh: "练习完成！" },
  resultsSubtitle: {
    ko: "이번 연습 결과예요",
    en: "Here's how this session went",
    zh: "这是本次练习的结果",
  },
  resultCorrectLabel: { ko: "맞춘 개수", en: "Correct", zh: "正确数" },
  resultIncorrectLabel: { ko: "틀린 개수", en: "Incorrect", zh: "错误数" },
  resultAccuracyLabel: { ko: "정확도", en: "Accuracy", zh: "正确率" },
  retryPracticeBtn: { ko: "다시 연습하기", en: "Practice again", zh: "再次练习" },
  newScoreBtn: { ko: "새로 시작하기", en: "Start over", zh: "重新开始" },

  settingsTitle: { ko: "설정", en: "Settings", zh: "设置" },
  settingsInstrument: { ko: "내 악기", en: "Your instrument", zh: "你的乐器" },
  settingsLanguage: { ko: "언어", en: "Language", zh: "语言" },
  settingsInputMode: { ko: "입력 방식", en: "Input method", zh: "输入方式" },
  inputModeMic: { ko: "마이크 (실제 악기)", en: "Microphone (real instrument)", zh: "麦克风（真实乐器）" },
  inputModeKeyboard: { ko: "키보드 (악기 키 누르기)", en: "Keyboard (fingering simulator)", zh: "键盘（指法模拟）" },
  settingsKeyMode: { ko: "키 입력 방식 (키보드 모드)", en: "Key press style (keyboard mode)", zh: "按键方式（键盘模式）" },
  keyModeToggle: { ko: "토글 (한 번 누르면 켜짐)", en: "Toggle (press once to turn on)", zh: "切换（按一次开启）" },
  keyModeHold: { ko: "꾹 누르기 (누르는 동안만)", en: "Hold (only while pressed)", zh: "按住（仅按下时）" },
  boardConnect: { ko: "🔌 보드 연결", en: "🔌 Connect board", zh: "🔌 连接按键板" },
  boardConnected: { ko: "🔌 연결됨 (끊기)", en: "🔌 Connected (disconnect)", zh: "🔌 已连接（断开）" },
  boardFail: {
    ko: "보드에 연결하지 못했어요. Arduino IDE의 시리얼 모니터를 닫고 다시 해보세요.",
    en: "Could not connect to the board. Close the Arduino IDE serial monitor and try again.",
    zh: "无法连接按键板。请关闭 Arduino IDE 的串口监视器后重试。",
  },
  inputModeCamera: { ko: "카메라 (색 스티커 모형)", en: "Camera (color sticker model)", zh: "摄像头（彩色贴纸模型）" },
  cameraHint: {
    ko: "모형을 카메라에 비추세요. 스티커를 손가락으로 막으면 눌림이에요. 불기는 마이크에 '후~' 하거나 Space.",
    en: "Show the model to the camera. Covering a sticker counts as pressed. Blow into the mic or press Space.",
    zh: "把模型对准摄像头。用手指挡住贴纸即为按下。对着麦克风吹气或按空格。",
  },
  camFindBtn: { ko: "🟢 자동 찾기", en: "🟢 Auto find", zh: "🟢 自动查找" },
  camFinding: {
    ko: "초록 스티커 6개를 찾는 중… 구멍을 모두 열고 모형을 화면에 세워 보여주세요",
    en: "Looking for 6 green stickers… keep all holes open and hold the model upright",
    zh: "正在寻找 6 个绿色贴纸…请打开所有孔并竖直展示模型",
  },
  camFindFew: {
    ko: "초록 스티커가 {n}개만 보여요. 6개가 다 보이게 모형을 비춰주세요",
    en: "Only {n} green stickers visible. Show all 6 to the camera",
    zh: "只看到 {n} 个绿色贴纸，请让 6 个都出现在画面中",
  },
  inputModeHand: { ko: "손 모양 (손가락 인식)", en: "Hand (finger tracking)", zh: "手势（手指识别）" },
  handHint: {
    ko: "양손을 카메라에 보여주세요. 손가락을 구부리면 그 키를 누른 거예요. 구부리는 순간 바로 소리가 나요.",
    en: "Show both hands to the camera. Bending a finger presses that key, and sound plays right away.",
    zh: "把双手对准摄像头。弯曲手指即按下对应的键，并立即发声。",
  },
  handMap: {
    ko: "왼손 검지·중지·약지 = L1 L2 L3 · 오른손 = R1 R2 R3 · 왼손 새끼 = 레지스터 · 오른손 새끼 = 낮은 E",
    en: "Left index/middle/ring = L1 L2 L3 · right = R1 R2 R3 · left pinky = register · right pinky = low E",
    zh: "左手食指/中指/无名指 = L1 L2 L3 · 右手 = R1 R2 R3 · 左手小指 = 泛音键 · 右手小指 = 低音 E",
  },
  handSens: { ko: "민감도", en: "Sensitivity", zh: "灵敏度" },
  handLoading: { ko: "손 인식 준비 중… (처음엔 몇 초 걸려요)", en: "Loading hand tracking… (first time takes a few seconds)", zh: "正在加载手势识别…（首次需要几秒）" },
  handReady: { ko: "손 인식 중 · 초록 = 폄, 주황 = 구부림(누름)", en: "Tracking hands · green = straight, orange = bent (pressed)", zh: "识别中 · 绿 = 伸直，橙 = 弯曲（按下）" },
  handNone: { ko: "손이 안 보여요. 양손을 화면에 보여주세요", en: "No hands visible. Show both hands", zh: "看不到手，请把双手放入画面" },
  handLoadFail: {
    ko: "손 인식 프로그램을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 들어와 주세요",
    en: "Couldn't load hand tracking. Check your internet connection and try again",
    zh: "无法加载手势识别，请检查网络后重试",
  },
  camCalibBtn: { ko: "📍 위치 지정", en: "📍 Set positions", zh: "📍 设定位置" },
  camCalibDone: { ko: "✓ 끝내기", en: "✓ Done", zh: "✓ 完成" },
  camSkip: { ko: "건너뛰기", en: "Skip", zh: "跳过" },
  camAuto: { ko: "누르면 바로 소리", en: "Sound on press", zh: "按下即发声" },
  camBreath: { ko: "마이크로 불기 감지", en: "Detect blowing with mic", zh: "用麦克风检测吹气" },
  camNeedCalib: {
    ko: "📍 위치 지정을 눌러 스티커 위치를 알려주세요",
    en: "Press 📍 Set positions to mark the stickers",
    zh: "请按 📍 设定位置 标记贴纸",
  },
  camCalibFront: {
    ko: "구멍을 모두 연 채로, 화면에서 {name} 스티커를 눌러주세요",
    en: "With all holes open, click the {name} sticker on screen",
    zh: "保持所有孔打开，在画面上点击 {name} 贴纸",
  },
  camCalibSide: {
    ko: "옆 키 {name} 스티커를 화면에서 눌러주세요 (안 쓰면 건너뛰기, 다 됐으면 ✓ 끝내기)",
    en: "Click the {name} side-key sticker (or skip, or ✓ Done)",
    zh: "点击侧键 {name} 的贴纸（不用可跳过，完成请按 ✓ 完成）",
  },
  camCalibBack: {
    ko: "{name} 키를 누른 채로, 앞쪽 창에 나온 색 캡을 화면에서 눌러주세요 (없으면 건너뛰기)",
    en: "Hold the {name} key and click its colored cap in the front window (or skip)",
    zh: "按住 {name} 键，在画面上点击前方窗口中的彩色帽（没有可跳过）",
  },
  camNotFound: {
    ko: "그 자리에서 스티커 색을 못 찾았어요. 스티커 한가운데를 다시 눌러주세요",
    en: "Couldn't find a sticker color there. Click the center of the sticker again",
    zh: "那里没有找到贴纸颜色，请再次点击贴纸中心",
  },
  camReady: {
    ko: "인식 중 · 초록 원 = 열림, 주황 원 = 누름",
    en: "Tracking · green = open, orange = pressed",
    zh: "识别中 · 绿圈 = 打开，橙圈 = 按下",
  },
  camNoCamera: {
    ko: "카메라를 켤 수 없어요. 브라우저에서 카메라 권한을 허용해 주세요",
    en: "Can't start the camera. Allow camera access in your browser",
    zh: "无法打开摄像头，请在浏览器中允许摄像头权限",
  },
  keyModeToggleShort: { ko: "토글", en: "Toggle", zh: "切换" },
  keyModeHoldShort: { ko: "꾹 누르기", en: "Hold", zh: "按住" },
  keyboardHintToggle: {
    ko: "키를 한 번 누르면 켜지고, 다시 누르면 꺼져요. 키를 다 맞춘 뒤 Space(불기)를 켜면 판정되고, 판정 후엔 키가 자동으로 풀려요.",
    en: "Press a fingering key once to turn it on, again to turn it off. Set the fingering, then turn on Space (blow) to be judged. Keys reset automatically afterwards.",
    zh: "按一次指法键开启，再按一次关闭。设定好指法后开启空格（吹奏）即判定，判定后按键会自动复位。",
  },
  keyboardHintHold: {
    ko: "키를 누른 채로 Space(불기)도 같이 누르세요. 키를 떼면 꺼져요. 판정 후 다음 음은 불기를 뗐다가 다시 눌러요. 키가 한꺼번에 다 안 눌리면, 몇 개를 누른 채 Shift를 눌러 잠그고 나머지를 누르세요(Shift만 누르면 잠금 해제).",
    en: "Hold the fingering keys and press Space (blow) at the same time. Releasing a key turns it off. After a note is judged, release blow and press it again for the next one. If your keyboard can't register all keys at once, hold some and press Shift to lock them, then press the rest (Shift alone unlocks).",
    zh: "按住指法键，同时按空格（吹奏）。松开按键即关闭。判定后，请先松开吹奏再重新按下进行下一个音。如果键盘无法同时识别所有按键，先按住几个键再按 Shift 锁定，然后按其余的键（单按 Shift 解锁）。",
  },


  settingsSaveBtn: { ko: "저장", en: "Save", zh: "保存" },
  settingsCloseBtn: { ko: "닫기", en: "Close", zh: "关闭" },

  clarinet_bb: { ko: "Bb 클라리넷 (가장 흔한 종류)", en: "Bb clarinet (most common)", zh: "降B调单簧管（最常见）" },
  clarinet_a: { ko: "A 클라리넷", en: "A clarinet", zh: "A调单簧管" },
  clarinet_eb: { ko: "Eb 클라리넷", en: "Eb clarinet", zh: "降E调单簧管" },
  clarinet_c: { ko: "C 클라리넷 / 이조 없음", en: "C clarinet / no transposition", zh: "C调单簧管 / 不移调" },
  violin: { ko: "바이올린", en: "Violin", zh: "小提琴" },
  cello: { ko: "첼로", en: "Cello", zh: "大提琴" },
  oboe: { ko: "오보에", en: "Oboe", zh: "双簧管" },
  flute: { ko: "플룻", en: "Flute", zh: "长笛" },

  noteEditorTitle: { ko: "음표 수정", en: "Edit note", zh: "编辑音符" },
  noteDeleteBtn: { ko: "삭제", en: "Delete", zh: "删除" },
  noteEditorCloseBtn: { ko: "완료", en: "Done", zh: "完成" },

  alertAddNoteFirst: {
    ko: "먼저 음표를 추가해주세요.",
    en: "Please add at least one note first.",
    zh: "请先添加音符。",
  },
  alertMicUnavailable: {
    ko: "마이크를 사용할 수 없어요. 마이크 권한을 허용했는지 확인해주세요.",
    en: "Can't access the microphone. Please check that microphone permission is allowed.",
    zh: "无法使用麦克风。请检查是否已允许麦克风权限。",
  },
};

export function t(key, lang, vars) {
  const entry = STRINGS[key];
  let str = (entry && (entry[lang] || entry[DEFAULT_LANG])) || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}
