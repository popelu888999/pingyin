// 《拼音大冒险》— 语音识别模块（Vosk 离线版）

const SpeechModule = {
  // Vosk model (loaded once)
  voskModel: null,
  isModelLoaded: false,
  isModelLoading: false,

  // Per-session microphone stream
  mediaStream: null,

  // Per-question recognition session
  recognizer: null,
  audioContext: null,
  sourceNode: null,
  processorNode: null,  // ScriptProcessor feeds audio to Vosk
  analyser: null,       // AnalyserNode for waveform visualization
  dataArray: null,
  isListening: false,
  isSupported: false,    // true when Vosk global exists

  // Callbacks
  onResult: null,
  onPartialResult: null,

  // Collected results for the current recognition session
  _results: [],

  init() {
    this.isSupported = (typeof Vosk !== 'undefined');
    console.log('[Vosk] isSupported:', this.isSupported);
    return this.isSupported;
  },

  // Load Vosk model (call once, shows progress via callback)
  async loadModel(modelUrl, onProgress) {
    if (this.isModelLoaded) return true;
    if (this.isModelLoading) return false;
    this.isModelLoading = true;

    try {
      console.log('[Vosk] Loading model from:', modelUrl);
      this.voskModel = await Vosk.createModel(modelUrl);
      this.voskModel.setLogLevel(-1);
      this.isModelLoaded = true;
      this.isModelLoading = false;
      console.log('[Vosk] Model loaded successfully');
      return true;
    } catch (e) {
      console.error('[Vosk] Failed to load model:', e);
      this.isModelLoading = false;
      return false;
    }
  },

  // Pre-acquire microphone (call once per game session)
  initMicrophone() {
    if (this.mediaStream) return Promise.resolve(true);
    return navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 16000
      }
    })
    .then(stream => {
      this.mediaStream = stream;
      return true;
    })
    .catch(e => {
      console.error('[Vosk] getUserMedia failed:', e);
      return false;
    });
  },

  // Start listening — creates recognizer + audio chain
  // onResult(text): called for each final result
  // onPartialResult(text): called for partial/interim results
  startListening(onResult, onPartialResult) {
    if (!this.isModelLoaded || !this.mediaStream) {
      console.warn('[Vosk] Cannot start: model loaded =', this.isModelLoaded, ', stream =', !!this.mediaStream);
      return false;
    }

    if (this.isListening) {
      // Already listening, just update callbacks
      this.onResult = onResult;
      this.onPartialResult = onPartialResult;
      return true;
    }

    this.onResult = onResult;
    this.onPartialResult = onPartialResult;
    this._results = [];

    // Create AudioContext
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const sampleRate = this.audioContext.sampleRate;

    // Create Vosk recognizer
    this.recognizer = new this.voskModel.KaldiRecognizer(sampleRate);

    this.recognizer.on('result', (message) => {
      const text = message.result.text;
      if (text && text.trim()) {
        console.log('[Vosk] Final result:', text);
        this._results.push(text.trim());
        if (this.onResult) this.onResult(text.trim());
      }
    });

    this.recognizer.on('partialresult', (message) => {
      const partial = message.result.partial;
      if (partial && partial.trim()) {
        if (this.onPartialResult) this.onPartialResult(partial.trim());
      }
    });

    // Create audio source from microphone stream
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create ScriptProcessor to feed audio to Vosk
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processorNode.onaudioprocess = (event) => {
      try {
        if (this.recognizer) {
          this.recognizer.acceptWaveform(event.inputBuffer);
        }
      } catch (e) {
        // ignore errors during shutdown
      }
    };

    // Create AnalyserNode for waveform visualization
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Connect: source → analyser (for visualization)
    //          source → processor → destination (for Vosk feeding)
    this.sourceNode.connect(this.analyser);
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.isListening = true;
    console.log('[Vosk] Listening started, sampleRate:', sampleRate);
    return true;
  },

  // Stop listening — returns all collected results
  stopListening() {
    const results = this._results.slice();

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyser) {
      this.analyser = null;
    }
    if (this.recognizer) {
      try { this.recognizer.remove(); } catch (e) {}
      this.recognizer = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.dataArray = null;
    this.isListening = false;
    this.onResult = null;
    this.onPartialResult = null;
    this._results = [];

    console.log('[Vosk] Listening stopped, collected results:', results);
    return results;
  },

  // Get frequency data for waveform visualization
  getFrequencyData() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  },

  // Release microphone (call when exiting game)
  releaseMicrophone() {
    this.stopListening();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  },

  // ==================== 标准发音 (TTS) ====================
  PINYIN_AUDIO_MAP: {
    'b': '波', 'p': '坡', 'm': '摸', 'f': '佛',
    'd': '得', 't': '特', 'n': '讷', 'l': '勒',
    'g': '哥', 'k': '科', 'h': '喝',
    'j': '鸡', 'q': '七', 'x': '西',
    'zh': '知', 'ch': '吃', 'sh': '诗', 'r': '日',
    'z': '资', 'c': '次', 's': '丝',
    'y': '衣', 'w': '乌',
    'a': '啊', 'o': '噢', 'e': '鹅', 'i': '衣', 'u': '乌', 'v': '鱼',
    'ai': '哎', 'ei': '诶', 'ui': '威', 'ao': '凹', 'ou': '欧',
    'iu': '优', 'ie': '耶', 've': '约', 'er': '耳',
    'an': '安', 'en': '恩', 'in': '因', 'un': '温', 'vn': '晕',
    'ang': '昂', 'eng': '嗯', 'ing': '英', 'ong': '翁'
  },

  // 语音识别宽松匹配集
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

  // 儿童常见混淆音组
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
    // results can be a string array or single string
    const resultArr = Array.isArray(results) ? results : [results];
    console.log('[Vosk] 匹配 识别结果:', resultArr, '期望:', pinyinKey, hanzi || '');

    // 1. 汉字直接匹配
    if (hanzi) {
      for (const r of resultArr) {
        if (r.includes(hanzi)) return true;
      }
    }

    // 2. 拼音文本匹配（Vosk 可能返回拼音字母）
    const normalizedKey = pinyinKey.toLowerCase();
    for (const r of resultArr) {
      const normalized = r.replace(/\s+/g, '').toLowerCase();
      if (normalized === normalizedKey || normalized.includes(normalizedKey)) return true;
    }

    // 3. SPEECH_MATCH 字符集匹配
    const chars = this.SPEECH_MATCH[pinyinKey];
    if (chars) {
      for (const r of resultArr) {
        for (const char of chars) {
          if (r.includes(char)) return true;
        }
      }
    }

    // 4. 近似音宽松匹配（儿童混淆音）
    const confused = this.CONFUSED_SOUNDS[pinyinKey];
    if (confused) {
      for (const partner of confused) {
        const partnerChars = this.SPEECH_MATCH[partner];
        if (partnerChars) {
          for (const r of resultArr) {
            for (const char of partnerChars) {
              if (r.includes(char)) return true;
            }
          }
        }
      }
    }

    return false;
  },

  // 播放标准发音
  playStandardSound(pinyin, hanzi) {
    if (!window.speechSynthesis) return;
    const text = hanzi || this.PINYIN_AUDIO_MAP[pinyin];
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.7;
    utterance.pitch = hanzi ? 1.0 : 1.4;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};
