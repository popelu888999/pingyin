// 《拼音大冒险》— 游戏核心引擎

const Game = {
  // 游戏状态
  state: {
    currentLevel: 0,
    currentWave: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    lives: 3,
    totalQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    isPinkStorm: false,
    isRunning: false,
    isPaused: false,
    balloons: [],
    currentInput: '',
    questionStartTime: 0,
    animationFrame: null,
    currentQuestions: [],
    questionIndex: 0,
    reinsertQueue: [], // 答错的题，3题后重新出现
    useSpeech: false,
    speechErrors: 0
  },

  STORAGE_KEY: 'pinyin_game_progress',

  // 初始化游戏引擎
  init() {
    this.loadProgress();
    SpeechModule.init();
  },

  // 加载进度
  loadProgress() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      this.progress = saved;
    } else {
      this.progress = {
        unlockedLevel: 1,
        totalScore: 0,
        levelScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        levelStars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        unlockedGroups: [1],
        dailyLogin: null,
        maxCombo: 0
      };
    }
  },

  // 保存进度
  saveProgress() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.progress));
  },

  // 检查每日首登
  checkDailyLogin() {
    const today = MasterySystem.todayStr();
    if (this.progress.dailyLogin !== today) {
      this.progress.dailyLogin = today;
      this.progress.totalScore += 50;
      this.saveProgress();
      return true;
    }
    return false;
  },

  // 获取连击倍率
  getComboMultiplier() {
    if (this.state.combo >= 15) return 2.0;
    if (this.state.combo >= 10) return 1.5;
    if (this.state.combo >= 5) return 1.2;
    return 1.0;
  },

  // 计算得分
  calculateScore(responseTime) {
    let base = 10;
    const multiplier = this.getComboMultiplier();
    let bonus = 0;
    if (responseTime < 1.5) bonus = 5;
    return Math.floor((base + bonus) * multiplier);
  },

  // ==================== 第一关：回声森林（声母）====================
  startLevel1(waveIndex) {
    const idx = waveIndex != null ? waveIndex : 0;
    const wave = SHENGMU_WAVES[idx];
    this.resetState();
    this.state.currentLevel = 1;
    this.state.currentWave = idx;

    // 生成题目：每个声母出现2-3次
    const questions = [];
    const items = wave.items;
    for (let round = 0; round < 3; round++) {
      for (const item of items) {
        questions.push({
          type: 'shengmu',
          display: item,
          answer: item,
          id: `sm_${item}_${round}`
        });
      }
    }
    this.state.currentQuestions = this.shuffle(questions).slice(0, 20);
    this.state.totalQuestions = this.state.currentQuestions.length;
    return { wave, questions: this.state.currentQuestions };
  },

  // ==================== 第二关：韵律海洋（韵母）====================
  startLevel2(waveIndex) {
    const idx = waveIndex != null ? waveIndex : 0;
    const wave = YUNMU_WAVES[idx];
    this.resetState();
    this.state.currentLevel = 2;
    this.state.currentWave = idx;

    const questions = [];
    const items = wave.items;
    for (let round = 0; round < 3; round++) {
      for (const item of items) {
        questions.push({
          type: 'yunmu',
          display: item === 'v' ? 'ü' : item.replace('v', 'ü'),
          answer: item,
          id: `ym_${item}_${round}`
        });
      }
    }
    this.state.currentQuestions = this.shuffle(questions).slice(0, 20);
    this.state.totalQuestions = this.state.currentQuestions.length;
    return { wave, questions: this.state.currentQuestions };
  },

  // ==================== 第三关：魔法合成炉（两拼）====================
  startLevel3() {
    this.resetState();
    this.state.currentLevel = 3;

    const shuffled = this.shuffle([...LIANG_PIN_DATA]);
    const questions = shuffled.slice(0, 20).map((item, i) => ({
      type: 'liangpin',
      shengmu: item.shengmu,
      yunmu: item.yunmu,
      display: item.display,
      answer: item.result,
      hanzi: item.hanzi,
      id: `lp_${item.result}_${i}`
    }));

    this.state.currentQuestions = questions;
    this.state.totalQuestions = questions.length;
    return { questions };
  },

  // ==================== 第四关：汉字王国 ====================
  startLevel4(groupId, mode) {
    this.resetState();
    this.state.currentLevel = 4;

    const group = HANZI_GROUPS.find(g => g.id === groupId);
    if (!group) return null;

    const questions = [];

    if (mode === 'A') {
      // 看拼音选汉字（4选1）
      for (const char of group.chars) {
        // 生成3个干扰项
        const distractors = this.getDistractors(char.hanzi, group.chars, 3);
        const options = this.shuffle([char.hanzi, ...distractors]);
        questions.push({
          type: 'pinyin2hanzi',
          display: char.pinyin,
          answer: char.hanzi,
          options: options,
          input: char.input,
          id: `p2h_${char.hanzi}`
        });
      }
    } else {
      // 看汉字打拼音
      for (const char of group.chars) {
        questions.push({
          type: 'hanzi2pinyin',
          display: char.hanzi,
          answer: char.input,
          pinyin: char.pinyin,
          id: `h2p_${char.hanzi}`
        });
      }
    }

    this.state.currentQuestions = this.shuffle(questions);
    this.state.totalQuestions = this.state.currentQuestions.length;
    return { group, questions: this.state.currentQuestions, mode };
  },

  // ==================== 第五关：文字保卫战 ====================
  startLevel5() {
    this.resetState();
    this.state.currentLevel = 5;

    const shuffled = this.shuffle([...PINYIN_SENTENCES]);
    const questions = shuffled.slice(0, 5).map((s, i) => ({
      type: 'sentence',
      pinyin: s.pinyin,
      chars: s.chars,
      shuffledChars: this.shuffle([...s.chars]),
      answer: s.chars.join(''),
      id: `sent_${i}`,
      difficulty: s.difficulty
    }));

    this.state.currentQuestions = questions;
    this.state.totalQuestions = questions.length;
    return { questions };
  },

  // ==================== 通用答题处理 ====================
  // speechPhase: true 表示语音验证阶段（打字已判对，只记录结果不重复计分/扣分）
  submitAnswer(answer, speechPhase) {
    if (!this.state.isRunning) return null;

    const question = this.state.currentQuestions[this.state.questionIndex];
    if (!question) return null;

    const responseTime = (Date.now() - this.state.questionStartTime) / 1000;
    const isCorrect = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();

    let result = {
      correct: isCorrect,
      question: question,
      responseTime: responseTime,
      score: 0,
      combo: 0,
      pinkStorm: false
    };

    const charKey = question.display || question.answer;

    if (speechPhase) {
      // 语音阶段：打字已经判对了，这里只推进题目，不重复计分/扣分
      // 语音正确 → 正常推进；语音失败 → 由 app.js 处理重试，不调用此方法
      this.state.correctCount++;
      this.state.combo++;
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo;
      }

      result.score = this.calculateScore(responseTime);
      this.state.score += result.score;
      result.combo = this.state.combo;

      if (this.state.combo >= 10 && !this.state.isPinkStorm) {
        this.state.isPinkStorm = true;
        result.pinkStorm = true;
      }

      MasterySystem.recordResult(charKey, true, responseTime);
      if (ErrorBook.isInErrorBook(charKey)) {
        ErrorBook.recordCorrect(charKey);
      }
    } else if (isCorrect) {
      this.state.correctCount++;
      this.state.combo++;
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo;
      }

      result.score = this.calculateScore(responseTime);
      this.state.score += result.score;
      result.combo = this.state.combo;

      // 粉色风暴
      if (this.state.combo >= 10 && !this.state.isPinkStorm) {
        this.state.isPinkStorm = true;
        result.pinkStorm = true;
      }

      // 记录掌握度
      MasterySystem.recordResult(charKey, true, responseTime);

      // 如果在错题本中，记录答对
      if (ErrorBook.isInErrorBook(charKey)) {
        ErrorBook.recordCorrect(charKey);
      }
    } else {
      this.state.wrongCount++;
      this.state.combo = 0;
      this.state.isPinkStorm = false;
      this.state.lives--;

      // 记录掌握度
      MasterySystem.recordResult(charKey, false, responseTime);

      // 加入错题本
      ErrorBook.addError(charKey, question.answer, answer, `level${this.state.currentLevel}`);

      // 答错的题3题后重新出现
      this.state.reinsertQueue.push({
        question: question,
        showAtIndex: this.state.questionIndex + 4 // 3 questions later (after index increments)
      });
    }

    this.state.questionIndex++;

    // 处理重新插入的错题
    this.processReinsertQueue();

    // 检查是否还有题目
    if (this.state.questionIndex >= this.state.currentQuestions.length || this.state.lives <= 0) {
      return this.endGame(result);
    }

    // 记录下一题开始时间
    this.state.questionStartTime = Date.now();

    return result;
  },

  // 处理错题重新插入
  processReinsertQueue() {
    const currentIdx = this.state.questionIndex;
    const toInsert = this.state.reinsertQueue.filter(
      item => item.showAtIndex <= currentIdx
    );
    for (const item of toInsert) {
      // 插入到当前位置（下一个要回答的题）
      this.state.currentQuestions.splice(
        currentIdx, 0,
        { ...item.question, id: item.question.id + '_retry' }
      );
    }
    this.state.reinsertQueue = this.state.reinsertQueue.filter(
      item => item.showAtIndex > currentIdx
    );
  },

  // 获取当前题目
  getCurrentQuestion() {
    return this.state.currentQuestions[this.state.questionIndex] || null;
  },

  // 开始计时
  startQuestion() {
    this.state.questionStartTime = Date.now();
    this.state.isRunning = true;
  },

  // 结束游戏
  endGame(lastResult) {
    this.state.isRunning = false;

    // 计算星级
    const totalAnswered = this.state.correctCount + this.state.wrongCount;
    const accuracy = totalAnswered > 0
      ? this.state.correctCount / totalAnswered
      : 0;
    let stars = 0;
    if (accuracy >= 0.95) stars = 3;
    else if (accuracy >= 0.8) stars = 2;
    else if (accuracy >= 0.6) stars = 1;

    // Perfect奖励
    let perfectBonus = 0;
    if (this.state.wrongCount === 0 && this.state.correctCount > 0) {
      perfectBonus = 100;
      this.state.score += perfectBonus;
    }

    // 更新进度
    const level = this.state.currentLevel;
    this.progress.totalScore += this.state.score;
    if (this.state.score > (this.progress.levelScores[level] || 0)) {
      this.progress.levelScores[level] = this.state.score;
    }
    if (stars > (this.progress.levelStars[level] || 0)) {
      this.progress.levelStars[level] = stars;
    }
    if (this.state.maxCombo > this.progress.maxCombo) {
      this.progress.maxCombo = this.state.maxCombo;
    }

    // 解锁下一关
    if (stars >= 1 && level >= this.progress.unlockedLevel && level < 5) {
      this.progress.unlockedLevel = level + 1;
    }

    this.saveProgress();

    const summary = {
      ...lastResult,
      gameOver: true,
      score: this.state.score,
      stars: stars,
      accuracy: accuracy,
      maxCombo: this.state.maxCombo,
      correctCount: this.state.correctCount,
      wrongCount: this.state.wrongCount,
      speechErrors: this.state.speechErrors || 0,
      totalQuestions: totalAnswered,
      perfectBonus: perfectBonus,
      lives: this.state.lives
    };

    return summary;
  },

  // ==================== 气球掉落引擎 ====================
  balloonEngine: {
    canvas: null,
    ctx: null,
    balloons: [],
    isRunning: false,
    dropSpeed: 1,
    spawnInterval: 2000,
    lastSpawn: 0,
    questions: [],
    questionIndex: 0,
    onBalloonLanded: null,
    onBalloonPopped: null,

    init(container) {
      // 使用 DOM 元素代替 canvas
      this.container = container;
      this.balloons = [];
      this.isRunning = false;
    },

    createBalloon(question) {
      const balloon = document.createElement('div');
      balloon.className = 'balloon';
      balloon.dataset.answer = question.answer;
      balloon.innerHTML = `
        <div class="balloon-heart">
          <span class="balloon-text">${question.display}</span>
        </div>
        <div class="balloon-string"></div>
      `;

      // 随机位置
      const left = 10 + Math.random() * 70; // 10%-80%
      balloon.style.left = left + '%';
      balloon.style.top = '-120px';

      this.container.appendChild(balloon);

      const balloonObj = {
        element: balloon,
        question: question,
        y: -120,
        speed: this.dropSpeed + Math.random() * 0.5,
        left: left,
        alive: true
      };

      this.balloons.push(balloonObj);
      return balloonObj;
    },

    update() {
      const containerHeight = this.container.clientHeight;

      for (const b of this.balloons) {
        if (!b.alive) continue;

        b.y += b.speed;
        b.element.style.top = b.y + 'px';

        // 落地检测
        if (b.y > containerHeight - 80) {
          b.alive = false;
          b.element.classList.add('balloon-missed');
          setTimeout(() => b.element.remove(), 500);
          if (this.onBalloonLanded) this.onBalloonLanded(b);
        }
      }

      // 清理死亡气球
      this.balloons = this.balloons.filter(b => b.alive || b.element.parentNode);
    },

    popBalloon(balloon, correct) {
      balloon.alive = false;
      if (correct) {
        balloon.element.classList.add('balloon-pop-correct');
      } else {
        balloon.element.classList.add('balloon-pop-wrong');
      }
      setTimeout(() => balloon.element.remove(), 600);
    },

    findBalloon(answer) {
      return this.balloons.find(b => b.alive && b.question.answer === answer);
    },

    clear() {
      for (const b of this.balloons) {
        if (b.element.parentNode) b.element.remove();
      }
      this.balloons = [];
    }
  },

  // ==================== 工具方法 ====================
  resetState() {
    this.state = {
      currentLevel: 0,
      currentWave: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: 3,
      totalQuestions: 0,
      correctCount: 0,
      wrongCount: 0,
      isPinkStorm: false,
      isRunning: false,
      isPaused: false,
      balloons: [],
      currentInput: '',
      questionStartTime: 0,
      animationFrame: null,
      currentQuestions: [],
      questionIndex: 0,
      reinsertQueue: [],
      useSpeech: false,
      speechErrors: 0
    };
  },

  getDistractors(correct, allChars, count) {
    const others = allChars
      .map(c => c.hanzi)
      .filter(h => h !== correct);
    const shuffled = this.shuffle(others);
    // 如果不够，从所有组获取
    if (shuffled.length < count) {
      const allHanzi = HANZI_GROUPS.flatMap(g => g.chars.map(c => c.hanzi))
        .filter(h => h !== correct);
      return this.shuffle(allHanzi).slice(0, count);
    }
    return shuffled.slice(0, count);
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};
