// 《拼音大冒险》— 语音识别模块（sherpa-onnx 离线版）

const SpeechModule = {
  // sherpa-onnx 状态
  isSupported: false,
  isModelLoaded: false,
  isModelLoading: false,
  _modelLoadPromise: null,
  _resolveLoad: null,
  _onStatusChange: null,

  // sherpa-onnx 组件
  _vad: null,
  _buffer: null,
  _recognizer: null,

  // 麦克风 & 音频
  mediaStream: null,
  audioContext: null,
  sourceNode: null,
  processorNode: null,
  analyser: null,
  dataArray: null,
  isListening: false,
  _recordSampleRate: 16000,

  // 回调
  onResult: null,
  onPartialResult: null,
  _results: [],

  init() {
    this.isSupported = typeof WebAssembly !== 'undefined';
    console.log('[Sherpa] init — WASM supported:', this.isSupported);
    return this.isSupported;
  },

  // 配置 Emscripten Module 对象（在加载 WASM glue script 之前调用）
  _setupModule() {
    const self = this;

    window.Module = {
      locateFile: function(path, scriptDirectory) {
        console.log('[Sherpa] locateFile:', path);
        return 'sherpa/' + path;
      },
      setStatus: function(status) {
        if (status) console.log('[Sherpa] status:', status);
        if (self._onStatusChange) self._onStatusChange(status);
      },
      onRuntimeInitialized: function() {
        console.log('[Sherpa] WASM runtime initialized');
        try {
          // 创建 VAD（针对儿童单音节优化参数）
          self._vad = createVad(Module, {
            sileroVad: {
              model: './silero_vad.onnx',
              threshold: 0.30,
              minSilenceDuration: 0.25,
              minSpeechDuration: 0.10,
              maxSpeechDuration: 10,
              windowSize: 512,
            },
            tenVad: {
              model: '',
              threshold: 0.50,
              minSilenceDuration: 0.50,
              minSpeechDuration: 0.25,
              maxSpeechDuration: 20,
              windowSize: 256,
            },
            sampleRate: 16000,
            numThreads: 1,
            provider: 'cpu',
            debug: 0,
            bufferSizeInSeconds: 30,
          });
          console.log('[Sherpa] VAD created');

          // 循环缓冲区
          self._buffer = new CircularBuffer(30 * 16000, Module);

          // 创建离线识别器（paraformer 中文小模型）
          self._recognizer = new OfflineRecognizer({
            modelConfig: {
              paraformer: { model: './paraformer.onnx' },
              tokens: './tokens.txt',
              debug: 0,
            },
          }, Module);
          console.log('[Sherpa] Recognizer created');

          self.isModelLoaded = true;
          self.isModelLoading = false;

          if (self._resolveLoad) self._resolveLoad(true);
        } catch (e) {
          console.error('[Sherpa] Initialization failed:', e);
          self.isModelLoading = false;
          self._modelLoadPromise = null;
          if (self._resolveLoad) self._resolveLoad(false);
        }
      }
    };
  },

  // 加载模型（触发 WASM 下载，~94MB）
  loadModel(onStatusChange) {
    if (this.isModelLoaded) return Promise.resolve(true);
    if (this._modelLoadPromise) return this._modelLoadPromise;

    this._onStatusChange = onStatusChange;
    this.isModelLoading = true;

    this._setupModule();

    this._modelLoadPromise = new Promise((resolve) => {
      this._resolveLoad = resolve;
    });

    // 动态加载 Emscripten glue script（会自动下载 .data 和 .wasm）
    const script = document.createElement('script');
    script.src = 'sherpa/sherpa-onnx-wasm-main-vad-asr.js';
    script.onerror = () => {
      console.error('[Sherpa] Failed to load WASM glue script');
      this.isModelLoading = false;
      this._modelLoadPromise = null;
      this._resolveLoad(false);
    };
    document.head.appendChild(script);

    return this._modelLoadPromise;
  },

  // 获取麦克风权限
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
      console.error('[Sherpa] getUserMedia failed:', e);
      return false;
    });
  },

  // 开始录音识别
  startListening(onResult, onPartialResult) {
    if (!this.isModelLoaded || !this.mediaStream) {
      console.warn('[Sherpa] Cannot start: model=', this.isModelLoaded, ', mic=', !!this.mediaStream);
      return false;
    }

    if (this.isListening) {
      this.onResult = onResult;
      this.onPartialResult = onPartialResult;
      return true;
    }

    this.onResult = onResult;
    this.onPartialResult = onPartialResult;
    this._results = [];

    // 创建 AudioContext (16kHz)
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    }

    this._recordSampleRate = this.audioContext.sampleRate;
    console.log('[Sherpa] AudioContext sampleRate:', this._recordSampleRate);

    // 麦克风 → 音频源
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // AnalyserNode 用于声纹可视化
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // ScriptProcessor 喂数据给 VAD + ASR
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    const self = this;
    const expectedRate = 16000;
    let speechDetected = false;

    this.processorNode.onaudioprocess = function(e) {
      if (!self.isListening) return;

      let samples = new Float32Array(e.inputBuffer.getChannelData(0));

      // 降采样（如果浏览器不支持 16kHz AudioContext）
      if (self._recordSampleRate !== expectedRate) {
        samples = self._downsample(samples, self._recordSampleRate, expectedRate);
      }

      // 推入循环缓冲区
      self._buffer.push(samples);

      // 以 windowSize 为步长喂给 VAD
      const windowSize = self._vad.config.sileroVad.windowSize;
      while (self._buffer.size() > windowSize) {
        const s = self._buffer.get(self._buffer.head(), windowSize);
        self._vad.acceptWaveform(s);
        self._buffer.pop(windowSize);

        // 检测到说话中
        if (self._vad.isDetected() && !speechDetected) {
          speechDetected = true;
          if (self.onPartialResult) self.onPartialResult('(说话中...)');
        }

        if (!self._vad.isDetected()) {
          speechDetected = false;
        }

        // 处理完整语音段
        while (!self._vad.isEmpty()) {
          const segment = self._vad.front();
          self._vad.pop();

          // 离线识别
          try {
            const stream = self._recognizer.createStream();
            stream.acceptWaveform(expectedRate, segment.samples);
            self._recognizer.decode(stream);
            const result = self._recognizer.getResult(stream);
            stream.free();

            const text = result.text;
            if (text && text.trim()) {
              console.log('[Sherpa] Recognized:', text.trim());
              self._results.push(text.trim());
              if (self.onResult) self.onResult(text.trim());
            }
          } catch (err) {
            console.error('[Sherpa] Recognition error:', err);
          }
        }
      }
    };

    // 连接音频链路
    this.sourceNode.connect(this.analyser);
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.isListening = true;
    console.log('[Sherpa] Listening started');
    return true;
  },

  // 停止录音，返回收集的结果
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
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // 重置 VAD 和缓冲区（不销毁，下次复用）
    if (this._vad) this._vad.reset();
    if (this._buffer) this._buffer.reset();

    this.dataArray = null;
    this.isListening = false;
    this.onResult = null;
    this.onPartialResult = null;
    this._results = [];

    console.log('[Sherpa] Listening stopped, results:', results);
    return results;
  },

  // 获取频率数据（声纹可视化）
  getFrequencyData() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  },

  // 释放麦克风
  releaseMicrophone() {
    this.stopListening();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  },

  // 降采样工具
  _downsample(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0, offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffset = Math.round((offsetResult + 1) * ratio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffset && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffset;
    }
    return result;
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

  // 语音识别宽松匹配集（大幅扩展，覆盖 paraformer 常见输出）
  SPEECH_MATCH: {
    'b': '波玻播拨伯博不把吧爸白百班办半帮包报北本笔比边别并步部八宝被保备', 'p': '坡泼破婆扑怕爬拍盘旁跑朋片飘平铺普瓶排派喷碰漂', 'm': '摸莫模磨木妈嘛么没门面名明末目母命美每满忙猫毛梦迷', 'f': '佛付伏服福发法飞风分房放非反方份复父翻防负费粉',
    'd': '得德的嘚大打地到都对但当道第点电东动度读多短段队定带代单等低', 't': '特他她它踢天头太同提条听通图团推土突托拖谈题铁停', 'n': '讷呢那拿你年牛奶能男难南脑内农女暖怒念宁弄', 'l': '勒了乐肋嘞拉来啦老力里连两路论落六离利量林领留绿龙楼冷类理料',
    'g': '哥歌鸽格个高古国过光广关更工公共给根各功够管观规果敢刚感', 'k': '科颗棵可克开口看空快况块苦酷宽狂肯课夸困', 'h': '喝和合河贺好很花红还海行话回后活火候化环黄会换画黑孩华',
    'j': '鸡机基击几家见金就间进近今经精九句决军加建江将节结紧尽举局据', 'q': '七期齐漆起去千前请清情全球区强且亲青确取群轻器奇桥切', 'x': '西希息吸洗想先下小心新行学些许选需续谢信星性形写现象系',
    'zh': '知之蜘芝枝中种猪主住正真整只直指至制质重转准找这者站战张着周众争', 'ch': '吃持迟池痴出初车超长成城程产常场传处冲春船创除充穿', 'sh': '诗师时湿十书山上是什生声手受说水谁少社身深神使世事实', 'r': '日入如人热让肉然认容软若任',
    'z': '资子字自兹做走左嘴最总组早再在则怎增造作坐座足族', 'c': '次此慈刺疵才草从参藏层差采操曾测策存错材菜', 's': '丝思四寺死三岁送所算虽随色森扫赛速素松诉',
    'y': '衣一医依以也有又呀要用由于与元原远月越运意义因应营影游业已亿易', 'w': '乌屋五武物我万王为问文无外位往完望未维温',
    'a': '啊阿呀哇矮爱安暗案', 'o': '噢哦喔嗷欧偶哎', 'e': '鹅额饿呃俄恶耳二而', 'i': '衣一医依姨以已意义亿易', 'u': '乌屋五武物无舞雾悟务', 'v': '鱼雨玉于语育余预域欲御',
    'ai': '哎爱矮埃唉哀挨碍', 'ei': '诶欸嘿黑北备被杯倍悲', 'ui': '威为位围微卫伟维未味委', 'ao': '凹奥熬傲澳袄奥拗', 'ou': '欧偶呕藕鸥噢哦喔',
    'iu': '优有又油游由幽尤犹忧悠邮友右佑', 'ie': '耶也夜叶业页野爷', 've': '约月越乐岳跃曰悦阅', 'er': '耳二儿而尔饵',
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

  // 匹配语音识别结果（基于拼音转换的宽松匹配）
  matchSpeechForPinyin(results, pinyinKey, hanzi) {
    const resultArr = Array.isArray(results) ? results : [results];
    console.log('[Sherpa] 匹配 识别结果:', resultArr, '期望:', pinyinKey, hanzi || '');

    const normalizedKey = pinyinKey.toLowerCase();

    for (const r of resultArr) {
      // 1. 汉字直接匹配（level 3/4 知道确切汉字时）
      if (hanzi && r.includes(hanzi)) return true;

      // 2. 拼音文本匹配（识别结果本身含拼音文本）
      const normalized = r.replace(/\s+/g, '').toLowerCase();
      if (normalized === normalizedKey || normalized.includes(normalizedKey)) return true;

      // 3. 拼音转换匹配（核心改进）
      // 将每个识别到的汉字转成拼音，检查是否包含期望的声母/韵母
      if (typeof lookupPinyin === 'function') {
        const pinyinArr = lookupPinyin(r.replace(/\s+/g, ''));
        for (const py of pinyinArr) {
          // 精确匹配或包含匹配
          // e.g. expected "b", recognized "波" → pinyin "bo" → "bo".startsWith("b") → PASS
          // e.g. expected "ang", recognized "昂" → pinyin "ang" → "ang".includes("ang") → PASS
          if (py === normalizedKey) return true;
          if (py.includes(normalizedKey)) return true;
          if (normalizedKey.includes(py) && py.length > 0) return true;
        }

        // 4. 拼音转换 + 混淆音匹配
        const confused = this.CONFUSED_SOUNDS[pinyinKey];
        if (confused) {
          for (const py of pinyinArr) {
            for (const partner of confused) {
              if (py === partner) return true;
              if (py.includes(partner)) return true;
              if (py.startsWith(partner)) return true;
            }
          }
        }
      }
    }

    // 5. 降级：旧 SPEECH_MATCH 字符集（安全网，查找表未覆盖时）
    const chars = this.SPEECH_MATCH[pinyinKey];
    if (chars) {
      for (const r of resultArr) {
        for (const char of chars) {
          if (r.includes(char)) return true;
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
