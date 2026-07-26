/**
 * けん玉ー１，２，３ Web Application JS Engine
 * Vercel CDN 完全対応（キャンバス遅延初期化 ＆ 堅牢デュアルリカバリー）
 */

// ================= GLOBAL STATE =================
const state = {
  simMode: 'step1',
  isPlaying: true,
  speed: 1.0,
  time: 0,
  soundEnabled: true,
  volume: 0.8,
  rhythmTimer: null,
  activePattern: null,
  completedSteps: new Set()
};

let canvas = null;
let ctx = null;
let audioCtx = null;

// 全11ステップの詳細物理解説データ
const modeDescriptions = {
  step1: {
    badge: 'ステップ 1: 持ち方（皿グリップ）',
    title: '【ステップ1】正しい持ち方（皿グリップ・大皿持ち）',
    desc: '親指と人差し指でけんはさみ、中指・薬指を皿底に添えます。鉛筆持ちではなく皿持ちから始めることで接触面積が増え、固有感覚受容体（深部感覚）からの入力情報が増して操作精度が高まります。',
    v: '手元静止 0.0 m/s', dt: '固有感覚↑', f: '接触面積増'
  },
  step2: {
    badge: 'ステップ 2: 1-2-3 膝屈伸の構え',
    title: '【ステップ2】構えと「いち・に・さん」膝のクッション',
    desc: '肩幅より広く立ち利き足を半歩前へ。「1:曲げる 2:伸ばす 3:かがむ」のリズム屈伸を行います。玉を浮かせず身体のリズムを作り、脳内セロトニン系と小脳の運動記憶を活性化します。',
    v: '屈伸リズム', dt: 'セロトニン', f: '運動記憶(小脳)'
  },
  step3: {
    badge: 'ステップ 3: 玉の静止と垂直引き上げ',
    title: '【ステップ3】「玉の完全静止」と垂直引き上げ（10〜20cm）',
    desc: '玉のブラブラ揺れを完全に止め、糸が垂直に張った状態から膝の伸びだけで10〜20cmまっすぐ引き上げます。水平初速vx=0に近づけることで、脳内内部モデルでの軌道予測が容易になります。',
    v: 'vx = 0 (垂直昇降)', dt: '10〜20cm', f: '軌道予測容易'
  },
  step4: {
    badge: 'ステップ 4: 空中停止（無重力感）の観察',
    title: '【ステップ4】最高点での「空中停止（無重力感：初速v=0）」の捕捉',
    desc: '玉が最高点に達した瞬間、一瞬だけ空中静止する「初速v=0の無重力状態」を浮遊滞留させて注視観察します。動体視力と空間認知を同期させ、皿を下に潜り込ませる完璧な位相タイミングを学習します。',
    v: 'v = 0.0 (完全無重力)', dt: '位相タイミング', f: '空間認知同期'
  },
  step5: {
    badge: 'ステップ 5: 大皿乗せ（右皿を上に向ける回転）',
    title: '【ステップ5】「大皿」乗せ（けん玉を倒して右の大皿口を上に向ける）',
    desc: 'けん玉を左に90°傾けて右横の大皿口を真上に向け、最高点直前に玉の真下に滑り込ませます。触れた瞬間に膝を曲げて一緒に下がることで、相対速度を最小化（衝撃力F減）します。',
    v: '大皿口を上に向ける', dt: 'Δt 延長', f: '衝撃力 F 激減'
  },
  step6: {
    badge: 'ステップ 6: 小皿（左皿）・中皿（底皿）・ろうそく',
    title: '【ステップ6】「小皿（左皿口上向け）」「中皿（底皿口上向け）」「ろうそく」',
    desc: '小皿乗せでは右に90°倒して左の小皿口を上へ、中皿乗せでは180°ひっくり返して底皿口を上へ向けます。手元の回転角度とターゲット皿を一致させる操作技術を習得します。',
    v: '皿角度回転', dt: '重心制御', f: 'モータースキル'
  },
  step7: {
    badge: 'ステップ 7: とめけん（けん先垂直向上）',
    title: '【ステップ7】けん先「とめけん」の垂直軸刺入',
    desc: 'けん先を垂直上に向けたまま保持し、直下へ落ちてくる穴を迎え入れます。「刺しに行くのではなく、穴の下にけん先をそっと添える」のが科学的コツです。',
    v: 'けん先直撃', dt: '穴を注視', f: '穴を迎える'
  },
  step8: {
    badge: 'ステップ 8: 日本一周の基礎（大皿 ⇄ 小皿 移動）',
    title: '【ステップ8】「大皿（左90°回転）〜小皿（右90°回転）」交互移動',
    desc: '大皿では左90°傾けて大皿を上へ、小皿へ動かす際は右90°スムーズに反転させて小皿を上へ向けます。膝のバウンドに合わせて手元の角度を滑らかに変えます。',
    v: '皿角度交互変換', dt: '強化学習', f: '運動前野自動化'
  },
  step9: {
    badge: 'ステップ 9: もしかめ（大皿 ⇄ 中皿 交互運動）',
    title: '【ステップ9】リズム連動「もしかめ」（右大皿上向き ⇄ 底中皿180°逆さ）',
    desc: '「もしもしかめよ」の歌に合わせて大皿（左90°傾き）と中皿（180°逆さ）を交互に手元を回転させて移動。「トントン」と足踏みする膝のリズムに手元の回転運動を同期させます。',
    v: '大皿 ⇄ 中皿回転', dt: '基底核定着', f: '足踏みトントン'
  },
  step10: {
    badge: 'ステップ 10: 玉の回転「ふりけん」',
    title: '【ステップ10】玉の回転コントロール（「ふりけん」）',
    desc: '糸の張力を利用して玉を前に振り出し、自分側に順回転を与えて引き上げます。角運動量保存により軸が安定し、穴の位置が自分側を向いて視認しやすくなります。',
    v: '順回転 ω (前振り)', dt: '角運動量保存', f: '穴視認性向上'
  },
  step11: {
    badge: 'ステップ 11: 技の最高峰「世界一周」',
    title: '【ステップ11】「世界一周」（空中放物線ポップアップ連続結合）',
    desc: '玉が皿を離れて空中を綺麗な放物線で描きながら「前振り大皿 → 小皿 → 中皿 → けん先」へと飛び移ります！各ジャンプ時に「膝のクッションリセット」を行うのが科学的コツです。',
    v: '空中放物線ジャンプ', dt: '膝リセット', f: '4段階連動'
  }
};

