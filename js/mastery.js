// 《拼音大冒险》— 掌握度算法 + 遗忘曲线复习调度

const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15]; // 天数间隔，按等级0-5

const MasterySystem = {
  STORAGE_KEY: 'pinyin_mastery_data',

  // 获取所有掌握度数据
  getAll() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  },

  // 保存所有掌握度数据
  saveAll(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // 获取单个字的掌握度
  get(charKey) {
    const all = this.getAll();
    return all[charKey] || this.createDefault(charKey);
  },

  // 创建默认掌握度记录
  createDefault(charKey) {
    return {
      char: charKey,
      masteryLevel: 0,
      nextReviewDate: null,
      lastPracticeDate: null,
      avgResponseTime: 0,
      totalErrors: 0,
      correctStreak: 0,
      totalAttempts: 0,
      mastered: false
    };
  },

  // 记录答题结果
  recordResult(charKey, correct, responseTime) {
    const all = this.getAll();
    let entry = all[charKey] || this.createDefault(charKey);
    const today = this.todayStr();

    entry.lastPracticeDate = today;
    entry.totalAttempts = (entry.totalAttempts || 0) + 1;

    if (correct) {
      entry.correctStreak = (entry.correctStreak || 0) + 1;

      // 更新平均反应时间（只计算正确答题的平均）
      const correctCount = entry.correctStreak; // current streak after increment
      if (correctCount <= 1) {
        entry.avgResponseTime = responseTime;
      } else {
        entry.avgResponseTime = (entry.avgResponseTime * (correctCount - 1) + responseTime) / correctCount;
      }

      if (responseTime < 1.5) {
        // 快速答对 → 等级+1
        entry.masteryLevel = Math.min(5, (entry.masteryLevel || 0) + 1);
      } else if (responseTime <= 3) {
        // 中速答对 → 等级不变，次日复习
        // masteryLevel stays
      } else {
        // 慢速答对 → 视为未掌握，等级设为1
        entry.masteryLevel = 1;
      }

      // 计算下次复习日期
      const interval = REVIEW_INTERVALS[entry.masteryLevel] || 0;
      entry.nextReviewDate = this.addDays(today, interval);

      // 等级5标记为已掌握
      if (entry.masteryLevel >= 5) {
        entry.mastered = true;
      }
    } else {
      // 答错 → 等级重置为0
      entry.masteryLevel = 0;
      entry.correctStreak = 0;
      entry.totalErrors = (entry.totalErrors || 0) + 1;
      entry.nextReviewDate = today; // 立即复习
      entry.mastered = false;
    }

    all[charKey] = entry;
    this.saveAll(all);
    return entry;
  },

  // 获取今天需要复习的字
  getReviewItems() {
    const all = this.getAll();
    const today = this.todayStr();
    const items = [];

    for (const key in all) {
      const entry = all[key];
      if (entry.nextReviewDate && entry.nextReviewDate <= today && !entry.mastered) {
        items.push(entry);
      }
    }

    // 按掌握度从低到高排序
    items.sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0));
    return items;
  },

  // 获取复习数量
  getReviewCount() {
    return this.getReviewItems().length;
  },

  // 获取掌握统计
  getStats() {
    const all = this.getAll();
    const entries = Object.values(all);
    const total = entries.length;
    const mastered = entries.filter(e => e.mastered).length;
    const learning = entries.filter(e => e.masteryLevel > 0 && !e.mastered).length;
    const notStarted = entries.filter(e => e.masteryLevel === 0).length;

    return { total, mastered, learning, notStarted };
  },

  // 辅助：今天日期字符串
  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 辅助：日期加天数
  addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};
