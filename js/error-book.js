// 《拼音大冒险》— 错题本收集与练习

const ErrorBook = {
  STORAGE_KEY: 'pinyin_error_book',

  // 获取所有错题
  getAll() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  },

  saveAll(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // 添加错题
  addError(charKey, correctAnswer, wrongAnswer, mode) {
    const all = this.getAll();
    if (!all[charKey]) {
      all[charKey] = {
        char: charKey,
        correctAnswer: correctAnswer,
        errorCount: 0,
        consecutiveCorrect: 0,
        wrongAnswers: [],
        mode: mode,
        addedDate: new Date().toISOString()
      };
    }
    all[charKey].errorCount += 1;
    all[charKey].consecutiveCorrect = 0;
    if (wrongAnswer && !all[charKey].wrongAnswers.includes(wrongAnswer)) {
      all[charKey].wrongAnswers.push(wrongAnswer);
    }
    this.saveAll(all);
  },

  // 记录错题答对
  recordCorrect(charKey) {
    const all = this.getAll();
    if (all[charKey]) {
      all[charKey].consecutiveCorrect += 1;
      // 连续答对3次，移出错题本
      if (all[charKey].consecutiveCorrect >= 3) {
        delete all[charKey];
      }
      this.saveAll(all);
    }
  },

  // 获取错题列表（按错误频率排序）
  getErrorList() {
    const all = this.getAll();
    return Object.values(all).sort((a, b) => b.errorCount - a.errorCount);
  },

  // 获取错题数量
  getErrorCount() {
    return Object.keys(this.getAll()).length;
  },

  // 判断某字是否在错题本中
  isInErrorBook(charKey) {
    return !!this.getAll()[charKey];
  },

  // 从三个池子获取出题列表
  getQuestionPool(currentGroupChars, count) {
    const pool = [];
    const errorItems = this.getErrorList();
    const reviewItems = MasterySystem.getReviewItems();

    // 错题池 40%
    const errorCount = Math.ceil(count * 0.4);
    for (let i = 0; i < Math.min(errorCount, errorItems.length); i++) {
      pool.push({ ...errorItems[i], source: 'error' });
    }

    // 复习池 30%
    const reviewCount = Math.ceil(count * 0.3);
    for (let i = 0; i < Math.min(reviewCount, reviewItems.length); i++) {
      pool.push({ ...reviewItems[i], source: 'review' });
    }

    // 新词池 30% — 用当前组的新字填充
    const newCount = count - pool.length;
    const shuffled = [...currentGroupChars].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(newCount, shuffled.length); i++) {
      pool.push({ ...shuffled[i], source: 'new' });
    }

    // 如果池子不够，用当前组字补满
    while (pool.length < count) {
      const idx = Math.floor(Math.random() * currentGroupChars.length);
      pool.push({ ...currentGroupChars[idx], source: 'new' });
    }

    return this.shuffle(pool);
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