// ================= INITIALIZATION =================
let isAppInitialized = false;

function initApp() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  loadCompletedSteps();
  initCanvas();
  initAudio();
  setupEventListeners();
  requestAnimationFrame(animate);
}

// window.load でレイアウト完了後に確実に起動
window.addEventListener('load', initApp);
// フォールバック: DOMContentLoaded でも起動
window.addEventListener('DOMContentLoaded', initApp);
// 最終フォールバック: 500ms 後に強制起動
setTimeout(initApp, 500);

function loadCompletedSteps() {
  try {
    const saved = localStorage.getItem('kendama_completed_steps');
    if (saved) {
      const arr = JSON.parse(saved);
      state.completedSteps = new Set(arr);
    }
  } catch (e) {
    console.error('localStorage 読み込みエラー:', e);
  }
  updateProgressUI();
}

function saveCompletedSteps() {
  try {
    localStorage.setItem('kendama_completed_steps', JSON.stringify(Array.from(state.completedSteps)));
  } catch (e) {
    console.error('localStorage 保存エラー:', e);
  }
  updateProgressUI();
}

function toggleStepCompletion(stepNum) {
  if (state.completedSteps.has(stepNum)) {
    state.completedSteps.delete(stepNum);
  } else {
    state.completedSteps.add(stepNum);
    playKendamaSound('katsun');
    playVoiceCall(`ステップ${stepNum} クリア！`);
  }
  saveCompletedSteps();

  if (state.completedSteps.size === 11) {
    setTimeout(() => {
      playVoiceCall('おめでとうございます！全11ステップクリア！世界一周達成、けん玉グランドマスターです！');
      alert('🎉 おめでとうございます！\n全11ステップ「世界一周」まですべてマスターしました！素晴らしい努力です！');
    }, 500);
  }
}

/**
 * 全ステップの「クリア済」クリア記録をリセットする関数
 */
function resetAllCompletedSteps() {
  if (confirm('これまでにクリアした全ステップの完了記録をリセットしますか？')) {
    state.completedSteps.clear();
    saveCompletedSteps();
    playKendamaSound('click');
    playVoiceCall('クリア記録をリセットしました');
  }
}

