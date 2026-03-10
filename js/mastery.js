// 《拼音大冒险》— SM-2 掌握度算法 + 遗忘曲线复习调度
//
// 基于 SuperMemo SM-2 算法改良：
// - 每个字/拼音独立跟踪难度因子 (easeFactor)
// - 根据回答质量(反应时间+正确性)动态调整复习间隔
// - 难的字复习更频繁，简单的字间隔更长
// - 向后兼容旧数据格式，自动迁移

const MasterySystem = {
  STORAGE_KEY: 'pinyin_mastery_data',

  // SM-2 默认参数
  DEFAULT_EASE_FACTOR: 2.5,  // 初始难度因子
  MIN_EASE_FACTOR: 1.3,      // 最低难度因子（防止间隔过短）

  // 反应时间 → SM-2 质量评分 (0-5)
  // 0=完全不会 1=勉强记起 2=有印象但很慢 3=正确但犹豫 4=较快 5=秒答
  responseTimeToQuality(responseTime, correct) {
    if (!correct) return 1;  // 答错给1分（还记得部分），完全没答给0
    if (responseTime < 1.0) return 5;   // 秒答
    if (responseTime < 1.5) return 4;   // 较快
    if (responseTime < 3.0) return 3;   // 正常
    if (responseTime < 5.0) return 2;   // 较慢
    return 1;                            // 很慢
  },

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
      masteryLevel: 0,        // 0-5 掌握等级（用于UI显示）
      nextReviewDate: null,
      lastPracticeDate: null,
      avgResponseTime: 0,
      totalErrors: 0,
      correctStreak: 0,
      totalAttempts: 0,
      totalCorrect: 0,        // 总正确次数（用于精确计算平均反应时间）
      mastered: false,
      // SM-2 新增字段
      easeFactor: this.DEFAULT_EASE_FACTOR,  // 难度因子
      repetition: 0,                          // 连续正确复习次数
      interval: 0                             // 当前复习间隔（天）
    };
  },

  // 迁移旧格式数据（无 easeFactor 的记录）
  migrateEntry(entry) {
    if (entry.easeFactor == null) {
      entry.easeFactor = this.DEFAULT_EASE_FACTOR;
      entry.repetition = entry.correctStreak || 0;
      entry.interval = 0;
      entry.totalCorrect = entry.totalAttempts - (entry.totalErrors || 0);
      // 根据已有掌握度反推合理的间隔
      if (entry.masteryLevel >= 4) {
        entry.interval = 7;
        entry.easeFactor = 2.5;
      } else if (entry.masteryLevel >= 2) {
        entry.interval = 3;
        entry.easeFactor = 2.2;
      }
    }
    if (entry.totalCorrect == null) {
      entry.totalCorrect = Math.max(0, (entry.totalAttempts || 0) - (entry.totalErrors || 0));
    }
    return entry;
  },

  // SM-2 核心算法：根据回答质量更新复习参数
  sm2Update(entry, quality) {
    if (quality < 3) {
      // 回答质量差 → 重新开始间隔，但保留难度因子
      entry.repetition = 0;
      entry.interval = 0;
    } else {
      // 回答质量 OK → 递增间隔
      if (entry.repetition === 0) {
        entry.interval = 1;      // 首次正确：1天后复习
      } else if (entry.repetition === 1) {
        entry.interval = 3;      // 第二次正确：3天后
      } else {
        // 后续按难度因子乘算
        entry.interval = Math.round(entry.interval * entry.easeFactor);
      }
      entry.repetition++;
    }

    // 动态调整难度因子（SM-2 公式）
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    entry.easeFactor = Math.max(this.MIN_EASE_FACTOR, entry.easeFactor + delta);

    // 最大间隔限制：60天（防止遗忘）
    entry.interval = Math.min(60, entry.interval);

    return entry;
  },

  // 质量评分 → 掌握等级映射 (0-5)
  qualityToMasteryLevel(entry) {
    // 基于 repetition（连续正确复习次数）和间隔
    if (entry.repetition === 0) return 0;
    if (entry.repetition === 1) return 1;
    if (entry.repetition === 2) return 2;
    if (entry.repetition === 3) return 3;
    if (entry.interval >= 7) return entry.interval >= 15 ? 5 : 4;
    return Math.min(5, entry.repetition);
  },

  // 记录答题结果
  recordResult(charKey, correct, responseTime) {
    const all = this.getAll();
    let entry = all[charKey] || this.createDefault(charKey);
    entry = this.migrateEntry(entry);
    const today = this.todayStr();

    entry.lastPracticeDate = today;
    entry.totalAttempts = (entry.totalAttempts || 0) + 1;

    if (correct) {
      entry.correctStreak = (entry.correctStreak || 0) + 1;
      entry.totalCorrect = (entry.totalCorrect || 0) + 1;

      // 更新平均反应时间（基于总正确次数的滑动平均）
      const n = entry.totalCorrect;
      if (n <= 1) {
        entry.avgResponseTime = responseTime;
      } else {
        // 指数加权移动平均，近期权重更大
        const alpha = 0.3;
        entry.avgResponseTime = alpha * responseTime + (1 - alpha) * entry.avgResponseTime;
      }

      // SM-2 质量评分
      const quality = this.responseTimeToQuality(responseTime, true);

      // SM-2 更新
      this.sm2Update(entry, quality);

      // 映射掌握等级
      entry.masteryLevel = this.qualityToMasteryLevel(entry);

      // 计算下次复习日期
      entry.nextReviewDate = this.addDays(today, entry.interval);

      // 掌握判定：等级5 + 连击3+ + 难度因子较高
      if (entry.masteryLevel >= 5 && entry.correctStreak >= 3) {
        entry.mastered = true;
      }
    } else {
      // 答错
      const quality = this.responseTimeToQuality(responseTime, false);

      entry.correctStreak = 0;
      entry.totalErrors = (entry.totalErrors || 0) + 1;
      entry.mastered = false;

      // SM-2 更新（quality < 3 会重置间隔）
      this.sm2Update(entry, quality);

      // 答错后等级降为0或1
      entry.masteryLevel = entry.repetition > 0 ? 1 : 0;

      // 立即复习
      entry.nextReviewDate = today;
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
      const entry = this.migrateEntry(all[key]);
      if (entry.nextReviewDate && entry.nextReviewDate <= today && !entry.mastered) {
        items.push(entry);
      }
    }

    // 排序：超期天数多的优先，然后按掌握度低的优先
    items.sort((a, b) => {
      const overA = this.overdueDays(a, today);
      const overB = this.overdueDays(b, today);
      if (overA !== overB) return overB - overA;
      return (a.masteryLevel || 0) - (b.masteryLevel || 0);
    });

    return items;
  },

  // 计算超期天数
  overdueDays(entry, today) {
    if (!entry.nextReviewDate) return 0;
    const review = new Date(entry.nextReviewDate);
    const now = new Date(today || this.todayStr());
    const diff = Math.floor((now - review) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  },

  // 获取每日复习计划（分优先级）
  getDailyPlan() {
    const items = this.getReviewItems();
    const MAX_DAILY = 30;

    return {
      must: items.slice(0, Math.min(20, items.length)),   // 必须复习（最多20个）
      optional: items.slice(20, MAX_DAILY),                // 可选复习
      deferred: items.slice(MAX_DAILY),                    // 明天再说
      total: items.length
    };
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
    const learning = entries.filter(e => (e.masteryLevel || 0) > 0 && !e.mastered).length;
    const notStarted = entries.filter(e => (e.masteryLevel || 0) === 0 && !e.mastered).length;

    // SM-2 额外统计
    const avgEase = total > 0
      ? entries.reduce((sum, e) => sum + (e.easeFactor || this.DEFAULT_EASE_FACTOR), 0) / total
      : this.DEFAULT_EASE_FACTOR;
    const hardest = entries
      .filter(e => !e.mastered && e.totalAttempts > 0)
      .sort((a, b) => (a.easeFactor || 2.5) - (b.easeFactor || 2.5))
      .slice(0, 5);

    return { total, mastered, learning, notStarted, avgEase, hardest };
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
