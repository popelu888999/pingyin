// 《拼音大冒险》— 语音识别模块

const SpeechModule = {
  recognition: null,
  isSupported: false,
  isListening: false,
  _gotResult: false,
  onResult: null,
  onError: null,

  // Audio analyser for waveform visualization
  audioContext: null,
  analyser: null,
  mediaStream: null,
  sourceNode: null,
  dataArray: null,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 5;
      this.isSupported = true;

      this.recognition.onresult = (event) => {
        const results = [];
        for (let i = 0; i < event.results[0].length; i++) {
          results.push(event.results[0][i].transcript.toLowerCase());
        }
        console.log('[Speech] onresult:', results);
        this._gotResult = true;
        this.isListening = false;
        if (this.onResult) this.onResult(results);
      };

      this.recognition.onerror = (event) => {
        console.log('[Speech] onerror:', event.error);
        this._gotResult = true;
        this.isListening = false;
        if (this.onError) this.onError(event.error);
      };

      this.recognition.onend = () => {
        console.log('[Speech] onend, hadResult:', this._gotResult);
        const wasListening = this.isListening;
        this.isListening = false;
        if (!this._gotResult && wasListening && this.onError) {
          this.onError('no-speech');
        }
        this._gotResult = false;
      };
    }
    return this.isSupported;
  },

  // 开始录音识别
  startListening(onResult, onError) {
    if (!this.isSupported) return false;
    this.onResult = onResult;
    this.onError = onError;
    this._gotResult = false;
    if (this.isListening) {
      console.log('[Speech] already listening, updating callbacks only');
      return true;
    }
    this.isListening = true;
    try {
      this.recognition.start();
      console.log('[Speech] recognition.start() called');
      return true;
    } catch (e) {
      console.log('[Speech] start() failed:', e.message);
      this.isListening = false;
      return false;
    }
  },

  // 停止识别
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  },

  // 预先获取麦克风（游戏开始时调用一次，避免重复弹权限）
  initMicrophone() {
    if (this.mediaStream) return Promise.resolve(true);
    return navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaStream = stream;
        return true;
      })
      .catch(() => false);
  },

  // 启动音频分析器（复用已有的 mediaStream）
  startAnalyser() {
    if (this.mediaStream) {
      return Promise.resolve(this._createAnalyserNodes());
    }
    // 兜底：如果还没有 stream，先获取
    return this.initMicrophone().then(ok => {
      if (!ok) return false;
      return this._createAnalyserNodes();
    });
  },

  _createAnalyserNodes() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    return true;
  },

  // 停止音频分析器（保留 mediaStream 以复用）
  stopAnalyser() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  },

  // 完全释放麦克风（退出游戏时调用）
  releaseMicrophone() {
    this.stopAnalyser();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  },

  // 获取频率数据
  getFrequencyData() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  },

  // 匹配识别结果
  matchResult(results, expected) {
    const normalizedExpected = expected.toLowerCase().trim();
    for (const r of results) {
      const normalized = r.replace(/\s+/g, '').toLowerCase();
      if (normalized === normalizedExpected ||
          normalized.includes(normalizedExpected) ||
          normalizedExpected.includes(normalized)) {
        return true;
      }
    }
    return false;
  },

  // ==================== 标准发音 (TTS) ====================
  // 声母呼读音 + 韵母标准读音映射
  PINYIN_AUDIO_MAP: {
    // 声母
    'b': '波', 'p': '坡', 'm': '摸', 'f': '佛',
    'd': '得', 't': '特', 'n': '讷', 'l': '勒',
    'g': '哥', 'k': '科', 'h': '喝',
    'j': '鸡', 'q': '七', 'x': '西',
    'zh': '知', 'ch': '吃', 'sh': '诗', 'r': '日',
    'z': '资', 'c': '次', 's': '丝',
    'y': '衣', 'w': '乌',
    // 单韵母
    'a': '啊', 'o': '噢', 'e': '鹅', 'i': '衣', 'u': '乌', 'v': '鱼',
    // 复韵母
    'ai': '哎', 'ei': '诶', 'ui': '威', 'ao': '凹', 'ou': '欧',
    'iu': '优', 'ie': '耶', 've': '约', 'er': '耳',
    // 鼻韵母
    'an': '安', 'en': '恩', 'in': '因', 'un': '温', 'vn': '晕',
    'ang': '昂', 'eng': '嗯', 'ing': '英', 'ong': '翁'
  },

  // 语音识别宽松匹配集（每个拼音对应的常见识别汉字，含近似音）
  SPEECH_MATCH: {
    'b': '波玻播拨伯博不把吧爸白', 'p': '坡泼破婆扑怕爬拍盘', 'm': '摸莫模磨木妈嘛么没', 'f': '佛付伏服福发法飞',
    'd': '得德的嘚大打地到都', 't': '特他她它踢天头太', 'n': '讷呢那拿你年牛奶', 'l': '勒了乐肋嘞拉来啦',
    'g': '哥歌鸽格个高古国', 'k': '科颗棵可克开口看', 'h': '喝和合河贺好很花红',
    'j': '鸡机基击几家见金', 'q': '七期齐漆起去千前', 'x': '西希息吸洗想先下小',
    'zh': '知之蜘芝枝中种猪主', 'ch': '吃持迟池痴出初车超', 'sh': '诗师时湿十书山上是', 'r': '日入如人热让肉',
    'z': '资子字自兹做走左嘴', 'c': '次此慈刺疵才草从', 's': '丝思四寺死三岁送',
    'y': '衣一医依以也有又呀', 'w': '乌屋五武物我万王',
    'a': '啊阿呀哇', 'o': '噢哦喔嗷', 'e': '鹅额饿呃俄', 'i': '衣一医依姨以已', 'u': '乌屋五武物', 'v': '鱼雨玉于语',
    'ai': '哎爱矮埃唉哀挨', 'ei': '诶欸嘿黑', 'ui': '威为位围微卫', 'ao': '凹奥熬傲澳', 'ou': '欧偶呕藕鸥噢哦喔',
    'iu': '优有又油游由幽', 'ie': '耶也夜叶业页', 've': '约月越乐岳跃', 'er': '耳二儿而尔',
    'an': '安暗案岸俺按', 'en': '恩嗯摁', 'in': '因音阴引印', 'un': '温文闻问稳弯万玩完碗晚湾', 'vn': '晕云运韵蕴',
    'ang': '昂肮盎', 'eng': '嗯鞥哼亨', 'ing': '英应鹰影硬', 'ong': '翁嗡拥涌汪旺王望往网忘'
  },

  // 儿童常见混淆音组（发音部位相近的声母/韵母互相容错）
  CONFUSED_SOUNDS: {
    'b': ['p'], 'p': ['b'],
    'd': ['t', 'zh'], 't': ['d', 'ch'],
    'n': ['l'], 'l': ['n'],
    'g': ['k', 'h'], 'k': ['g', 'h'], 'h': ['g', 'k'],
    'j': ['q', 'x'], 'q': ['j', 'x'], 'x': ['j', 'q'],
    'zh': ['ch', 'sh', 'd'], 'ch': ['zh', 'sh', 't'], 'sh': ['zh', 'ch'], 'r': ['sh'],
    'z': ['c', 's'], 'c': ['z', 's'], 's': ['z', 'c'],
    'o': ['ou'], 'ou': ['o'],
    'an': ['ang', 'un'], 'ang': ['an', 'ong'], 'ong': ['ang'],
    'en': ['eng', 'un'], 'eng': ['en'],
    'in': ['ing'], 'ing': ['in'],
    'un': ['an', 'en'],
  },

  // 匹配语音识别结果（宽松匹配）
  matchSpeechForPinyin(results, pinyinKey, hanzi) {
    console.log('[Speech] 识别结果:', results, '期望:', pinyinKey, hanzi || '');

    // 1. 汉字直接匹配（两拼/汉字关卡）
    if (hanzi) {
      for (const r of results) {
        if (r.includes(hanzi)) return true;
      }
    }

    // 2. 拼音文本匹配（识别器可能直接返回拼音字母）
    const normalizedKey = pinyinKey.toLowerCase();
    for (const r of results) {
      const normalized = r.replace(/\s+/g, '').toLowerCase();
      if (normalized === normalizedKey || normalized.includes(normalizedKey)) return true;
    }

    // 3. SPEECH_MATCH 字符集匹配
    const chars = this.SPEECH_MATCH[pinyinKey];
    if (chars) {
      for (const r of results) {
        for (const char of chars) {
          if (r.includes(char)) return true;
        }
      }
    }

    // 4. 近似音宽松匹配（儿童常见混淆：t↔ch, d↔zh, n↔l 等）
    const confused = this.CONFUSED_SOUNDS[pinyinKey];
    if (confused) {
      for (const partner of confused) {
        const partnerChars = this.SPEECH_MATCH[partner];
        if (partnerChars) {
          for (const r of results) {
            for (const char of partnerChars) {
              if (r.includes(char)) return true;
            }
          }
        }
      }
    }

    return false;
  },

  // 播放标准发音（单独声母韵母用较高 pitch 接近一声）
  playStandardSound(pinyin, hanzi) {
    if (!window.speechSynthesis) return;
    const text = hanzi || this.PINYIN_AUDIO_MAP[pinyin];
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.7;
    // 单独声母/韵母用高平调（接近一声），汉字用正常音调
    utterance.pitch = hanzi ? 1.0 : 1.4;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};