function updateProgressUI() {
  const count = state.completedSteps.size;
  const pct = Math.round((count / 11) * 100);

  const pBar = document.getElementById('overall-progress-bar');
  const pText = document.getElementById('overall-progress-text');
  if (pBar) pBar.style.width = `${pct}%`;
  if (pText) pText.textContent = `${count} / 11 ステップ完了 (${pct}%)`;

  for (let i = 1; i <= 11; i++) {
    const card = document.getElementById(`step-card-${i}`);
    const btn = document.getElementById(`step-check-btn-${i}`);
    const sideBadge = document.getElementById(`side-check-badge-${i}`);
    const isDone = state.completedSteps.has(i);

    if (card) {
      if (isDone) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
    }

    if (btn) {
      if (isDone) {
        btn.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i><span class="text-emerald-300 font-bold">クリア済！</span>';
        btn.classList.add('bg-emerald-950/80', 'border-emerald-500/50');
        btn.classList.remove('bg-slate-900', 'border-slate-700');
      } else {
        btn.innerHTML = '<i data-lucide="circle" class="w-4 h-4 text-slate-400"></i><span>完了にする</span>';
        btn.classList.remove('bg-emerald-950/80', 'border-emerald-500/50');
        btn.classList.add('bg-slate-900', 'border-slate-700');
      }
    }

    if (sideBadge) {
      sideBadge.style.display = isDone ? 'inline-flex' : 'none';
    }
  }

  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function initCanvas() {
  canvas = document.getElementById('kendamaCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  // getBoundingClientRect がゼロの場合は親要素またはデフォルト値を使う
  let cssW = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
  let cssH = canvas.clientHeight || canvas.parentElement?.clientHeight || 360;
  // clientWidth も 0 の場合はウィンドウ幅から計算
  if (cssW < 10) {
    cssW = Math.min(window.innerWidth - 32, 960);
    cssH = Math.round(cssW * 9 / 16);
  }
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.scale(dpr, dpr);
  // CSS サイズも明示的に設定（Vercel でレイアウトが遅延する場合の保険）
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
}

function scrollToSection(secId) {
  const el = document.getElementById(secId);
  if (el) {
    const yOffset = -130;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

// ================= AUDIO SYSTEM =================
function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    audioCtx = new AudioContext();
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  const btnText = document.getElementById('sound-text');
  const icon = document.getElementById('sound-icon');
  if (btnText && icon) {
    if (state.soundEnabled) {
      btnText.textContent = '音声・効果音 ON';
      icon.setAttribute('data-lucide', 'volume-2');
    } else {
      btnText.textContent = '音声・効果音 OFF';
      icon.setAttribute('data-lucide', 'volume-x');
    }
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
  }
}

function setVolume(val) {
  state.volume = parseFloat(val);
}

function playKendamaSound(type) {
  if (!state.soundEnabled) return;
  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(state.volume, now);
  masterGain.connect(audioCtx.destination);

  if (type === 'katsun') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  } else if (type === 'su') {
    const duration = 0.25;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + duration);
    filter.Q.value = 1.5;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    whiteNoise.start(now);
    whiteNoise.stop(now + duration);

    playVoiceCall('スッ');
  } else if (type === 'click') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }
}

function playVoiceCall(text) {
  if (!state.soundEnabled) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    utter.rate = 1.2;
    utter.volume = state.volume;
    window.speechSynthesis.speak(utter);
  }
}

function playRhythmPattern(pattern) {
  if (state.rhythmTimer) {
    clearInterval(state.rhythmTimer);
    state.rhythmTimer = null;
  }

  if (state.activePattern === pattern) {
    state.activePattern = null;
    return;
  }

  state.activePattern = pattern;

  if (pattern === '123') {
    const steps = ['いち！ (膝を曲げる)', 'に！ (膝を伸ばす)', 'さん！ (深クッション)'];
    let idx = 0;
    playVoiceCall(steps[idx]);
    playKendamaSound('click');

    state.rhythmTimer = setInterval(() => {
      idx = (idx + 1) % 3;
      playVoiceCall(steps[idx]);
      playKendamaSound('click');
    }, 1200);
  } else if (pattern === 'tonton') {
    let count = 0;
    state.rhythmTimer = setInterval(() => {
      count++;
      playVoiceCall('トン');
      playKendamaSound('click');
    }, 600);
  } else if (pattern === 'moshikame') {
    const lyrics = ['もしもし', 'かめよ', 'かめさんよ', 'せかいで', 'いちばん', 'のろいくに'];
    let idx = 0;
    playVoiceCall(lyrics[idx]);
    playKendamaSound('katsun');

    state.rhythmTimer = setInterval(() => {
      idx = (idx + 1) % lyrics.length;
      playVoiceCall(lyrics[idx]);
      playKendamaSound('katsun');
    }, 900);
  }
}

