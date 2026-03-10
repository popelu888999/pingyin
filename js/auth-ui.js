// 《拼音大冒险》— 登录/注册 UI（多用户支持）

const AuthUI = {
  PIN_STORAGE_KEY: 'pinyin_player_pin',
  NAME_STORAGE_KEY: 'pinyin_player_name',
  KNOWN_PLAYERS_KEY: 'pinyin_known_players',

  // 已知用户列表（本设备登录过的）
  getKnownPlayers() {
    const raw = localStorage.getItem(this.KNOWN_PLAYERS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  saveKnownPlayer(name, pin) {
    const players = this.getKnownPlayers();
    // 去重（按 PIN）
    const filtered = players.filter(p => p.pin !== pin);
    filtered.unshift({ name, pin });
    localStorage.setItem(this.KNOWN_PLAYERS_KEY, JSON.stringify(filtered));
  },

  removeKnownPlayer(pin) {
    const players = this.getKnownPlayers().filter(p => p.pin !== pin);
    localStorage.setItem(this.KNOWN_PLAYERS_KEY, JSON.stringify(players));
  },

  // 入口
  async init() {
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

  // 自动登录
  async autoLogin(pin) {
    const container = document.getElementById('app');
    container.innerHTML = '<div class="auth-loading">正在同步数据...</div>';

    try {
      await auth.signInAnonymously();
      const doc = await db.doc(`players/${pin}`).get();
      if (!doc.exists) {
        localStorage.removeItem(this.PIN_STORAGE_KEY);
        this.renderWelcome();
        return;
      }
      const name = doc.data().displayName || '';
      localStorage.setItem(this.NAME_STORAGE_KEY, name);
      this.saveKnownPlayer(name, pin);
      await CloudSync.activate(pin);
      App.init();
    } catch (err) {
      console.warn('[Auth] 自动登录失败，离线模式:', err);
      App.init();
    }
  },

  // ==================== 欢迎页 ====================
  renderWelcome() {
    const container = document.getElementById('app');
    const knownPlayers = this.getKnownPlayers();

    let playersHTML = '';
    if (knownPlayers.length > 0) {
      playersHTML = `
        <div class="auth-subtitle">选择你的角色</div>
        <div class="auth-player-list">
          ${knownPlayers.map(p => `
            <div class="auth-player-card" onclick="AuthUI.renderPinForUser('${p.name}', '${p.pin}')">
              <div class="auth-player-avatar">🐱</div>
              <div class="auth-player-name">${p.name}</div>
            </div>
          `).join('')}
        </div>
        <div class="auth-divider"><span>或</span></div>
      `;
    }

    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-heart">🩷</div>
        <h1 class="auth-title">拼音大冒险</h1>

        ${playersHTML}

        <div class="auth-buttons">
          <button class="btn btn-primary auth-btn" onclick="AuthUI.renderRegister()">
            🌟 新冒险家
          </button>
          <button class="btn btn-secondary auth-btn" onclick="AuthUI.renderLoginByName()">
            🔑 输入用户名登录
          </button>
        </div>
        <button class="auth-skip" onclick="AuthUI.skipLogin()">
          先不登录，直接玩
        </button>
      </div>
    `;
  },

  // ==================== 选择已知用户 → 输入 PIN ====================
  renderPinForUser(name, pin) {
    this._loginName = name;
    this._loginPin = pin;
    this._pinValue = '';

    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="auth-page">
        <button class="back-btn auth-back" onclick="AuthUI.renderWelcome()">←</button>
        <div class="auth-player-avatar-big">🐱</div>
        <h2 class="auth-title">${name}</h2>
        <p class="auth-subtitle">输入你的密码</p>

        <div class="auth-form">
          <div class="pin-display" id="pin-display">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          ${this.renderPinPad()}

          <div id="auth-error" class="auth-error"></div>
          <button class="btn btn-primary auth-submit" onclick="AuthUI.handlePinLogin()">
            进入!
          </button>
        </div>
      </div>
    `;
  },

  // 已知用户 PIN 验证
  async handlePinLogin() {
    const pin = this._pinValue;
    const errEl = document.getElementById('auth-error');

    if (pin.length !== 4) { errEl.textContent = '请输入4位数字密码'; return; }

    if (pin !== this._loginPin) {
      errEl.textContent = '密码不对哦，再试试?';
      this._pinValue = '';
      this.updatePinDisplay();
      return;
    }

    const btn = document.querySelector('.auth-submit');
    btn.textContent = '正在登录...';
    btn.disabled = true;

    try {
      await auth.signInAnonymously();

      localStorage.setItem(this.PIN_STORAGE_KEY, pin);
      localStorage.setItem(this.NAME_STORAGE_KEY, this._loginName);

      try {
        await CloudSync.activate(pin);
      } catch (syncErr) {
        console.warn('[Auth] 云同步失败:', syncErr);
      }
      App.init();
    } catch (err) {
      console.error('[Auth] 登录失败:', err);
      errEl.textContent = '登录失败: ' + (err.code || '') + ' ' + (err.message || '');
      btn.textContent = '进入!';
      btn.disabled = false;
    }
  },

  // ==================== 输入用户名登录（新设备） ====================
  renderLoginByName() {
    this._pinValue = '';

    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="auth-page">
        <button class="back-btn auth-back" onclick="AuthUI.renderWelcome()">←</button>
        <h2 class="auth-title">欢迎回来!</h2>
        <p class="auth-subtitle">输入你的昵称和密码</p>

        <div class="auth-form">
          <label class="auth-label">冒险家昵称</label>
          <input type="text" id="auth-name" class="auth-input" placeholder="输入昵称" maxlength="10">

          <label class="auth-label">密码（4位数字）</label>
          <div class="pin-display" id="pin-display">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          ${this.renderPinPad()}

          <div id="auth-error" class="auth-error"></div>
          <button class="btn btn-primary auth-submit" onclick="AuthUI.handleLoginByName()">
            进入!
          </button>
        </div>
      </div>
    `;
  },

  // 用户名 + PIN 登录
  async handleLoginByName() {
    const name = document.getElementById('auth-name').value.trim();
    const pin = this._pinValue;
    const errEl = document.getElementById('auth-error');

    if (!name) { errEl.textContent = '请输入昵称'; return; }
    if (pin.length !== 4) { errEl.textContent = '请输入4位数字密码'; return; }

    errEl.textContent = '';
    const btn = document.querySelector('.auth-submit');
    btn.textContent = '正在登录...';
    btn.disabled = true;

    try {
      await auth.signInAnonymously();

      // 按用户名查询
      const snapshot = await db.collection('players')
        .where('displayName', '==', name)
        .limit(5)
        .get();

      if (snapshot.empty) {
        errEl.textContent = '没有找到这个用户，检查一下昵称?';
        btn.textContent = '进入!';
        btn.disabled = false;
        return;
      }

      // 找到匹配 PIN 的文档（doc ID 就是 PIN）
      let matched = null;
      snapshot.forEach(doc => {
        if (doc.id === pin) matched = doc;
      });

      if (!matched) {
        errEl.textContent = '密码不对哦，再试试?';
        btn.textContent = '进入!';
        btn.disabled = false;
        this._pinValue = '';
        this.updatePinDisplay();
        return;
      }

      localStorage.setItem(this.PIN_STORAGE_KEY, pin);
      localStorage.setItem(this.NAME_STORAGE_KEY, name);
      this.saveKnownPlayer(name, pin);

      try {
        await CloudSync.activate(pin);
      } catch (syncErr) {
        console.warn('[Auth] 云同步失败:', syncErr);
      }
      App.init();
    } catch (err) {
      console.error('[Auth] 登录失败:', err);
      errEl.textContent = '登录失败: ' + (err.code || '') + ' ' + (err.message || '');
      btn.textContent = '进入!';
      btn.disabled = false;
    }
  },

  // ==================== 注册 ====================
  renderRegister() {
    this._pinValue = '';

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
  },

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
      const existing = await db.doc(`players/${pin}`).get();
      if (existing.exists) {
        errEl.textContent = '这个密码已被使用，换一个吧';
        btn.textContent = '开始冒险!';
        btn.disabled = false;
        return;
      }

      // 创建档案
      await db.doc(`players/${pin}`).set({
        displayName: name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      localStorage.setItem(this.PIN_STORAGE_KEY, pin);
      localStorage.setItem(this.NAME_STORAGE_KEY, name);
      this.saveKnownPlayer(name, pin);

      try {
        await CloudSync.activate(pin);
      } catch (syncErr) {
        console.warn('[Auth] 云同步失败，但注册已完成:', syncErr);
      }
      App.init();
    } catch (err) {
      console.error('[Auth] 注册失败:', err);
      errEl.textContent = '注册失败: ' + (err.code || '') + ' ' + (err.message || '');
      btn.textContent = '开始冒险!';
      btn.disabled = false;
    }
  },

  // ==================== 通用 ====================
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

  skipLogin() {
    App.init();
  },

  logout() {
    CloudSync.deactivate();
    localStorage.removeItem(this.PIN_STORAGE_KEY);
    localStorage.removeItem(this.NAME_STORAGE_KEY);
    auth.signOut().catch(() => {});
    this.renderWelcome();
  },

  getPlayerName() {
    return localStorage.getItem(this.NAME_STORAGE_KEY) || '';
  },

  isLoggedIn() {
    return !!localStorage.getItem(this.PIN_STORAGE_KEY);
  }
};
