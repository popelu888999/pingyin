// 《拼音大冒险》— 登录/注册 UI（PIN 码 + 匿名认证）

const AuthUI = {
  PIN_STORAGE_KEY: 'pinyin_player_pin',
  NAME_STORAGE_KEY: 'pinyin_player_name',

  // 入口：检查是否已登录
  async init() {
    // Firebase SDK 未加载 → 直接离线模式
    if (typeof firebase === 'undefined') {
      console.warn('[Auth] Firebase 未加载，离线模式');
      App.init();
      return;
    }

    const savedPin = localStorage.getItem(this.PIN_STORAGE_KEY);
    if (savedPin) {
      await this.autoLogin(savedPin);
    } else {
      this.renderWelcome();
    }
  },

  // 自动登录（已有存储的 PIN）
  async autoLogin(pin) {
    const container = document.getElementById('app');
    container.innerHTML = '<div class="auth-loading">正在同步数据...</div>';

    try {
      await auth.signInAnonymously();
      const doc = await db.doc(`players/${pin}/profile`).get();
      if (!doc.exists) {
        // PIN 不存在了，重新登录
        localStorage.removeItem(this.PIN_STORAGE_KEY);
        this.renderWelcome();
        return;
      }
      localStorage.setItem(this.NAME_STORAGE_KEY, doc.data().displayName || '');
      await CloudSync.activate(pin);
      App.init();
    } catch (err) {
      console.warn('[Auth] 自动登录失败，离线模式:', err);
      App.init(); // 离线降级
    }
  },

  // 欢迎页
  renderWelcome() {
    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-heart">🩷</div>
        <h1 class="auth-title">拼音大冒险</h1>
        <p class="auth-subtitle">选择一个入口开始吧</p>
        <div class="auth-buttons">
          <button class="btn btn-primary auth-btn" onclick="AuthUI.renderRegister()">
            🌟 新冒险家
          </button>
          <button class="btn btn-secondary auth-btn" onclick="AuthUI.renderLogin()">
            🔑 我回来了
          </button>
        </div>
        <button class="auth-skip" onclick="AuthUI.skipLogin()">
          先不登录，直接玩
        </button>
      </div>
    `;
  },

  // 注册页
  renderRegister() {
    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="auth-page">
        <button class="back-btn auth-back" onclick="AuthUI.renderWelcome()">←</button>
        <h2 class="auth-title">创建冒险档案</h2>
        <p class="auth-subtitle">请爸爸妈妈帮忙设置</p>

        <div class="auth-form">
          <label class="auth-label">冒险家昵称</label>
          <input type="text" id="auth-name" class="auth-input" placeholder="输入昵称" maxlength="10">

          <label class="auth-label">设置密码（4位数字）</label>
          <div class="pin-display" id="pin-display">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          ${this.renderPinPad()}

          <div id="auth-error" class="auth-error"></div>
          <button class="btn btn-primary auth-submit" onclick="AuthUI.handleRegister()">
            开始冒险!
          </button>
        </div>
      </div>
    `;
    this._pinValue = '';
  },

  // 登录页
  renderLogin() {
    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="auth-page">
        <button class="back-btn auth-back" onclick="AuthUI.renderWelcome()">←</button>
        <h2 class="auth-title">欢迎回来!</h2>
        <p class="auth-subtitle">输入你的冒险密码</p>

        <div class="auth-form">
          <div class="pin-display" id="pin-display">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          ${this.renderPinPad()}

          <div id="auth-error" class="auth-error"></div>
          <button class="btn btn-primary auth-submit" onclick="AuthUI.handleLogin()">
            进入!
          </button>
        </div>
      </div>
    `;
    this._pinValue = '';
  },

  // PIN 数字键盘
  renderPinPad() {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];
    return `
      <div class="pin-pad">
        ${nums.map(n => {
          if (n === '') return '<div class="pin-key empty"></div>';
          if (n === '⌫') return `<div class="pin-key del" onclick="AuthUI.pinInput('del')">⌫</div>`;
          return `<div class="pin-key" onclick="AuthUI.pinInput(${n})">${n}</div>`;
        }).join('')}
      </div>
    `;
  },

  // PIN 输入处理
  _pinValue: '',
  pinInput(val) {
    if (val === 'del') {
      this._pinValue = this._pinValue.slice(0, -1);
    } else if (this._pinValue.length < 4) {
      this._pinValue += val;
    }
    this.updatePinDisplay();
  },

  updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < this._pinValue.length);
    });
  },

  // 注册处理
  async handleRegister() {
    const name = document.getElementById('auth-name').value.trim();
    const pin = this._pinValue;
    const errEl = document.getElementById('auth-error');

    if (!name) { errEl.textContent = '请输入昵称'; return; }
    if (pin.length !== 4) { errEl.textContent = '请输入4位数字密码'; return; }

    errEl.textContent = '';
    const btn = document.querySelector('.auth-submit');
    btn.textContent = '正在创建...';
    btn.disabled = true;

    try {
      await auth.signInAnonymously();

      // 检查 PIN 是否已被占用
      const existing = await db.doc(`players/${pin}/profile`).get();
      if (existing.exists) {
        errEl.textContent = '这个密码已被使用，换一个吧';
        btn.textContent = '开始冒险!';
        btn.disabled = false;
        return;
      }

      // 创建档案
      await db.doc(`players/${pin}/profile`).set({
        displayName: name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      localStorage.setItem(this.PIN_STORAGE_KEY, pin);
      localStorage.setItem(this.NAME_STORAGE_KEY, name);

      // 激活云同步（会把现有 localStorage 数据上传）
      await CloudSync.activate(pin);
      App.init();
    } catch (err) {
      console.error('[Auth] 注册失败:', err);
      errEl.textContent = '注册失败，请检查网络后重试';
      btn.textContent = '开始冒险!';
      btn.disabled = false;
    }
  },

  // 登录处理
  async handleLogin() {
    const pin = this._pinValue;
    const errEl = document.getElementById('auth-error');

    if (pin.length !== 4) { errEl.textContent = '请输入4位数字密码'; return; }

    errEl.textContent = '';
    const btn = document.querySelector('.auth-submit');
    btn.textContent = '正在登录...';
    btn.disabled = true;

    try {
      await auth.signInAnonymously();

      const doc = await db.doc(`players/${pin}/profile`).get();
      if (!doc.exists) {
        errEl.textContent = '密码不对哦，再试试?';
        btn.textContent = '进入!';
        btn.disabled = false;
        this._pinValue = '';
        this.updatePinDisplay();
        return;
      }

      localStorage.setItem(this.PIN_STORAGE_KEY, pin);
      localStorage.setItem(this.NAME_STORAGE_KEY, doc.data().displayName || '');

      await CloudSync.activate(pin);
      App.init();
    } catch (err) {
      console.error('[Auth] 登录失败:', err);
      errEl.textContent = '登录失败，请检查网络后重试';
      btn.textContent = '进入!';
      btn.disabled = false;
    }
  },

  // 跳过登录（离线模式）
  skipLogin() {
    App.init();
  },

  // 登出
  logout() {
    CloudSync.deactivate();
    localStorage.removeItem(this.PIN_STORAGE_KEY);
    localStorage.removeItem(this.NAME_STORAGE_KEY);
    auth.signOut().catch(() => {});
    this.renderWelcome();
  },

  // 获取当前玩家名
  getPlayerName() {
    return localStorage.getItem(this.NAME_STORAGE_KEY) || '';
  },

  // 是否已登录
  isLoggedIn() {
    return !!localStorage.getItem(this.PIN_STORAGE_KEY);
  }
};