// ================= SIMULATION CONTROLS =================
function togglePlay() {
  state.isPlaying = !state.isPlaying;
  const playText = document.getElementById('play-text');
  const playIcon = document.getElementById('play-icon');
  if (playText && playIcon) {
    playText.textContent = state.isPlaying ? '一時停止' : '再生';
    playIcon.setAttribute('data-lucide', state.isPlaying ? 'pause' : 'play');
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
  }
}

function setSpeed(sp) {
  state.speed = sp;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.remove('active', 'font-bold', 'text-cyan-400', 'bg-cyan-950/60', 'border', 'border-cyan-500/30');
    if (parseFloat(btn.textContent) === sp) {
      btn.classList.add('active', 'font-bold', 'text-cyan-400', 'bg-cyan-950/60', 'border', 'border-cyan-500/30');
    }
  });
}

function resetSimulation() {
  state.time = 0;
}

function selectSimMode(mode) {
  state.simMode = mode;
  state.time = 0;
  
  document.querySelectorAll('.sim-mode-btn').forEach(btn => {
    btn.classList.remove('active', 'border-cyan-500/50', 'bg-cyan-950/30');
  });

  const activeBtn = event ? event.currentTarget : null;
  if (activeBtn) {
    activeBtn.classList.add('active', 'border-cyan-500/50', 'bg-cyan-950/30');
  }

  const data = modeDescriptions[mode];
  if (data) {
    const badge = document.getElementById('step-badge');
    const descText = document.getElementById('sim-desc-text');
    const valV = document.getElementById('val-v');
    const valDt = document.getElementById('val-dt');
    const valF = document.getElementById('val-f');

    if (badge) badge.textContent = data.badge;
    if (descText) descText.textContent = data.desc;
    if (valV) valV.textContent = data.v;
    if (valDt) valDt.textContent = data.dt;
    if (valF) valF.textContent = data.f;
  }

  const stepTitles = {
    step1: 'ステップ1、皿グリップ',
    step2: 'ステップ2、いちにさん屈伸構え',
    step3: 'ステップ3、玉の完全静止と垂直引き上げ',
    step4: 'ステップ4、最高点での空中停止、無重力感の捕捉観察',
    step5: 'ステップ5、大皿乗せ、大皿口を上にしてキャッチ',
    step6: 'ステップ6、小皿、中皿、ろうそく',
    step7: 'ステップ7、とめけん、けん先直撃',
    step8: 'ステップ8、日本一周基礎、大皿と小皿の移動',
    step9: 'ステップ9、もしかめ、大皿と中皿の回転往復',
    step10: 'ステップ10、ふりけん前振り順回転',
    step11: 'ステップ11、世界一周、空中ジャンプ連続トランスファー'
  };
  if (stepTitles[mode]) playVoiceCall(stepTitles[mode]);
}

function triggerInteractiveCatch() {
  const overlay = document.getElementById('canvas-overlay');
  const overlayText = document.getElementById('overlay-text');
  if (overlay && overlayText) {
    overlayText.textContent = '🎯 ナイスクッション！ 衝撃吸収 100%';
    overlay.style.opacity = '1';
    playKendamaSound('su');
    playVoiceCall('ナイスクッション！');
    setTimeout(() => {
      overlay.style.opacity = '0';
    }, 1500);
  }
}

function setupEventListeners() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      triggerInteractiveCatch();
    }
  });
}

// ================= ANIMATION ENGINE =================
function animate() {
  if (state.isPlaying) {
    state.time += 0.02 * state.speed;
  }

  renderCanvas();
  requestAnimationFrame(animate);
}

