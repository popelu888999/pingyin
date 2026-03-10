// 《拼音大冒险》— 云端同步（localStorage + Firestore 双写）

const CloudSync = {
  pin: null,
  enabled: false,
  _writeTimers: {},
  _unsubscribers: [],

  // localStorage key → Firestore doc 映射
  COLLECTIONS: {
    mastery:   { localKey: 'pinyin_mastery_data' },
    errorBook: { localKey: 'pinyin_error_book' },
    progress:  { localKey: 'pinyin_game_progress' }
  },

  // Firestore 文档引用
  ref(collection) {
    return db.doc(`players/${this.pin}/gameData/${collection}`);
  },

  // 激活云同步
  async activate(pin) {
    this.pin = pin;
    this.enabled = true;

    // 从云端拉取并合并
    await this.pullFromCloud();

    // 将本地数据上传（首次注册时云端为空）
    await this.pushAllToCloud();

    // 猴子补丁：拦截现有模块的 save 方法
    this.patchSaveMethods();

    console.log('[CloudSync] 激活完成, PIN:', pin);
  },

  // 从云端拉取数据，合并到本地
  async pullFromCloud() {
    for (const name of Object.keys(this.COLLECTIONS)) {
      try {
        const doc = await this.ref(name).get();
        if (doc.exists) {
          const cloudData = doc.data().data;
          const localData = this.getLocal(name);
          const merged = this.merge(name, localData, cloudData);
          this.setLocal(name, merged);
        }
      } catch (err) {
        console.warn(`[CloudSync] pull ${name} 失败:`, err);
      }
    }
  },

  // 把所有本地数据推到云端
  async pushAllToCloud() {
    const batch = db.batch();
    let hasData = false;

    for (const name of Object.keys(this.COLLECTIONS)) {
      const data = this.getLocal(name);
      if (data && Object.keys(data).length > 0) {
        batch.set(this.ref(name), {
          data: data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        hasData = true;
      }
    }

    if (hasData) {
      try {
        await batch.commit();
        console.log('[CloudSync] 本地数据已上传云端');
      } catch (err) {
        console.warn('[CloudSync] 批量上传失败:', err);
      }
    }
  },

  // 合并策略
  merge(collection, local, cloud) {
    if (!local || Object.keys(local).length === 0) return cloud || {};
    if (!cloud || Object.keys(cloud).length === 0) return local || {};

    if (collection === 'progress') {
      return {
        unlockedLevel: Math.max(local.unlockedLevel || 1, cloud.unlockedLevel || 1),
        totalScore: Math.max(local.totalScore || 0, cloud.totalScore || 0),
        levelScores: this.mergeMax(local.levelScores, cloud.levelScores),
        levelStars: this.mergeMax(local.levelStars, cloud.levelStars),
        unlockedGroups: this.mergeArrayUnique(local.unlockedGroups, cloud.unlockedGroups),
        maxCombo: Math.max(local.maxCombo || 0, cloud.maxCombo || 0),
        dailyLogin: local.dailyLogin || cloud.dailyLogin
      };
    }

    if (collection === 'mastery') {
      const merged = { ...cloud };
      for (const key of Object.keys(local)) {
        if (!merged[key]) {
          merged[key] = local[key];
        } else {
          // 保留最近练习的那个
          const localDate = local[key].lastPracticeDate || '';
          const cloudDate = merged[key].lastPracticeDate || '';
          if (localDate > cloudDate) {
            merged[key] = local[key];
          }
        }
      }
      return merged;
    }

    if (collection === 'errorBook') {
      const merged = { ...cloud };
      for (const key of Object.keys(local)) {
        if (!merged[key]) {
          merged[key] = local[key];
        } else if ((local[key].errorCount || 0) > (merged[key].errorCount || 0)) {
          merged[key] = local[key];
        }
      }
      return merged;
    }

    return local;
  },

  // 取各 key 的较大值
  mergeMax(a, b) {
    if (!a) return b || {};
    if (!b) return a || {};
    const result = { ...a };
    for (const k of Object.keys(b)) {
      result[k] = Math.max(result[k] || 0, b[k] || 0);
    }
    return result;
  },

  // 合并去重数组
  mergeArrayUnique(a, b) {
    return [...new Set([...(a || []), ...(b || [])])];
  },

  // 猴子补丁：拦截 save 方法，实现双写
  patchSaveMethods() {
    // 避免重复 patch
    if (this._patched) return;
    this._patched = true;

    // MasterySystem.saveAll
    const origMasterySave = MasterySystem.saveAll.bind(MasterySystem);
    MasterySystem.saveAll = (data) => {
      origMasterySave(data);
      if (this.enabled) this.debouncedPush('mastery', data);
    };

    // ErrorBook.saveAll
    const origErrorSave = ErrorBook.saveAll.bind(ErrorBook);
    ErrorBook.saveAll = (data) => {
      origErrorSave(data);
      if (this.enabled) this.debouncedPush('errorBook', data);
    };

    // Game.saveProgress
    const origProgressSave = Game.saveProgress.bind(Game);
    Game.saveProgress = () => {
      origProgressSave();
      if (this.enabled) this.debouncedPush('progress', Game.progress);
    };
  },

  // 防抖写入（1秒内多次 save 只写一次）
  debouncedPush(collection, data) {
    clearTimeout(this._writeTimers[collection]);
    this._writeTimers[collection] = setTimeout(() => {
      this.ref(collection).set({
        data: data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.warn(`[CloudSync] 写入 ${collection} 失败:`, err));
    }, 1000);
  },

  // localStorage 读写工具
  getLocal(collection) {
    const key = this.COLLECTIONS[collection].localKey;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  },

  setLocal(collection, data) {
    const key = this.COLLECTIONS[collection].localKey;
    localStorage.setItem(key, JSON.stringify(data));
  },

  // 停用（登出时调用）
  deactivate() {
    this.enabled = false;
    this.pin = null;
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];
  }
};
