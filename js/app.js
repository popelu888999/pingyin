// 《拼音大冒险》— 主应用逻辑

const App = {
  currentPage: 'map',
  catMood: 'neutral',
  consecutiveErrors: 0,
  balloonInterval: null,
  balloonAnimFrame: null,
  level5Timer: null,
  level5TimeLeft: 0,

  // Two-step speech verification state (levels 1-4)
  _waitingForSpeech: false,
  _currentTypedCorrect: null,
  _waveformAnimFrame: null,
  _micAvailable: false,
  _speechErrorCount: 0,     // per-question speech errors
  _speechStopTimer: null,   // 强制停止识别的计时器
  _sherpaModelReady: false,   // sherpa-onnx 模型是否已加载

  LEVEL_INFO: [
    { id: 1, name: '回声森林', desc: '声母辨析', icon: '🌲', unlockScore: 0 },
    { id: 2, name: '韵律海洋', desc: '韵母掌握', icon: '🌊', unlockScore: 0 },
    { id: 3, name: '魔法合成炉', desc: '声韵两拼', icon: '🔮', unlockScore: 0 },
    { id: 4, name: '汉字王国', desc: '看拼音打汉字', icon: '🏰', unlockScore: 0 },
    { id: 5, name: '文字保卫战', desc: '句子实战', icon: '⚔️', unlockScore: 0 }
  ],

  BADGES: [
    { id: 'first_clear', name: '初出茅庐', icon: '⭐', condition: () => Game.progress.levelStars[1] > 0 },
    { id: 'combo_5', name: '连击新手', icon: '🔥', condition: () => Game.progress.maxCombo >= 5 },
    { id: 'combo_10', name: '连击达人', icon: '💥', condition: () => Game.progress.maxCombo >= 10 },
    { id: 'combo_15', name: '连击大师', icon: '🌟', condition: () => Game.progress.maxCombo >= 15 },
    { id: 'all_shengmu', name: '声母大师', icon: '🅰️', condition: () => Game.progress.levelStars[1] >= 2 },
    { id: 'all_yunmu', name: '韵母大师', icon: '🅱️', condition: () => Game.progress.levelStars[2] >= 2 },
    { id: 'score_1000', name: '千分宝贝', icon: '💰', condition: () => Game.progress.totalScore >= 1000 },
    { id: 'score_5000', name: '拼音富翁', icon: '👑', condition: () => Game.progress.totalScore >= 5000 },
    { id: 'king', name: '拼音国王', icon: '🏆', condition: () => Game.progress.levelStars[5] >= 2 }
  ],

  // ==================== 底部导航（统一） ====================
  renderBottomNav(activePage) {
    const reviewCount = MasterySystem.getReviewCount();
    const errorCount = ErrorBook.getErrorCount();
    const tabs = [
      { page: 'map', icon: '🗺️', label: '地图' },
      { page: 'review', icon: '📖', label: '复习', badge: reviewCount },
      { page: 'error', icon: '💝', label: '错题本', badge: errorCount },
      { page: 'achievement', icon: '🏆', label: '成就' },
      { page: 'profile', icon: '👤', label: '我的' }
    ];
    return `
      <div class="bottom-nav">
        ${tabs.map(t => `
          <div class="nav-item ${t.page === activePage ? 'active' : ''}" onclick="App.showPage('${t.page}')">
            <div class="nav-icon">${t.icon}</div>
            <span class="nav-label">${t.label}</span>
            ${t.badge ? `<span class="nav-badge">${t.badge}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  },

  // ==================== 初始化 ====================
  init() {
    Game.init();

    // 检查每日首登
    const isFirstLogin = Game.checkDailyLogin();
    if (isFirstLogin) {
      setTimeout(() => this.showFeedback('+50 每日登录奖励!', 'combo'), 500);
    }

    this.showPage('map');
    this.setupKeyboardListener();
  },

  // ==================== 页面路由 ====================
  showPage(pageName) {
    this.currentPage = pageName;
    const container = document.getElementById('app');

    switch (pageName) {
      case 'map': this.renderMapPage(container); break;
      case 'error': this.renderErrorPage(container); break;
      case 'review': this.renderReviewPage(container); break;
      case 'achievement': this.renderAchievementPage(container); break;
      case 'profile': this.renderProfilePage(container); break;
    }
  },

  // ==================== 地图页 ====================
  renderMapPage(container) {
    const reviewCount = MasterySystem.getReviewCount();
    const errorCount = ErrorBook.getErrorCount();

    let levelsHTML = '';
    for (const level of this.LEVEL_INFO) {
      const isUnlocked = level.id <= Game.progress.unlockedLevel;
      const isCurrent = level.id === Game.progress.unlockedLevel;
      const stars = Game.progress.levelStars[level.id] || 0;
      const starsStr = (stars > 0)
        ? Array(stars).fill('⭐').join('') + Array(3 - stars).fill('☆').join('')
        : '';

      const cls = isUnlocked ? (isCurrent ? 'current' : 'unlocked') : 'locked';

      levelsHTML += `
        <div class="map-level ${cls}" onclick="App.onLevelClick(${level.id})">
          <div class="level-icon">${level.icon}</div>
          <div class="level-name">${level.name}</div>
          <div class="level-desc">${level.desc}</div>
          ${starsStr ? `<div class="level-stars">${starsStr}</div>` : ''}
          ${!isUnlocked ? '<div class="lock-icon">🔒</div>' : ''}
        </div>
        ${level.id < 5 ? '<div class="map-connector"></div>' : ''}
      `;
    }

    const reviewReminder = (reviewCount > 0 || errorCount > 0) ? `
      <div class="daily-reminder" onclick="App.showPage('review')">
        ${reviewCount > 0 ? `今天有 <span class="count-badge">${reviewCount}</span> 个字需要复习` : ''}
        ${errorCount > 0 ? `${reviewCount > 0 ? '，' : ''}还有 <span class="count-badge">${errorCount}</span> 个小爱心需要你的抱抱` : ''}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="page active map-page">
        <div class="top-bar">
          <div class="avatar" ${typeof AuthUI !== 'undefined' && AuthUI.isLoggedIn() ? 'onclick="AuthUI.logout()" title="点击登出"' : ''}>🐱</div>
          <div class="player-name-bar">
            ${typeof AuthUI !== 'undefined' && AuthUI.getPlayerName() ? `<span class="player-name">${AuthUI.getPlayerName()}</span>` : ''}
            <span class="score-display">💰 ${Game.progress.totalScore}</span>
          </div>
          <div class="combo-display">
            最高连击 ${Game.progress.maxCombo}
          </div>
        </div>

        <div class="game-title">
          <h1>🩷 拼音大冒险 🩷</h1>
          <div class="subtitle">和小猫咪一起学拼音吧!</div>
        </div>

        ${reviewReminder}

        <div class="map-path">
          ${levelsHTML}
        </div>

        ${this.renderBottomNav('map')}
      </div>
    `;
  },

  // ==================== 关卡点击 ====================
  onLevelClick(levelId) {
    if (levelId > Game.progress.unlockedLevel) return;
    this.showLevelModal(levelId);
  },

  showLevelModal(levelId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'level-modal';

    let content = '';
    const info = this.LEVEL_INFO.find(l => l.id === levelId);

    switch (levelId) {
      case 1:
        content = this.renderLevel1Modal();
        break;
      case 2:
        content = this.renderLevel2Modal();
        break;
      case 3:
        content = `
          <h2>${info.icon} ${info.name}</h2>
          <p>声母+韵母合在一起，拼出完整拼音!</p>
          <button class="btn btn-primary" style="width:100%;margin-top:15px" onclick="App.startGame(3)">开始闯关</button>
        `;
        break;
      case 4:
        content = this.renderLevel4Modal();
        break;
      case 5:
        content = `
          <h2>${info.icon} ${info.name}</h2>
          <p>看拼音句子，把汉字按顺序排好! 限时挑战!</p>
          <button class="btn btn-primary" style="width:100%;margin-top:15px" onclick="App.startGame(5)">开始闯关</button>
        `;
        break;
    }

    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
        ${content}
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };
  },

  renderLevel1Modal() {
    let wavesHTML = '';
    for (let i = 0; i < SHENGMU_WAVES.length; i++) {
      const wave = SHENGMU_WAVES[i];
      wavesHTML += `
        <button class="wave-btn" onclick="App.startGame(1, ${i})">
          <div class="wave-name">${wave.name} - ${wave.desc}</div>
          <div class="wave-items">${wave.items.join('  ')}</div>
        </button>
      `;
    }
    return `
      <h2>🌲 回声森林</h2>
      <p>选择要练习的声母波次:</p>
      <div class="modal-section">${wavesHTML}</div>
    `;
  },

  renderLevel2Modal() {
    let wavesHTML = '';
    for (let i = 0; i < YUNMU_WAVES.length; i++) {
      const wave = YUNMU_WAVES[i];
      const displayItems = wave.items.map(x => x === 'v' ? 'ü' : x.replace('v', 'ü'));
      wavesHTML += `
        <button class="wave-btn" onclick="App.startGame(2, ${i})">
          <div class="wave-name">${wave.name} - ${wave.desc}</div>
          <div class="wave-items">${displayItems.join('  ')}</div>
        </button>
      `;
    }
    return `
      <h2>🌊 韵律海洋</h2>
      <p>选择要练习的韵母组:</p>
      <div class="v-hint" style="position:static;margin:10px 0">提示: 键盘 V 键 = ü</div>
      <div class="modal-section">${wavesHTML}</div>
    `;
  },

  renderLevel4Modal() {
    let groupsHTML = '';
    for (const group of HANZI_GROUPS) {
      const isUnlocked = Game.progress.unlockedGroups.includes(group.id);
      const chars = group.chars.map(c => c.hanzi).join('');
      groupsHTML += `
        <button class="group-btn ${isUnlocked ? '' : 'locked'}"
                onclick="${isUnlocked ? `App.showLevel4ModeSelect(${group.id})` : ''}">
          <div class="group-name">${group.name} ${!isUnlocked ? '🔒' : ''}</div>
          <div class="wave-items">${chars.substring(0, 15)}${chars.length > 15 ? '...' : ''}</div>
        </button>
      `;
    }
    return `
      <h2>🏰 汉字王国</h2>
      <p>选择要练习的组:</p>
      <div class="modal-section">${groupsHTML}</div>
    `;
  },

  showLevel4ModeSelect(groupId) {
    const modal = document.querySelector('.modal');
    modal.innerHTML = `
      <button class="modal-close" onclick="App.closeModal()">&times;</button>
      <h2>🏰 选择模式</h2>
      <button class="mode-btn" onclick="App.startGame(4, ${groupId}, 'A')">
        <div class="wave-name">看拼音选汉字</div>
        <div class="wave-items">看拼音，从4个汉字里选出正确的</div>
      </button>
      <button class="mode-btn" onclick="App.startGame(4, ${groupId}, 'B')">
        <div class="wave-name">看汉字打拼音</div>
        <div class="wave-items">看汉字，用键盘输入拼音（不需要声调）</div>
      </button>
    `;
  },

  closeModal() {
    const modal = document.getElementById('level-modal');
    if (modal) modal.remove();
  },

  // ==================== 开始游戏 ====================
  startGame(level, param1, param2) {
    this.closeModal();
    this.stopAllTimers();
    this.resetSpeechState();
    this.consecutiveErrors = 0;

    // 保存参数以便重试
    this._lastLevelParams = { level, param1, param2 };

    // 第1-4关: 加载 sherpa-onnx 模型 + 获取麦克风（异步，保存 Promise 供 handleAnswer 等待）
    this._micAvailable = false;
    this._sherpaLoadingPromise = null;
    if (level >= 1 && level <= 4 && SpeechModule.isSupported) {
      this._sherpaLoadingPromise = this._initSherpaAndMic();
    }

    let result;
    switch (level) {
      case 1: result = Game.startLevel1(param1); break;
      case 2: result = Game.startLevel2(param1); break;
      case 3: result = Game.startLevel3(); break;
      case 4: result = Game.startLevel4(param1, param2); break;
      case 5: result = Game.startLevel5(); break;
    }

    if (!result) return;

    // 显示关卡过渡动画
    const info = this.LEVEL_INFO.find(l => l.id === level);
    this.showLevelIntro(info, () => {
      switch (level) {
        case 1:
        case 2:
          this.renderBalloonGame(level);
          break;
        case 3:
          this.renderSynthesisGame();
          break;
        case 4:
          if (param2 === 'A') this.renderMultiChoiceGame(param1);
          else this.renderTypingGame();
          break;
        case 5:
          this.renderSentenceGame();
          break;
      }
    });
  },

  showLevelIntro(info, callback) {
    const intro = document.createElement('div');
    intro.className = 'level-intro';
    intro.innerHTML = `
      <div class="level-intro-icon">${info.icon}</div>
      <div class="level-intro-name">${info.name}</div>
      <div class="level-intro-desc">${info.desc}</div>
    `;
    document.body.appendChild(intro);
    setTimeout(() => {
      intro.remove();
      callback();
    }, 2000);
  },

  // 加载 sherpa-onnx 模型 + 麦克风（第1-4关使用）
  async _initSherpaAndMic() {
    try {
      // 1. 如果模型还没加载（例如页面初始化时失败），重试一次
      if (!this._sherpaModelReady) {
        console.log('[App] 模型未就绪，尝试加载...');
        const ok = await SpeechModule.loadModel();
        if (ok) {
          this._sherpaModelReady = true;
        } else {
          console.error('[App] sherpa-onnx 模型加载失败');
          return;
        }
      }

      // 2. 获取麦克风权限
      console.log('[App] 请求麦克风权限...');
      const micOk = await SpeechModule.initMicrophone();
      this._micAvailable = micOk;
      console.log('[App] 麦克风:', micOk ? '已获取' : '获取失败');
    } catch (e) {
      console.error('[App] _initSherpaAndMic 异常:', e);
    }
  },

  // ==================== 第一关/第二关：气球掉落 ====================
  renderBalloonGame(level) {
    const container = document.getElementById('app');
    const showVHint = level === 2;

    container.innerHTML = `
      <div class="page active game-page ${Game.state.isPinkStorm ? 'pink-storm' : ''}">
        <div class="game-header">
          <button class="back-btn" onclick="App.exitGame()">←</button>
          <div class="game-lives" id="lives">${this.heartsHTML(Game.state.lives)}</div>
          <div class="game-progress">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div class="progress-text" id="progress-text">0 / ${Game.state.totalQuestions}</div>
          </div>
          <div class="game-score" id="game-score">💰 0</div>
        </div>

        <div class="game-area">
          <div class="question-area" id="question-area">
            <div class="question-display">
              <div class="main-char" id="display-char">准备好了吗?</div>
              <div class="sub-text" id="display-hint"></div>
            </div>
            <div class="input-area" id="input-area">
              <input type="text" class="pinyin-input" id="pinyin-input"
                     placeholder="输入对应的拼音" autocomplete="off" autocapitalize="off">
              <div class="input-hint">按 Enter 确认</div>
            </div>
            <div class="waveform-container" id="speech-area" style="display:none">
              <div class="speech-prompt">现在请大声读出来!</div>
              <button class="speech-btn" id="speech-btn" onclick="App.toggleSpeech()">🎤</button>
              <canvas id="waveform-canvas" width="240" height="60"></canvas>
            </div>
          </div>
        </div>

        <div class="cat-mascot" id="cat-mascot">😺</div>
        ${showVHint ? '<div class="v-hint">提示: 键盘 V 键 = ü</div>' : ''}
      </div>
    `;

    const input = document.getElementById('pinyin-input');
    input.focus();

    // 显示第一题
    Game.startQuestion();
    this.showCurrentQuestion();
  },

  // ==================== 第三关：魔法合成炉 ====================
  renderSynthesisGame() {
    const container = document.getElementById('app');

    container.innerHTML = `
      <div class="page active game-page">
        <div class="game-header">
          <button class="back-btn" onclick="App.exitGame()">←</button>
          <div class="game-lives" id="lives">${this.heartsHTML(Game.state.lives)}</div>
          <div class="game-progress">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div class="progress-text" id="progress-text">0 / ${Game.state.totalQuestions}</div>
          </div>
          <div class="game-score" id="game-score">💰 0</div>
        </div>

        <div class="game-area">
          <div class="question-area" id="question-area">
            <div class="synthesis-area" id="synthesis-area">
              <div class="synth-part" id="synth-left"></div>
              <div class="synth-plus">+</div>
              <div class="synth-part" id="synth-right"></div>
              <button class="sound-btn" onclick="App.replaySound()" title="再听一次">🔊</button>
            </div>
            <div class="synth-result" id="synth-result"></div>
            <div class="input-area" id="input-area">
              <input type="text" class="pinyin-input" id="pinyin-input"
                     placeholder="输入合成的拼音" autocomplete="off" autocapitalize="off">
              <div class="input-hint">把声母和韵母拼在一起输入</div>
            </div>
            <div class="waveform-container" id="speech-area" style="display:none">
              <div class="speech-prompt">现在请大声读出来!</div>
              <button class="speech-btn" id="speech-btn" onclick="App.toggleSpeech()">🎤</button>
              <canvas id="waveform-canvas" width="240" height="60"></canvas>
            </div>
          </div>
        </div>

        <div class="cat-mascot" id="cat-mascot">😺</div>
      </div>
    `;

    document.getElementById('pinyin-input').focus();
    Game.startQuestion();
    this.showCurrentQuestion();
  },

  // ==================== 第四关A：看拼音选汉字 ====================
  renderMultiChoiceGame(groupId) {
    const container = document.getElementById('app');

    container.innerHTML = `
      <div class="page active game-page">
        <div class="game-header">
          <button class="back-btn" onclick="App.exitGame()">←</button>
          <div class="game-lives" id="lives">${this.heartsHTML(Game.state.lives)}</div>
          <div class="game-progress">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div class="progress-text" id="progress-text">0 / ${Game.state.totalQuestions}</div>
          </div>
          <div class="game-score" id="game-score">💰 0</div>
        </div>

        <div class="game-area">
          <div class="question-area" id="question-area">
            <div class="question-display">
              <div class="sub-text" id="display-hint"></div>
              <div class="main-char" id="display-char"></div>
            </div>
            <div class="options-area" id="options-area"></div>
            <div class="waveform-container" id="speech-area" style="display:none">
              <div class="speech-prompt">现在请大声读出来!</div>
              <button class="speech-btn" id="speech-btn" onclick="App.toggleSpeech()">🎤</button>
              <canvas id="waveform-canvas" width="240" height="60"></canvas>
            </div>
          </div>
        </div>

        <div class="cat-mascot" id="cat-mascot">😺</div>
      </div>
    `;

    Game.startQuestion();
    this.showCurrentQuestion();
  },

  // ==================== 第四关B：看汉字打拼音 ====================
  renderTypingGame() {
    const container = document.getElementById('app');

    container.innerHTML = `
      <div class="page active game-page">
        <div class="game-header">
          <button class="back-btn" onclick="App.exitGame()">←</button>
          <div class="game-lives" id="lives">${this.heartsHTML(Game.state.lives)}</div>
          <div class="game-progress">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div class="progress-text" id="progress-text">0 / ${Game.state.totalQuestions}</div>
          </div>
          <div class="game-score" id="game-score">💰 0</div>
        </div>

        <div class="game-area">
          <div class="question-area" id="question-area">
            <div class="question-display">
              <div class="main-char" id="display-char"></div>
              <div class="sub-text" id="display-hint"></div>
            </div>
            <div class="input-area" id="input-area">
              <input type="text" class="pinyin-input" id="pinyin-input"
                     placeholder="输入拼音（不需要声调）" autocomplete="off" autocapitalize="off">
              <div class="input-hint">按 Enter 确认</div>
            </div>
            <div class="waveform-container" id="speech-area" style="display:none">
              <div class="speech-prompt">现在请大声读出来!</div>
              <button class="speech-btn" id="speech-btn" onclick="App.toggleSpeech()">🎤</button>
              <canvas id="waveform-canvas" width="240" height="60"></canvas>
            </div>
          </div>
        </div>

        <div class="cat-mascot" id="cat-mascot">😺</div>
        <div class="v-hint">提示: 键盘 V 键 = ü (如：绿 = lv)</div>
      </div>
    `;

    document.getElementById('pinyin-input').focus();
    Game.startQuestion();
    this.showCurrentQuestion();
  },

  // ==================== 第五关：文字保卫战 ====================
  renderSentenceGame() {
    const container = document.getElementById('app');

    container.innerHTML = `
      <div class="page active game-page">
        <div class="game-header">
          <button class="back-btn" onclick="App.exitGame()">←</button>
          <div class="game-lives" id="lives">${this.heartsHTML(Game.state.lives)}</div>
          <div class="game-progress">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div class="progress-text" id="progress-text">0 / ${Game.state.totalQuestions}</div>
          </div>
          <div class="game-score" id="game-score">💰 0</div>
        </div>

        <div class="game-area">
          <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="width:100%"></div></div>
          <div class="question-area" id="question-area">
            <div class="sentence-display" id="sentence-display"></div>
            <div class="sentence-slots" id="sentence-slots"></div>
            <div class="char-cards" id="char-cards"></div>
          </div>
        </div>

        <div class="cat-mascot" id="cat-mascot">😺</div>
      </div>
    `;

    Game.startQuestion();
    this.showCurrentQuestion();
  },

  // ==================== 显示当前题目 ====================
  showCurrentQuestion() {
    const q = Game.getCurrentQuestion();
    if (!q) return;

    const level = Game.state.currentLevel;

    switch (q.type) {
      case 'shengmu':
      case 'yunmu':
        this.showLetterQuestion(q);
        break;
      case 'liangpin':
        this.showSynthesisQuestion(q);
        break;
      case 'pinyin2hanzi':
        this.showMultiChoiceQuestion(q);
        break;
      case 'hanzi2pinyin':
        this.showTypingQuestion(q);
        break;
      case 'sentence':
        this.showSentenceQuestion(q);
        break;
    }

    this.updateProgressUI();
  },

  showLetterQuestion(q) {
    const displayChar = document.getElementById('display-char');
    const displayHint = document.getElementById('display-hint');
    const input = document.getElementById('pinyin-input');
    const inputArea = document.getElementById('input-area');
    const speechArea = document.getElementById('speech-area');

    if (displayChar) displayChar.innerHTML = `${q.display} <button class="sound-btn" onclick="App.replaySound()" title="再听一次">🔊</button>`;
    if (displayHint) displayHint.textContent = q.type === 'shengmu' ? '请输入这个声母' : '请输入这个韵母';
    // Restore input area visibility, hide speech area
    if (inputArea) inputArea.style.display = '';
    if (speechArea) {
      speechArea.style.display = 'none';
      speechArea.classList.remove('active');
    }
    if (input) {
      input.value = '';
      input.classList.remove('correct', 'wrong');
      input.focus();
    }
  },

  showSynthesisQuestion(q) {
    const left = document.getElementById('synth-left');
    const right = document.getElementById('synth-right');
    const result = document.getElementById('synth-result');
    const input = document.getElementById('pinyin-input');
    const inputArea = document.getElementById('input-area');
    const speechArea = document.getElementById('speech-area');

    if (left) left.textContent = q.shengmu;
    if (right) right.textContent = q.yunmu;
    if (result) result.textContent = '';
    // Restore input area visibility, hide speech area
    if (inputArea) inputArea.style.display = '';
    if (speechArea) {
      speechArea.style.display = 'none';
      speechArea.classList.remove('active');
    }
    if (input) {
      input.value = '';
      input.classList.remove('correct', 'wrong');
      input.focus();
    }
  },

  showMultiChoiceQuestion(q) {
    const displayChar = document.getElementById('display-char');
    const displayHint = document.getElementById('display-hint');
    const optionsArea = document.getElementById('options-area');
    const speechArea = document.getElementById('speech-area');

    if (displayChar) displayChar.textContent = q.display;
    if (displayHint) displayHint.textContent = '选出正确的汉字';
    // Restore options visibility, hide speech area
    if (optionsArea) {
      optionsArea.style.display = '';
      optionsArea.innerHTML = q.options.map(opt => `
        <button class="option-btn" onclick="App.submitOption('${opt}', this)">${opt}</button>
      `).join('');
    }
    if (speechArea) {
      speechArea.style.display = 'none';
      speechArea.classList.remove('active');
    }
  },

  showTypingQuestion(q) {
    const displayChar = document.getElementById('display-char');
    const displayHint = document.getElementById('display-hint');
    const input = document.getElementById('pinyin-input');
    const inputArea = document.getElementById('input-area');
    const speechArea = document.getElementById('speech-area');

    if (displayChar) displayChar.textContent = q.display;
    if (displayHint) displayHint.textContent = '请输入这个字的拼音';
    // Restore input area visibility, hide speech area
    if (inputArea) inputArea.style.display = '';
    if (speechArea) {
      speechArea.style.display = 'none';
      speechArea.classList.remove('active');
    }
    if (input) {
      input.value = '';
      input.classList.remove('correct', 'wrong');
      input.focus();
    }
  },

  showSentenceQuestion(q) {
    const sentenceDisplay = document.getElementById('sentence-display');
    const slotsContainer = document.getElementById('sentence-slots');
    const cardsContainer = document.getElementById('char-cards');

    if (sentenceDisplay) sentenceDisplay.textContent = q.pinyin;

    // 创建空槽
    if (slotsContainer) {
      slotsContainer.innerHTML = q.chars.map((_, i) =>
        `<div class="sentence-slot" data-index="${i}"></div>`
      ).join('');
    }

    // 创建打乱的汉字卡片
    if (cardsContainer) {
      this._sentenceSelected = [];
      cardsContainer.innerHTML = q.shuffledChars.map((ch, i) =>
        `<div class="char-card" data-idx="${i}" onclick="App.selectSentenceChar(this, '${ch}')">${ch}</div>`
      ).join('');
    }

    // 启动计时器 (每题30秒)
    this.startLevel5Timer(30);
  },

  _sentenceSelected: [],

  selectSentenceChar(cardEl, char) {
    if (cardEl.classList.contains('used')) return;

    cardEl.classList.add('used');
    this._sentenceSelected.push(char);

    // 填入对应槽位
    const slots = document.querySelectorAll('.sentence-slot');
    const idx = this._sentenceSelected.length - 1;
    if (slots[idx]) {
      slots[idx].textContent = char;
      slots[idx].classList.add('filled');
    }

    // 检查是否填完
    const q = Game.getCurrentQuestion();
    if (this._sentenceSelected.length === q.chars.length) {
      this.stopLevel5Timer();
      const answer = this._sentenceSelected.join('');
      this.handleAnswer(answer);
    }
  },

  startLevel5Timer(seconds) {
    this.level5TimeLeft = seconds;
    const timerFill = document.getElementById('timer-fill');
    this.level5Timer = setInterval(() => {
      this.level5TimeLeft -= 0.1;
      if (timerFill) {
        timerFill.style.width = (this.level5TimeLeft / seconds * 100) + '%';
      }
      if (this.level5TimeLeft <= 0) {
        this.stopLevel5Timer();
        // 超时算错
        this.handleAnswer('__timeout__');
      }
    }, 100);
  },

  stopLevel5Timer() {
    if (this.level5Timer) {
      clearInterval(this.level5Timer);
      this.level5Timer = null;
    }
  },

  // ==================== 输入处理 ====================
  setupKeyboardListener() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // If waiting for speech, don't process keyboard input
        if (this._waitingForSpeech) return;

        const input = document.getElementById('pinyin-input');
        if (input && document.activeElement === input) {
          const value = input.value.trim().toLowerCase();
          if (value) {
            this.handleAnswer(value);
          }
        }
      }
    });
  },

  submitOption(answer, btnEl) {
    // 禁止连续点击
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.style.pointerEvents = 'none');

    this.handleAnswer(answer, btnEl);
  },

  async handleAnswer(answer, optionBtnEl) {
    const level = Game.state.currentLevel;
    const isLevel1to4 = level >= 1 && level <= 4;

    console.log('[handleAnswer] level:', level, 'isLevel1to4:', isLevel1to4, 'waitingForSpeech:', this._waitingForSpeech, 'micAvailable:', this._micAvailable, 'answer:', answer);

    // For levels 1-4: if typing/selection is correct, don't submit yet — enter speech phase
    if (isLevel1to4 && !this._waitingForSpeech) {
      const q = Game.getCurrentQuestion();
      if (!q) return;
      const isCorrect = answer.toLowerCase().trim() === q.answer.toLowerCase().trim();
      console.log('[handleAnswer] q.type:', q.type, 'q.answer:', q.answer, 'isCorrect:', isCorrect);

      if (isCorrect) {
        // 如果 sherpa-onnx 还在加载中，先等待
        if (!this._micAvailable && this._sherpaLoadingPromise) {
          const input = document.getElementById('pinyin-input');
          if (input) input.classList.add('correct');
          this.showFeedback('语音模型加载中，请稍候...', 'combo');
          await this._sherpaLoadingPromise;
        }

        // 模型和麦克风都就绪时进入语音验证
        if (this._micAvailable) {
          // Typing/selection correct — enter speech verification phase
          const input = document.getElementById('pinyin-input');
          if (input) input.classList.add('correct');

          this._waitingForSpeech = true;
          this._currentTypedCorrect = q;
          this._speechErrorCount = 0;

          // Determine speech match params based on question type
          if (q.type === 'pinyin2hanzi') {
            // Mode A: display=pinyin, answer=hanzi, input=pinyin without tone
            this._speechPinyinKey = q.input;
            this._speechHanzi = q.answer;
          } else if (q.type === 'hanzi2pinyin') {
            // Mode B: display=hanzi, answer=pinyin
            this._speechPinyinKey = q.answer;
            this._speechHanzi = q.display;
          } else {
            // Levels 1-3: shengmu/yunmu/liangpin
            this._speechPinyinKey = q.answer;
            this._speechHanzi = q.hanzi;
          }

          // Show synthesis result for level 3
          if (q.type === 'liangpin') {
            const synthResult = document.getElementById('synth-result');
            if (synthResult) synthResult.textContent = `${q.hanzi} (${q.display})`;
          }

          // Hide input area, show speech area
          const inputArea = document.getElementById('input-area');
          const speechArea = document.getElementById('speech-area');
          if (inputArea) inputArea.style.display = 'none';
          if (speechArea) speechArea.style.display = 'flex';

          // For Mode A (multi-choice): highlight correct option, hide options
          if (q.type === 'pinyin2hanzi' && optionBtnEl) {
            optionBtnEl.classList.add('correct');
            const optionsArea = document.getElementById('options-area');
            if (optionsArea) optionsArea.style.display = 'none';
          }

          // Auto-start speech listening + waveform
          this._startSpeechRecognition();

          return; // Don't submit to Game yet
        }
        // 如果模型加载失败或麦克风不可用，降级为纯打字模式
        console.warn('[App] sherpa-onnx 不可用，降级为纯打字模式');
      }
      // Typing wrong — fall through to normal flow (immediate wrong)
    }

    const result = Game.submitAnswer(answer);
    if (!result) return;

    if (result.correct) {
      this.onCorrectAnswer(result, optionBtnEl);
    } else {
      this.onWrongAnswer(result, answer, optionBtnEl);
    }

    // 检查游戏结束
    if (result.gameOver) {
      setTimeout(() => this.showResultPage(result), 1200);
      return;
    }

    // 显示下一题
    setTimeout(() => {
      this.showCurrentQuestion();
    }, result.correct ? 800 : 1500);
  },

  // 语音验证通过
  handleSpeechResult() {
    if (!this._waitingForSpeech || !this._currentTypedCorrect) return;
    if (this._speechStopTimer) { clearTimeout(this._speechStopTimer); this._speechStopTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }

    const q = this._currentTypedCorrect;
    this._waitingForSpeech = false;
    this._currentTypedCorrect = null;
    this.stopWaveform();
    SpeechModule.stopListening();

    // Hide speech area, reset button
    const speechArea = document.getElementById('speech-area');
    if (speechArea) { speechArea.style.display = 'none'; speechArea.classList.remove('active'); }
    const btn = document.getElementById('speech-btn');
    if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }

    const result = Game.submitAnswer(q.answer, true);
    if (!result) return;

    this.onCorrectAnswer(result);

    if (result.gameOver) {
      setTimeout(() => this.showResultPage(result), 1200);
      return;
    }

    setTimeout(() => {
      // Restore input/options visibility for next question
      const inputArea = document.getElementById('input-area');
      if (inputArea) inputArea.style.display = '';
      const optionsArea = document.getElementById('options-area');
      if (optionsArea) optionsArea.style.display = '';
      this.showCurrentQuestion();
    }, 800);
  },

  // 启动10秒录音识别窗口（sherpa-onnx 持续识别，无需循环重启）
  _startSpeechRecognition() {
    if (!this._waitingForSpeech) return;
    if (this._speechStopTimer) { clearTimeout(this._speechStopTimer); this._speechStopTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }

    this._speechResults = [];

    // Start sherpa-onnx listening with result callbacks
    const started = SpeechModule.startListening(
      // onResult: each final recognition result
      (text) => {
        this._speechResults.push(text);
        console.log('[App] sherpa 识别到:', text);
        // 实时匹配：如果已匹配到，立即通过（不等10秒）
        if (this._waitingForSpeech && this._currentTypedCorrect) {
          if (SpeechModule.matchSpeechForPinyin(this._speechResults, this._speechPinyinKey, this._speechHanzi)) {
            console.log('[App] 实时匹配成功!');
            // setTimeout to avoid stopListening inside recognizer callback
            setTimeout(() => this.handleSpeechResult(), 0);
          }
        }
      },
      // onPartialResult: show partial text in UI
      (partial) => {
        const prompt = document.querySelector('.speech-prompt');
        if (prompt && this._countdownSec > 0) {
          prompt.textContent = `听到: ${partial} (${this._countdownSec})`;
        }
      }
    );

    if (!started) {
      console.warn('[App] sherpa startListening failed');
      this.showFeedback('语音识别启动失败', 'wrong');
      return;
    }

    // Show speech UI
    const container = document.getElementById('speech-area');
    if (container) container.classList.add('active');
    const btn = document.getElementById('speech-btn');
    if (btn) { btn.classList.add('listening'); btn.textContent = '🔴'; }
    this.drawWaveform();

    // 10秒后强制结束，用收集的全部结果匹配
    this._speechStopTimer = setTimeout(() => {
      this._speechStopTimer = null;
      SpeechModule.stopListening();
      this._doSpeechMatch();
    }, 10000);

    // 倒计时UI
    const prompt = document.querySelector('.speech-prompt');
    if (prompt) prompt.textContent = '请大声读! (10)';
    this._countdownSec = 10;
    this._countdownTimer = setInterval(() => {
      this._countdownSec--;
      const p = document.querySelector('.speech-prompt');
      if (this._countdownSec > 0) {
        if (p) p.textContent = `请大声读! (${this._countdownSec})`;
      } else {
        clearInterval(this._countdownTimer);
        this._countdownTimer = null;
        if (p) p.textContent = '识别中...';
      }
    }, 1000);
  },

  // 10秒录音结束后匹配判定
  _doSpeechMatch() {
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
    if (!this._waitingForSpeech) return;
    const q = this._currentTypedCorrect;
    if (!q) return;

    const allResults = this._speechResults || [];
    const pinyinKey = this._speechPinyinKey;
    const hanzi = this._speechHanzi;
    console.log('[Sherpa] 10秒结束，全部结果:', allResults, '期望:', pinyinKey, hanzi);

    if (allResults.length === 0) {
      this._speechErrorCount++;
      // 连续3次没听到声音 → 自动通过（可能是麦克风问题）
      if (this._speechErrorCount >= 3) {
        this.showFeedback('继续下一题吧!', 'combo');
        this.setCatMood('neutral');
        setTimeout(() => this.handleSpeechResult(), 1000);
        return;
      }
      this.showFeedback('没有听到声音，请再读一次!', 'wrong');
      this.setCatMood('sad');
      setTimeout(() => { if (this._waitingForSpeech) this._startSpeechRecognition(); }, 1500);
      return;
    }

    const matched = SpeechModule.matchSpeechForPinyin(allResults, pinyinKey, hanzi);
    if (matched) {
      this.handleSpeechResult();
    } else {
      this._speechErrorCount++;
      Game.state.speechErrors = (Game.state.speechErrors || 0) + 1;
      // 3次失败且确实检测到了语音 → 自动通过，避免孩子沮丧
      if (this._speechErrorCount >= 3 && allResults.length > 0) {
        SpeechModule.playStandardSound(pinyinKey, hanzi);
        this.showFeedback('不错，继续加油!', 'combo');
        this.setCatMood('neutral');
        setTimeout(() => this.handleSpeechResult(), 1500);
        return;
      }
      if (this._speechErrorCount >= 2) {
        SpeechModule.playStandardSound(pinyinKey, hanzi);
        this.showFeedback('听标准发音，请跟着读!', 'combo');
        this.setCatMood('neutral');
      } else {
        this.showFeedback('再读一次!', 'wrong');
        this.setCatMood('sad');
      }
      setTimeout(() => { if (this._waitingForSpeech) this._startSpeechRecognition(); }, 2000);
    }
  },

  onCorrectAnswer(result, optionBtnEl) {
    this.consecutiveErrors = 0;
    const input = document.getElementById('pinyin-input');

    if (optionBtnEl) {
      optionBtnEl.classList.add('correct');
    } else if (input) {
      input.classList.add('correct');
    }

    // 合成炉：显示结果
    if (result.question.type === 'liangpin') {
      const synthResult = document.getElementById('synth-result');
      if (synthResult) {
        synthResult.textContent = `${result.question.hanzi} (${result.question.display})`;
      }
    }

    // 反馈
    this.showFeedback(`+${result.score}`, 'correct');
    this.setCatMood('happy');
    this.spawnCoinEffect();

    // Combo
    if (result.combo >= 5) {
      this.showComboPopup(result.combo);
    }

    // 粉色风暴
    if (result.pinkStorm) {
      this.activatePinkStorm();
    }

    this.updateGameUI(result);
  },

  onWrongAnswer(result, wrongAnswer, optionBtnEl) {
    this.consecutiveErrors++;
    const input = document.getElementById('pinyin-input');

    if (optionBtnEl) {
      optionBtnEl.classList.add('wrong');
      // 显示正确答案
      const buttons = document.querySelectorAll('.option-btn');
      buttons.forEach(b => {
        if (b.textContent === result.question.answer) {
          b.classList.add('correct');
        }
      });
    } else if (input) {
      input.classList.add('wrong');
    }

    this.showFeedback(`正确答案: ${result.question.answer}`, 'wrong');
    this.setCatMood('sad');

    // 粉色风暴结束
    const gameEl = document.querySelector('.game-page');
    if (gameEl) gameEl.classList.remove('pink-storm');

    // 连续错2次显示键位提示
    if (this.consecutiveErrors >= 2) {
      this.showKeyHint(result.question);
    }

    this.updateGameUI(result);
  },

  // ==================== 标准发音重播 ====================
  replaySound() {
    // Use stored speech params when in speech phase, else derive from current question
    if (this._waitingForSpeech && this._speechPinyinKey) {
      SpeechModule.playStandardSound(this._speechPinyinKey, this._speechHanzi);
      return;
    }
    const q = this._currentTypedCorrect || Game.getCurrentQuestion();
    if (!q) return;
    SpeechModule.playStandardSound(q.answer, q.hanzi);
  },

  // ==================== 语音录音 ====================
  toggleSpeech() {
    const btn = document.getElementById('speech-btn');
    if (!btn) return;

    if (this._waveformAnimFrame) {
      // 正在录音 → 停止
      if (this._speechStopTimer) { clearTimeout(this._speechStopTimer); this._speechStopTimer = null; }
      if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
      this.stopWaveform();
      SpeechModule.stopListening();
      btn.classList.remove('listening');
      btn.textContent = '🎤';
      const container = document.getElementById('speech-area');
      if (container) container.classList.remove('active');
    } else {
      // 重新开始
      this._startSpeechRecognition();
    }
  },

  // ==================== 声纹绘制 ====================
  drawWaveform() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const barCount = 32;
    const barWidth = W / barCount * 0.6;
    const gap = W / barCount * 0.4;

    const draw = () => {
      this._waveformAnimFrame = requestAnimationFrame(draw);

      const data = SpeechModule.getFrequencyData();
      ctx.clearRect(0, 0, W, H);

      if (!data) return;

      const step = Math.floor(data.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const val = data[i * step] / 255;
        const barH = Math.max(2, val * H * 0.9);
        const x = i * (barWidth + gap) + gap / 2;
        const y = H - barH;

        const gradient = ctx.createLinearGradient(x, y, x, H);
        gradient.addColorStop(0, 'rgba(255, 105, 180, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 182, 193, 0.5)');
        ctx.fillStyle = gradient;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barH);
        }
      }

    };

    draw();
  },

  stopWaveform() {
    if (this._waveformAnimFrame) {
      cancelAnimationFrame(this._waveformAnimFrame);
      this._waveformAnimFrame = null;
    }
    const canvas = document.getElementById('waveform-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },

  // ==================== UI 更新 ====================
  updateGameUI(result) {
    const scoreEl = document.getElementById('game-score');
    const livesEl = document.getElementById('lives');

    if (scoreEl) scoreEl.textContent = `💰 ${Game.state.score}`;
    if (livesEl) livesEl.innerHTML = this.heartsHTML(Game.state.lives);
  },

  updateProgressUI() {
    const fillEl = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');
    const idx = Game.state.questionIndex;
    const total = Game.state.currentQuestions.length;

    if (fillEl) fillEl.style.width = (idx / total * 100) + '%';
    if (textEl) textEl.textContent = `${idx} / ${total}`;
  },

  heartsHTML(count) {
    return '❤️'.repeat(Math.max(0, count)) + '🖤'.repeat(Math.max(0, 3 - count));
  },

  // ==================== 特效 ====================
  showFeedback(text, type) {
    const el = document.createElement('div');
    el.className = `feedback ${type}-feedback`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  },

  showComboPopup(combo) {
    const el = document.createElement('div');
    el.className = 'combo-popup';
    el.textContent = `${combo} 连击! x${Game.getComboMultiplier()}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },

  spawnCoinEffect() {
    const el = document.createElement('div');
    el.className = 'coin-fly';
    el.textContent = '💰';
    el.style.left = (30 + Math.random() * 40) + '%';
    el.style.top = '50%';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  },

  setCatMood(mood) {
    const cat = document.getElementById('cat-mascot');
    if (!cat) return;

    cat.className = 'cat-mascot';
    if (mood === 'happy') {
      cat.textContent = '😻';
      cat.classList.add('happy');
    } else if (mood === 'sad') {
      cat.textContent = '🙀';
      cat.classList.add('sad');
    } else {
      cat.textContent = '😺';
    }

    setTimeout(() => {
      if (cat) {
        cat.textContent = '😺';
        cat.className = 'cat-mascot';
      }
    }, 1500);
  },

  activatePinkStorm() {
    const gameEl = document.querySelector('.game-page');
    if (gameEl) gameEl.classList.add('pink-storm');

    // 飘花瓣
    for (let i = 0; i < 20; i++) {
      setTimeout(() => this.spawnPetal(), i * 150);
    }

    this.showFeedback('粉色风暴!', 'combo');
  },

  spawnPetal() {
    const petal = document.createElement('div');
    petal.className = 'petal';
    petal.style.left = Math.random() * 100 + '%';
    petal.style.top = '-20px';
    petal.style.animationDuration = (3 + Math.random() * 3) + 's';
    document.body.appendChild(petal);
    setTimeout(() => petal.remove(), 6000);
  },

  showKeyHint(question) {
    const hint = document.createElement('div');
    hint.className = 'key-hint-popup';
    hint.textContent = `提示: 答案是 "${question.answer}"`;
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 3000);
  },

  spawnConfetti() {
    const colors = ['#ff69b4', '#ffd700', '#90ee90', '#87ceeb', '#dda0dd'];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.top = '-10px';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        c.style.width = (6 + Math.random() * 8) + 'px';
        c.style.height = (6 + Math.random() * 8) + 'px';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3000);
      }, i * 50);
    }
  },

  // ==================== 结算页 ====================
  showResultPage(result) {
    this.stopAllTimers();

    const container = document.getElementById('app');
    const success = result.lives > 0 && result.stars >= 1;
    const starsStr = Array(result.stars).fill('⭐').join('') +
                     Array(3 - result.stars).fill('☆').join('');

    // 解锁下一组（第四关）
    if (Game.state.currentLevel === 4 && result.accuracy >= 0.8) {
      const currentGroup = Game.state.currentQuestions[0];
      if (currentGroup) {
        // 找到当前组ID
        for (const g of HANZI_GROUPS) {
          const found = g.chars.some(c =>
            c.hanzi === currentGroup.display || c.hanzi === currentGroup.answer
          );
          if (found && !Game.progress.unlockedGroups.includes(g.id + 1)) {
            if (g.id < 15) {
              Game.progress.unlockedGroups.push(g.id + 1);
              Game.saveProgress();
            }
            break;
          }
        }
      }
    }

    container.innerHTML = `
      <div class="page active result-page">
        <div class="result-title">${success ? '闯关成功!' : '加油，再试试!'}</div>
        <div class="result-stars">${starsStr}</div>

        <div class="result-stats">
          <div class="result-stat">
            <span>获得金币</span>
            <span class="stat-value">💰 ${result.score}</span>
          </div>
          <div class="result-stat">
            <span>正确率</span>
            <span class="stat-value">${Math.round(result.accuracy * 100)}%</span>
          </div>
          <div class="result-stat">
            <span>最高连击</span>
            <span class="stat-value">🔥 ${result.maxCombo}</span>
          </div>
          <div class="result-stat">
            <span>正确 / 总题数</span>
            <span class="stat-value">${result.correctCount} / ${result.totalQuestions}</span>
          </div>
          ${result.wrongCount > 0 ? `
            <div class="result-stat">
              <span>打字错误</span>
              <span class="stat-value">✏️ ${result.wrongCount}</span>
            </div>
          ` : ''}
          ${result.speechErrors > 0 ? `
            <div class="result-stat">
              <span>语音读错</span>
              <span class="stat-value">🎤 ${result.speechErrors}</span>
            </div>
          ` : ''}
          ${result.perfectBonus > 0 ? `
            <div class="result-stat">
              <span>全对奖励</span>
              <span class="stat-value">+${result.perfectBonus}</span>
            </div>
          ` : ''}
        </div>

        <div class="result-buttons">
          <button class="btn btn-secondary" onclick="App.showPage('map')">回到地图</button>
          <button class="btn btn-primary" onclick="App.retryLevel()">再练一次</button>
        </div>
      </div>
    `;

    if (success) {
      this.spawnConfetti();
    }
  },

  retryLevel() {
    if (this._lastLevelParams) {
      const { level, param1, param2 } = this._lastLevelParams;
      this.startGame(level, param1, param2);
    } else {
      this.showPage('map');
    }
  },

  exitGame() {
    this.stopAllTimers();
    this.resetSpeechState();
    SpeechModule.stopListening();
    SpeechModule.releaseMicrophone();
    Game.state.isRunning = false;
    this.showPage('map');
  },

  resetSpeechState() {
    this._waitingForSpeech = false;
    this._currentTypedCorrect = null;
    this._speechErrorCount = 0;
    this._speechPinyinKey = null;
    this._speechHanzi = null;
    if (this._speechStopTimer) { clearTimeout(this._speechStopTimer); this._speechStopTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
    this.stopWaveform();
    SpeechModule.stopListening();
  },

  stopAllTimers() {
    if (this.balloonInterval) {
      clearInterval(this.balloonInterval);
      this.balloonInterval = null;
    }
    if (this.balloonAnimFrame) {
      cancelAnimationFrame(this.balloonAnimFrame);
      this.balloonAnimFrame = null;
    }
    this.stopLevel5Timer();
  },

  // ==================== 错题本页 ====================
  renderErrorPage(container) {
    const errors = ErrorBook.getErrorList();

    let listHTML = '';
    if (errors.length === 0) {
      listHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <div>太棒了! 没有需要复习的错题!</div>
        </div>
      `;
    } else {
      listHTML = errors.map(err => {
        const dots = Array(3).fill(0).map((_, i) =>
          `<div class="progress-dot ${i < err.consecutiveCorrect ? 'filled' : ''}"></div>`
        ).join('');
        return `
          <div class="error-item">
            <div class="char-display">${err.char}</div>
            <div class="error-info">
              <div class="pinyin-label">正确答案: ${err.correctAnswer}</div>
              <div class="error-count">需要抱抱 ${err.errorCount} 次</div>
            </div>
            <div class="progress-dots">${dots}</div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="page active error-page">
        <div class="top-bar">
          <button class="back-btn" onclick="App.showPage('map')">←</button>
          <div style="font-size:20px;font-weight:bold">这些小爱心需要你的抱抱</div>
          <div></div>
        </div>
        <div class="section-subtitle">答对3次就可以毕业哦!</div>
        <div class="error-list">${listHTML}</div>

        ${errors.length > 0 ? `
          <div style="text-align:center;margin:20px">
            <button class="btn btn-primary" onclick="App.startErrorPractice()">开始练习错题</button>
          </div>
        ` : ''}

        ${this.renderBottomNav('error')}
      </div>
    `;
  },

  startErrorPractice() {
    // 用错题创建一个打字练习
    const errors = ErrorBook.getErrorList();
    if (errors.length === 0) return;

    Game.resetState();
    Game.state.currentLevel = 4;
    Game.state.isRunning = true;

    const questions = errors.map((err, i) => ({
      type: 'hanzi2pinyin',
      display: err.char,
      answer: err.correctAnswer,
      pinyin: err.correctAnswer,
      id: `err_${err.char}_${i}`
    }));

    Game.state.currentQuestions = Game.shuffle(questions);
    Game.state.totalQuestions = questions.length;

    this.renderTypingGame();
  },

  // ==================== 复习页 ====================
  renderReviewPage(container) {
    const plan = MasterySystem.getDailyPlan();
    const stats = MasterySystem.getStats();
    const reviewItems = MasterySystem.getReviewItems();

    // 难度标签
    const difficultyLabel = (ef) => {
      if (ef == null) return '';
      if (ef >= 2.3) return '<span class="diff-tag easy">简单</span>';
      if (ef >= 1.8) return '<span class="diff-tag medium">一般</span>';
      return '<span class="diff-tag hard">困难</span>';
    };

    let listHTML = '';
    if (reviewItems.length === 0) {
      listHTML = `
        <div class="empty-state">
          <div class="empty-icon">✨</div>
          <div>今天没有需要复习的内容!</div>
        </div>
      `;
    } else {
      // 超期提示
      const urgentCount = reviewItems.filter(i => MasterySystem.overdueDays(i) >= 3).length;
      if (urgentCount > 0) {
        listHTML += `<div class="urgent-notice">有 ${urgentCount} 个字超期3天以上未复习!</div>`;
      }

      // 每日计划摘要
      listHTML += `
        <div class="plan-summary">
          <span>今日计划: 必练 ${plan.must.length}</span>
          ${plan.optional.length > 0 ? `<span> / 选练 ${plan.optional.length}</span>` : ''}
          ${plan.deferred.length > 0 ? `<span> / 待复习 ${plan.deferred.length}</span>` : ''}
        </div>
      `;

      listHTML += reviewItems.map(item => {
        const levelBars = Array(5).fill(0).map((_, i) =>
          `<div class="progress-dot ${i < item.masteryLevel ? 'filled' : ''}"></div>`
        ).join('');
        const overdue = MasterySystem.overdueDays(item);
        const overdueTag = overdue >= 3
          ? `<span class="overdue-tag">超期${overdue}天</span>`
          : overdue > 0
            ? `<span class="overdue-tag mild">超期${overdue}天</span>`
            : '';
        return `
          <div class="review-item${overdue >= 3 ? ' urgent' : ''}">
            <div class="char-display">${item.char}</div>
            <div class="error-info">
              <div class="pinyin-label">掌握度: ${item.masteryLevel}/5 ${difficultyLabel(item.easeFactor)}</div>
              <div class="error-count">上次: ${item.lastPracticeDate || '从未'} ${overdueTag}</div>
            </div>
            <div class="progress-dots">${levelBars}</div>
          </div>
        `;
      }).join('');
    }

    // 最难的字（SM-2 难度因子最低的）
    let hardestHTML = '';
    if (stats.hardest && stats.hardest.length > 0) {
      hardestHTML = `
        <div class="hardest-section">
          <div class="section-subtitle">最需要加油的字</div>
          <div class="hardest-chars">
            ${stats.hardest.map(h => `<span class="hardest-char">${h.char}</span>`).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page active review-page">
        <div class="top-bar">
          <button class="back-btn" onclick="App.showPage('map')">←</button>
          <div style="font-size:20px;font-weight:bold">复习时间</div>
          <div></div>
        </div>
        <div class="section-subtitle">SM-2 智能复习 - 难的字练得更多</div>
        ${hardestHTML}
        <div class="review-list">${listHTML}</div>

        ${reviewItems.length > 0 ? `
          <div style="text-align:center;margin:20px">
            <button class="btn btn-primary" onclick="App.startReviewPractice()">开始复习 (${Math.min(reviewItems.length, 20)}个)</button>
          </div>
        ` : ''}

        ${this.renderBottomNav('review')}
      </div>
    `;
  },

  startReviewPractice() {
    const plan = MasterySystem.getDailyPlan();
    const reviewItems = plan.must.concat(plan.optional);
    if (reviewItems.length === 0) return;

    Game.resetState();
    Game.state.currentLevel = 4;
    Game.state.isRunning = true;

    // 从所有组中找到对应的拼音数据
    const allChars = HANZI_GROUPS.flatMap(g => g.chars);

    const questions = reviewItems.map((item, i) => {
      const charData = allChars.find(c => c.hanzi === item.char);
      return {
        type: 'hanzi2pinyin',
        display: item.char,
        answer: charData ? charData.input : item.char,
        pinyin: charData ? charData.pinyin : item.char,
        id: `rev_${item.char}_${i}`
      };
    });

    Game.state.currentQuestions = Game.shuffle(questions);
    Game.state.totalQuestions = questions.length;

    this.renderTypingGame();
  },

  // ==================== 成就页 ====================
  renderAchievementPage(container) {
    const stats = MasterySystem.getStats();

    const badgesHTML = this.BADGES.map(badge => {
      const unlocked = badge.condition();
      return `
        <div class="badge ${unlocked ? '' : 'locked'}">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-name">${badge.name}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="page active achievement-page">
        <div class="top-bar">
          <button class="back-btn" onclick="App.showPage('map')">←</button>
          <div style="font-size:20px;font-weight:bold">我的成就</div>
          <div></div>
        </div>

        <div class="section-title">学习统计</div>
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-number">💰 ${Game.progress.totalScore}</div>
            <div class="stat-label">总积分</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">🔥 ${Game.progress.maxCombo}</div>
            <div class="stat-label">最高连击</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">✅ ${stats.mastered}</div>
            <div class="stat-label">已掌握</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">📚 ${stats.learning}</div>
            <div class="stat-label">学习中</div>
          </div>
        </div>

        <div class="section-title">勋章墙</div>
        <div class="badge-grid">${badgesHTML}</div>

        ${this.renderBottomNav('achievement')}
      </div>
    `;
  },

  // ==================== 个人中心 + 记忆曲线 ====================
  renderProfilePage(container) {
    const stats = MasterySystem.getStats();
    const playerName = typeof AuthUI !== 'undefined' ? AuthUI.getPlayerName() : '';
    const isLoggedIn = typeof AuthUI !== 'undefined' && AuthUI.isLoggedIn();

    // 计算学习天数
    const all = MasterySystem.getAll();
    const dates = new Set();
    for (const key in all) {
      if (all[key].lastPracticeDate) dates.add(all[key].lastPracticeDate);
    }
    const studyDays = dates.size;

    // 计算平均难度
    const avgEase = stats.avgEase ? stats.avgEase.toFixed(2) : '2.50';

    // 收集记忆曲线数据
    const curveData = this.getMemoryCurveData();

    container.innerHTML = `
      <div class="page active profile-page">
        <div class="top-bar">
          <button class="back-btn" onclick="App.showPage('map')">←</button>
          <div style="font-size:20px;font-weight:bold">我的</div>
          <div></div>
        </div>

        <div class="profile-header">
          <div class="profile-avatar">🐱</div>
          <div class="profile-name">${playerName || '小冒险家'}</div>
          <div class="profile-sync-status">
            ${isLoggedIn
              ? '<span class="sync-on">云端已同步</span>'
              : '<span class="sync-off">未登录 (本地模式)</span>'}
          </div>
        </div>

        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-num">${studyDays}</div>
            <div class="profile-stat-label">学习天数</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-num">${stats.total}</div>
            <div class="profile-stat-label">已学字数</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-num">${stats.mastered}</div>
            <div class="profile-stat-label">已掌握</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-num">${avgEase}</div>
            <div class="profile-stat-label">平均难度</div>
          </div>
        </div>

        <div class="section-title">记忆曲线</div>
        <div class="curve-card">
          <canvas id="memory-curve-canvas" width="340" height="200"></canvas>
          <div class="curve-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#ff69b4"></span> 记忆保持率</span>
            <span class="legend-item"><span class="legend-dot" style="background:#87ceeb"></span> 理想曲线</span>
          </div>
        </div>

        <div class="section-title">掌握度分布</div>
        <div class="curve-card">
          <canvas id="mastery-dist-canvas" width="340" height="160"></canvas>
        </div>

        <div class="profile-actions">
          ${isLoggedIn ? `
            <button class="btn profile-action-btn" onclick="App.manualSync()">同步数据</button>
            <button class="btn profile-action-btn danger" onclick="AuthUI.logout()">退出登录</button>
          ` : `
            <button class="btn btn-primary profile-action-btn" onclick="AuthUI.renderWelcome()">登录/注册</button>
          `}
        </div>

        ${this.renderBottomNav('profile')}
      </div>
    `;

    // 渲染完 DOM 后绘制 Canvas
    setTimeout(() => {
      this.drawMemoryCurve(curveData);
      this.drawMasteryDistribution(stats);
    }, 50);
  },

  // 获取记忆曲线数据：按天聚合记忆保持率
  getMemoryCurveData() {
    const all = MasterySystem.getAll();
    const today = new Date(MasterySystem.todayStr());
    const dayBuckets = {}; // daysAgo -> { total, retained }

    for (const key in all) {
      const entry = all[key];
      if (!entry.lastPracticeDate) continue;

      const lastDate = new Date(entry.lastPracticeDate);
      const daysAgo = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      if (daysAgo < 0 || daysAgo > 30) continue;

      if (!dayBuckets[daysAgo]) dayBuckets[daysAgo] = { total: 0, retained: 0 };
      dayBuckets[daysAgo].total++;

      // 认为 masteryLevel >= 3 为"记住了"
      if ((entry.masteryLevel || 0) >= 3) {
        dayBuckets[daysAgo].retained++;
      }
    }

    // 转成数组，按天排序
    const data = [];
    for (let d = 0; d <= 30; d++) {
      const bucket = dayBuckets[d];
      if (bucket && bucket.total > 0) {
        data.push({ day: d, rate: bucket.retained / bucket.total });
      }
    }
    return data;
  },

  // Canvas 绘制记忆曲线
  drawMemoryCurve(data) {
    const canvas = document.getElementById('memory-curve-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // 背景网格
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // Y 轴标签
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.fillText((100 - i * 25) + '%', pad.left - 5, y + 4);
    }

    // X 轴标签
    ctx.textAlign = 'center';
    const xLabels = [0, 5, 10, 15, 20, 25, 30];
    for (const d of xLabels) {
      const x = pad.left + (d / 30) * chartW;
      ctx.fillText(d + '天', x, H - 5);
    }

    // 理想艾宾浩斯曲线 (R = e^(-t/S), S=10)
    ctx.beginPath();
    ctx.strokeStyle = '#87ceeb';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let d = 0; d <= 30; d++) {
      const x = pad.left + (d / 30) * chartW;
      const retention = Math.exp(-d / 10);
      const y = pad.top + (1 - retention) * chartH;
      if (d === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 实际数据点 + 折线
    if (data.length > 0) {
      // 折线
      ctx.beginPath();
      ctx.strokeStyle = '#ff69b4';
      ctx.lineWidth = 2.5;
      data.forEach((pt, i) => {
        const x = pad.left + (pt.day / 30) * chartW;
        const y = pad.top + (1 - pt.rate) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 数据点
      data.forEach(pt => {
        const x = pad.left + (pt.day / 30) * chartW;
        const y = pad.top + (1 - pt.rate) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff69b4';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // 无数据提示
    if (data.length === 0) {
      ctx.fillStyle = '#ccc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('还没有学习数据，快去闯关吧!', W / 2, H / 2);
    }
  },

  // Canvas 绘制掌握度分布柱状图
  drawMasteryDistribution(stats) {
    const canvas = document.getElementById('mastery-dist-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { top: 15, right: 20, bottom: 30, left: 40 };

    ctx.clearRect(0, 0, W, H);

    // 统计各等级数量
    const all = MasterySystem.getAll();
    const levelCounts = [0, 0, 0, 0, 0, 0]; // level 0-5
    for (const key in all) {
      const lv = all[key].masteryLevel || 0;
      levelCounts[Math.min(5, lv)]++;
    }

    const maxCount = Math.max(...levelCounts, 1);
    const labels = ['Lv0', 'Lv1', 'Lv2', 'Lv3', 'Lv4', 'Lv5'];
    const colors = ['#ffcdd2', '#ffab91', '#ffe082', '#a5d6a7', '#81c784', '#4caf50'];

    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const barW = chartW / 6 * 0.6;
    const gap = chartW / 6;

    // 柱状图
    for (let i = 0; i < 6; i++) {
      const x = pad.left + gap * i + (gap - barW) / 2;
      const barH = (levelCounts[i] / maxCount) * chartH;
      const y = pad.top + chartH - barH;

      // 圆角矩形
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, pad.top + chartH);
      ctx.lineTo(x, pad.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fillStyle = colors[i];
      ctx.fill();

      // 数量标签
      if (levelCounts[i] > 0) {
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(levelCounts[i], x + barW / 2, y - 4);
      }

      // X 轴标签
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.fillText(labels[i], x + barW / 2, H - 5);
    }

    if (stats.total === 0) {
      ctx.fillStyle = '#ccc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('还没有学习数据', W / 2, H / 2);
    }
  },

  // 手动同步
  async manualSync() {
    if (typeof CloudSync === 'undefined' || !CloudSync.enabled) return;
    try {
      await CloudSync.pushAllToCloud();
      this.showFeedback('同步成功!', 'correct');
    } catch (err) {
      this.showFeedback('同步失败，请检查网络', 'wrong');
    }
  }
};

// 启动应用：由 index.html 的 window.load 回调调用 AppBoot.start()
// 确保在 loading 画面隐藏后再显示 auth/游戏界面
const AppBoot = {
  start() {
    if (typeof AuthUI !== 'undefined') {
      AuthUI.init();
    } else {
      App.init();
    }
  }
};