function renderCanvas() {
  if (!canvas || !ctx) {
    initCanvas();
  }
  if (!canvas || !ctx) return;

  // キャンバスサイズがゼロの場合は再初期化
  if (canvas.width < 10 || canvas.height < 10) {
    resizeCanvas();
  }
  if (canvas.width < 10) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  // 背景グリッド描画
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const centerX = w * 0.4;
  const groundY = h * 0.85;

  let kneeOffset = 0;
  let handX = centerX + 50;
  let handY = groundY - 140;
  
  let ballX = handX;
  let ballY = handY - 120;
  let ballRot = 0;
  let kenAngle = 0;
  let apexState = false;
  let sekaiIsshuStageText = '';

  const t = state.time;

  if (state.simMode === 'step1') {
    kneeOffset = Math.sin(t * 2) * 5;
    handY += kneeOffset;
    ballY = handY - 35;
    kenAngle = 0;
  } else if (state.simMode === 'step2') {
    const cycle = t % 3;
    if (cycle < 1) {
      kneeOffset = Math.sin(cycle * Math.PI) * 35;
    } else if (cycle < 2) {
      kneeOffset = -Math.sin((cycle - 1) * Math.PI) * 20;
    } else {
      kneeOffset = Math.sin((cycle - 2) * Math.PI) * 45;
    }
    handY += kneeOffset;
    ballY = handY - 35;
    kenAngle = 0;
  } else if (state.simMode === 'step3') {
    const cycle = t % 2.5;
    if (cycle < 0.6) {
      kneeOffset = (cycle / 0.6) * 30;
      handY += kneeOffset;
      ballY = handY - 20;
    } else if (cycle < 1.4) {
      const progress = (cycle - 0.6) / 0.8;
      kneeOffset = 30 - progress * 40;
      handY += kneeOffset;
      ballY = (handY - 20) - (12 * progress - 0.5 * 24 * progress * progress);
    } else {
      kneeOffset = -10 + ((cycle - 1.4) / 1.1) * 40;
      handY += kneeOffset;
      ballY = handY - 20;
    }
    kenAngle = 0;
  } else if (state.simMode === 'step4') {
    const cycle = t % 3.6;
    if (cycle < 0.6) {
      kneeOffset = (cycle / 0.6) * 30;
      handY += kneeOffset;
      ballY = handY - 20;
    } else if (cycle < 1.2) {
      const progress = (cycle - 0.6) / 0.6;
      kneeOffset = 30 - progress * 40;
      handY += kneeOffset;
      ballY = (handY - 20) - progress * 110;
    } else if (cycle < 2.4) {
      apexState = true;
      kneeOffset = -10;
      handY += kneeOffset;
      ballY = (handY - 20) - 110;
    } else {
      const dropProgress = (cycle - 2.4) / 1.2;
      kneeOffset = -10 + dropProgress * 40;
      handY += kneeOffset;
      ballY = ((handY - 20) - 110) + dropProgress * 110;
    }
    kenAngle = 0;
  } else if (state.simMode === 'step5') {
    const cycle = t % 2.8;
    if (cycle < 1.2) {
      kneeOffset = Math.sin((cycle / 1.2) * Math.PI) * 30;
      handY += kneeOffset;
      ballX = handX;
      ballY = handY - 20 - (15 * (cycle / 1.2) - 0.5 * 30 * Math.pow(cycle / 1.2, 2)) * 8;
      kenAngle = - (cycle / 1.2) * (Math.PI / 2);
    } else if (cycle < 2.0) {
      const progress = (cycle - 1.2) / 0.8;
      kneeOffset = 30 + Math.sin(progress * Math.PI) * 35;
      handY += kneeOffset;
      kenAngle = -Math.PI / 2;
      ballX = handX;
      ballY = handY - 28;
      if (progress < 0.2) playKendamaSound('su');
    } else {
      handY += 30 * (1 - (cycle - 2.0) / 0.8);
      kenAngle = -Math.PI / 2;
      ballX = handX;
      ballY = handY - 28;
    }
  } else if (state.simMode === 'step6') {
    const cycle = t % 3.6;
    if (cycle < 1.2) {
      kneeOffset = Math.sin((cycle / 1.2) * Math.PI) * 20;
      handY += kneeOffset;
      kenAngle = Math.PI / 2;
      ballX = handX;
      ballY = handY - 24;
    } else if (cycle < 2.4) {
      kneeOffset = Math.sin(((cycle - 1.2) / 1.2) * Math.PI) * 20;
      handY += kneeOffset;
      kenAngle = Math.PI;
      ballX = handX;
      ballY = handY - 32;
    } else {
      kneeOffset = Math.sin(((cycle - 2.4) / 1.2) * Math.PI) * 15;
      handY += kneeOffset;
      kenAngle = Math.PI;
      ballX = handX;
      ballY = handY - 32;
    }
  } else if (state.simMode === 'step7') {
    const cycle = t % 2.6;
    kenAngle = 0;
    if (cycle < 1.3) {
      kneeOffset = Math.sin((cycle / 1.3) * Math.PI) * 25;
      handY += kneeOffset;
      ballX = handX;
      ballY = handY - 20 - Math.sin((cycle / 1.3) * Math.PI) * 110;
    } else {
      const progress = (cycle - 1.3) / 1.3;
      kneeOffset = 25 * (1 - progress);
      handY += kneeOffset;
      ballX = handX;
      ballY = handY - 26;
      if (progress < 0.1) playKendamaSound('katsun');
    }
  } else if (state.simMode === 'step8') {
    const cycle = t % 1.6;
    const isSmallCup = Math.floor(t / 1.6) % 2 === 1;
    kneeOffset = Math.sin(cycle * Math.PI) * 20;
    handY += kneeOffset;
    
    if (isSmallCup) {
      kenAngle = Math.PI / 2;
      ballX = handX;
      ballY = handY - 24 - Math.sin(cycle * Math.PI) * 35;
    } else {
      kenAngle = -Math.PI / 2;
      ballX = handX;
      ballY = handY - 28 - Math.sin(cycle * Math.PI) * 35;
    }
  } else if (state.simMode === 'step9') {
    const cycle = t % 1.0;
    const isBigCup = Math.floor(t / 1.0) % 2 === 0;
    kneeOffset = Math.sin(cycle * Math.PI * 2) * 20;
    handY += kneeOffset;
    
    if (isBigCup) {
      kenAngle = -Math.PI / 2;
      ballX = handX;
      ballY = handY - 28 - Math.abs(Math.sin(cycle * Math.PI)) * 40;
    } else {
      kenAngle = Math.PI;
      ballX = handX;
      ballY = handY - 32 - Math.abs(Math.sin(cycle * Math.PI)) * 40;
    }
  } else if (state.simMode === 'step10') {
    const cycle = t % 2.8;
    const progress = cycle / 2.8;
    kneeOffset = Math.sin(progress * Math.PI * 2) * 25;
    handY += kneeOffset;
    const swingAngle = Math.sin(progress * Math.PI * 2) * 0.75;
    ballX = handX + Math.sin(swingAngle) * 85;
    ballY = handY + Math.cos(swingAngle) * 85 - 30;
    ballRot = progress * Math.PI * 4;
    kenAngle = 0;
  } else if (state.simMode === 'step11') {
    const cycle = t % 6.4;
    const phase = Math.floor(cycle / 1.6);
    const pTime = cycle % 1.6;

    if (phase === 0) {
      if (pTime < 0.8) {
        const swing = pTime / 0.8;
        kneeOffset = Math.sin(swing * Math.PI) * 25;
        handY += kneeOffset;
        ballX = handX + Math.sin((1 - swing) * 0.6) * 60;
        ballY = handY + Math.cos((1 - swing) * 0.6) * 60 - 20;
        kenAngle = - (swing) * (Math.PI / 2);
      } else {
        kneeOffset = 15 * (1 - (pTime - 0.8) / 0.8);
        handY += kneeOffset;
        kenAngle = -Math.PI / 2;
        ballX = handX;
        ballY = handY - 28;
      }
      sekaiIsshuStageText = '🌍 世界一周 ① 前振り大皿 (大皿口上向き着地)';
    } else if (phase === 1) {
      if (pTime < 0.7) {
        const flight = pTime / 0.7;
        kneeOffset = Math.sin(flight * Math.PI) * 20;
        handY += kneeOffset;
        kenAngle = -Math.PI / 2 + flight * Math.PI;
        const arcY = Math.sin(flight * Math.PI) * 45;
        ballX = handX;
        ballY = (handY - 28) - arcY;
      } else {
        const cushion = (pTime - 0.7) / 0.9;
        kneeOffset = Math.sin(cushion * Math.PI) * 15;
        handY += kneeOffset;
        kenAngle = Math.PI / 2;
        ballX = handX;
        ballY = handY - 24;
        if (cushion < 0.1) playKendamaSound('su');
      }
      sekaiIsshuStageText = '🌍 世界一周 ② 小皿へ空中ジャンプ！ (小皿口上向き着地)';
    } else if (phase === 2) {
      if (pTime < 0.7) {
        const flight = pTime / 0.7;
        kneeOffset = Math.sin(flight * Math.PI) * 20;
        handY += kneeOffset;
        kenAngle = Math.PI / 2 + flight * (Math.PI / 2);
        const arcY = Math.sin(flight * Math.PI) * 50;
        ballX = handX;
        ballY = (handY - 24) - arcY;
      } else {
        const cushion = (pTime - 0.7) / 0.9;
        kneeOffset = Math.sin(cushion * Math.PI) * 15;
        handY += kneeOffset;
        kenAngle = Math.PI;
        ballX = handX;
        ballY = handY - 32;
        if (cushion < 0.1) playKendamaSound('su');
      }
      sekaiIsshuStageText = '🌍 世界一周 ③ 中皿へ空中ジャンプ！ (底皿口上向き着地)';
    } else {
      if (pTime < 0.8) {
        const flight = pTime / 0.8;
        kneeOffset = Math.sin(flight * Math.PI) * 25;
        handY += kneeOffset;
        kenAngle = Math.PI * (1 - flight);
        const arcY = Math.sin(flight * Math.PI) * 60;
        ballX = handX;
        ballY = (handY - 32) - arcY;
      } else {
        const cushion = (pTime - 0.8) / 0.8;
        kneeOffset = 20 * (1 - cushion);
        handY += kneeOffset;
        kenAngle = 0;
        ballX = handX;
        ballY = handY - 26;
        if (cushion < 0.1) playKendamaSound('katsun');
      }
      sekaiIsshuStageText = '🌍 世界一周 ④ けん先直撃刺入！ (世界一周 達成！)';
    }
  }

  const overlay = document.getElementById('canvas-overlay');
  if (overlay && state.simMode === 'step4') {
    overlay.style.opacity = apexState ? '1' : '0';
    const overlayText = document.getElementById('overlay-text');
    if (overlayText) overlayText.textContent = '✨ 最高点：初速 v = 0 （空中静止・無重力感を捕捉！）';
  } else if (overlay && state.simMode === 'step2') {
    overlay.style.opacity = '0';
  }

  // 床面描画
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 100, groundY);
  ctx.lineTo(centerX + 150, groundY);
  ctx.stroke();

  // 人物シルエット
  drawHumanSilhouette(ctx, centerX, groundY, kneeOffset, handX, handY);

  // 正確なけん玉描画
  drawAccurateKendamaCups(ctx, handX, handY, kenAngle);

  // 運動の軌跡描画
  drawTrajectory(ctx, ballX, ballY, apexState);

  // ステップ4の最高点無重力感フリーズリング描画
  if (state.simMode === 'step4' && apexState) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(ballX, ballY, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, groundY - 200 + kneeOffset * 0.5);
    ctx.lineTo(ballX, ballY);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('👁️ 注視：初速 v = 0', ballX + 28, ballY - 5);
  }

  // けん玉の玉 (Tama)
  drawTama(ctx, ballX, ballY, ballRot);

  // 正確な糸描画
  drawAccurateKendamaString(ctx, handX, handY, kenAngle, ballX, ballY, ballRot);

  // 物理ベクトル表示
  drawPhysicsVectors(ctx, ballX, ballY, kneeOffset, apexState);

  // ステップ11: 世界一周 ステージ表示
  if (state.simMode === 'step11' && sekaiIsshuStageText) {
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(sekaiIsshuStageText, centerX - 90, handY - 140);
  }
}

function drawHumanSilhouette(ctx, cx, gy, kneeOff, hx, hy) {
  const headY = gy - 200 + kneeOff * 0.5;
  const hipY = gy - 100 + kneeOff * 0.8;
  const kneeY = gy - 50 + kneeOff * 0.9;

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(cx, headY, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, headY + 16);
  ctx.lineTo(cx, hipY);
  ctx.stroke();

  const legSpread = 25;
  ctx.beginPath();
  ctx.moveTo(cx, hipY);
  ctx.lineTo(cx + legSpread + kneeOff * 0.3, kneeY);
  ctx.lineTo(cx + legSpread + 10, gy);
  ctx.stroke();

  ctx.strokeStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(cx, hipY);
  ctx.lineTo(cx - legSpread - kneeOff * 0.2, kneeY);
  ctx.lineTo(cx - legSpread);
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(cx + legSpread + kneeOff * 0.3, kneeY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(cx, headY + 30);
  ctx.lineTo(hx - 15, hy + 15);
  ctx.lineTo(hx, hy);
  ctx.stroke();
}

function drawAccurateKendamaCups(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. けん先 (Spike Tip)
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(5, -12);
  ctx.lineTo(-5, -12);
  ctx.closePath();
  ctx.fill();

  // 2. けん軸 (Ken Shaft)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(-5, -12, 10, 44);

  // 3. 皿胴 (Sarado Crossbar)
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-28, -12, 56, 12);

  // 4. 大皿 (Ozara - Right Side Cup)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(28, -16, 8, 20);
  ctx.beginPath();
  ctx.ellipse(36, -6, 5, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0369a1';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '9px sans-serif';
  ctx.fillText('大皿', 12, -18);

  // 5. 小皿 (Kozara - Left Side Cup)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-36, -14, 8, 16);
  ctx.beginPath();
  ctx.ellipse(-36, -6, 4, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0369a1';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '9px sans-serif';
  ctx.fillText('小皿', -30, -18);

  // 6. 中皿 (Chuzara - Bottom Cup)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-8, 32, 16, 6);
  ctx.beginPath();
  ctx.ellipse(0, 38, 8, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0369a1';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '9px sans-serif';
  ctx.fillText('中皿', -10, 48);

  ctx.restore();
}

function drawAccurateKendamaString(ctx, kx, ky, kAngle, bx, by, bRot) {
  const stringAttachDist = -5;
  const stringKenX = kx + Math.sin(kAngle) * stringAttachDist;
  const stringKenY = ky - Math.cos(kAngle) * stringAttachDist;

  const stringTamaX = bx + Math.sin(bRot) * 10;
  const stringTamaY = by + Math.cos(bRot) * 10;

  const dx = stringTamaX - stringKenX;
  const dy = stringTamaY - stringKenY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxLen = 95;

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.8;

  if (dist >= maxLen - 5) {
    ctx.beginPath();
    ctx.moveTo(stringKenX, stringKenY);
    ctx.lineTo(stringTamaX, stringTamaY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(stringKenX, stringKenY);
    ctx.lineTo(stringTamaX, stringTamaY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const sag = (maxLen - dist) * 0.45;
    const ctrlX = (stringKenX + stringTamaX) / 2;
    const ctrlY = (stringKenY + stringTamaY) / 2 + sag;

    ctx.beginPath();
    ctx.moveTo(stringKenX, stringKenY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, stringTamaX, stringTamaY);
    ctx.stroke();
  }

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(stringKenX, stringKenY, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTama(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16);
  grad.addColorStop(0, '#fb7185');
  grad.addColorStop(1, '#e11d48');

  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#fda4af';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

let trailHistory = [];
function drawTrajectory(ctx, x, y, isApex) {
  trailHistory.push({ x, y, isApex });
  if (trailHistory.length > 25) trailHistory.shift();

  ctx.lineWidth = 2;
  for (let i = 0; i < trailHistory.length - 1; i++) {
    const p1 = trailHistory[i];
    const p2 = trailHistory[i + 1];
    const alpha = i / trailHistory.length;

    ctx.strokeStyle = p1.isApex ? `rgba(245, 158, 11, ${alpha})` : `rgba(6, 182, 212, ${alpha * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

function drawPhysicsVectors(ctx, x, y, kneeOff, isApex) {
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 80);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (kneeOff > 10) {
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 60, y + 80);
    ctx.lineTo(x - 60, y + 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 65, y + 45);
    ctx.lineTo(x - 60, y + 35);
    ctx.lineTo(x - 55, y + 45);
    ctx.fill();

    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('クッション F↓', x - 95, y + 65);
  }
}
