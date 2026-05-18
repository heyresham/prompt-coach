// ---------------------------------------------------------------------------
// Prompt Coach — Content Script (v3)
// Architecture: "find field on demand" — never hold a permanent reference to
// the prompt field. Find it fresh every time we need to read or score.
// ---------------------------------------------------------------------------

const PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT',
    hostnames: ['chatgpt.com', 'chat.openai.com'],
    selectors: [
      '#prompt-textarea',
      '[id="prompt-textarea"]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder]',
      'form textarea',
      'div[contenteditable="true"]'
    ],
    model: 'GPT-4o'
  },
  claude: {
    name: 'Claude',
    hostnames: ['claude.ai'],
    selectors: [
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"].is-editor-empty',
      'div[contenteditable="true"]'
    ],
    model: 'Claude Sonnet'
  },
  gemini: {
    name: 'Gemini',
    hostnames: ['gemini.google.com'],
    selectors: [
      'rich-textarea div[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"]'
    ],
    model: 'Gemini Pro'
  },
  perplexity: {
    name: 'Perplexity',
    hostnames: ['www.perplexity.ai'],
    selectors: ['textarea[placeholder]', 'textarea'],
    model: 'Perplexity'
  },
  copilot: {
    name: 'Copilot',
    hostnames: ['copilot.microsoft.com'],
    selectors: ['textarea', '#searchbox'],
    model: 'Copilot'
  }
};

function whistleSVG(size = 40) {
  return `<svg class="pc-whistle-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Ring -->
    <circle cx="89" cy="62" r="6.5" fill="none" stroke="#B0B8C0" stroke-width="3"/>
    <circle cx="89" cy="62" r="6.5" fill="none" stroke="#E0E4E8" stroke-width="1" opacity=".4"/>
    <!-- Mouthpiece -->
    <path d="M55 54 L81 56.5 C84 57, 86 59, 86 62 C86 65, 84 67, 81 67.5 L55 70" fill="#B8C0CC" stroke="#9098A4" stroke-width="1.5"/>
    <path d="M55 54 L81 56.5 C84 57, 86 59, 86 60 L55 57" fill="#D8E0E8" opacity=".3"/>
    <!-- Chamber (chunky, nearly square) -->
    <rect x="10" y="34" width="47" height="42" rx="5" fill="#C8D0D8" stroke="#9098A4" stroke-width="1.5"/>
    <rect x="10" y="34" width="47" height="10" rx="5" fill="#DDE4EC" opacity=".22"/>
    <rect x="10" y="64" width="47" height="12" rx="5" fill="#808890" opacity=".13"/>
    <!-- Air slot -->
    <rect x="8" y="52" width="49" height="10" rx="3" fill="#2a3240" stroke="#1e2630" stroke-width=".8"/>
    <rect x="10" y="53.5" width="45" height="3" rx="1.5" fill="#0e1420" opacity=".45"/>
    <!-- Googly eyes ON TOP -->
    <circle cx="26" cy="27" r="11.5" fill="white" stroke="#c0c4c8" stroke-width="1.5"/>
    <circle cx="29" cy="27" r="6.5" fill="#1a1a1a"/>
    <circle cx="31" cy="24" r="2.8" fill="white"/>
    <circle cx="46" cy="27" r="11.5" fill="white" stroke="#c0c4c8" stroke-width="1.5"/>
    <circle cx="49" cy="27" r="6.5" fill="#1a1a1a"/>
    <circle cx="51" cy="24" r="2.8" fill="white"/>
  </svg>`;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ---------------------------------------------------------------------------
// Quick client-side scoring
// ---------------------------------------------------------------------------
function quickScore(text) {
  let score = 0;
  const lower = text.toLowerCase();
  const len = text.length;

  const actions = ['write','create','generate','explain','analyze','summarize','list','compare',
    'design','build','help','review','suggest','describe','translate','convert','refactor',
    'debug','optimize','implement','rewrite','draft','evaluate','outline','plan','identify'];
  if (actions.some(w => lower.includes(w))) score += 15;
  if (len > 30) score += 5;

  const roles = ['you are','act as','as a','pretend','role of','expert in','specialist',
    "you're a",'imagine you','you will be','behave as'];
  if (roles.some(p => lower.includes(p))) score += 15;

  const ctx = ['because','context','background','i am',"i'm working",'the goal','i need',
    'i want','my project','we are','our team','the situation','currently','for a','given that',
    'considering','the purpose'];
  score += Math.min(ctx.filter(s => lower.includes(s)).length * 7, 20);

  const cons = ["don't",'do not','avoid','must','should not','limit','only','no more than',
    'at most','at least','without','except','must not','keep it','make sure','ensure'];
  if (cons.some(s => lower.includes(s))) score += 15;

  const fmt = ['format','table','list','bullet','json','csv','markdown','step by step',
    'numbered','paragraph','code block','sections','headers','outline','in the form'];
  if (fmt.some(s => lower.includes(s))) score += 15;

  const ex = ['for example','e.g.','such as','like this',"here's an example",'for instance',
    'example:','sample','here is an example'];
  if (ex.some(s => lower.includes(s))) score += 15;

  if (len > 100) score += 3;
  if (len > 200) score += 3;
  if (len > 500) score += 4;

  // Efficiency: filler word detection
  const filler = ['please','kindly','basically','actually','really','very','just','simply',
    'i would like you to','if you could','would you be able to'];
  const fillerCount = filler.filter(s => lower.includes(s)).length;
  if (fillerCount === 0) score += 10;
  if (len > 500 && !fmt.some(s => lower.includes(s))) score -= 5;

  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
class Onboarding {
  constructor(coach) {
    this.coach = coach;
    this.step = 0;
    this.overlay = null;
    this.tooltip = null;
    this.done = false;
  }

  // DEV MODE: always show onboarding for testing.
  // TODO: restore storage check when onboarding is finalized.
  markDone() {
    this.done = true;
  }

  async start() {
    this.showStep(0);
  }

  showStep(step) {
    this.step = step;
    this.clear();
    const steps = [
      { type: 'welcome' },
      { type: 'tooltip', target: 'mascot', title: 'Meet Your Coach',
        text: 'This whistle is your sideline coach. Click it anytime to get feedback on your prompt before you send it.' },
      { type: 'tooltip', target: 'gauge', title: 'Live Score Gauge',
        text: 'This ring scores your prompt in real-time as you type. It checks for Goal, Role, Context, Constraints, Format, and Examples. Aim for green!' },
      { type: 'tooltip', target: 'mascot', title: 'Keyboard Shortcut',
        text: 'Press Ctrl+Shift+P for instant coaching — no clicking needed. Now write something and watch the score update!' },
    ];
    if (step >= steps.length) { this.markDone(); this.clear(); this.coach.showContextualHint('firstUse'); return; }
    const s = steps[step];
    if (s.type === 'welcome') this.showWelcome();
    else this.showTooltip(s);
  }

  showWelcome() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'pc-onboard-overlay';
    this.overlay.innerHTML = `
      <div class="pc-onboard-welcome">
        <div class="pc-onboard-field">
          <div class="pc-field-line pc-field-line-h"></div>
          <div class="pc-field-circle"></div>
          <div class="pc-field-line pc-field-line-v1"></div>
          <div class="pc-field-line pc-field-line-v2"></div>
        </div>
        <div class="pc-onboard-stripes">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="pc-onboard-mascot">${whistleSVG(80)}</div>
        <h2 class="pc-onboard-title">Meet Your Prompt Coach!</h2>
        <p class="pc-onboard-desc">I live right here on the sideline. I'll score your prompts in real-time and coach you to write better ones.</p>
        <div class="pc-onboard-features">
          <div class="pc-onboard-feat"><span class="pc-onboard-feat-icon">🏟️</span><span>Real-time prompt scoring as you type</span></div>
          <div class="pc-onboard-feat"><span class="pc-onboard-feat-icon">🏆</span><span>Detailed feedback across 6 dimensions</span></div>
          <div class="pc-onboard-feat"><span class="pc-onboard-feat-icon">📋</span><span>Improved prompts from the coach's playbook</span></div>
        </div>
        <div class="pc-onboard-actions">
          <button class="pc-onboard-primary">Let's Train →</button>
          <button class="pc-onboard-skip">Skip Tour</button>
        </div>
        <div class="pc-onboard-step-dots"><span class="pc-dot-active"></span><span></span><span></span><span></span></div>
      </div>`;
    this.overlay.querySelector('.pc-onboard-primary').addEventListener('click', () => this.showStep(1));
    this.overlay.querySelector('.pc-onboard-skip').addEventListener('click', () => { this.markDone(); this.clear(); });
    // Click backdrop to dismiss
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) { this.markDone(); this.clear(); } });
    document.body.appendChild(this.overlay);
  }

  showTooltip(config) {
    const targetEl = config.target === 'gauge'
      ? this.coach.widgetEl?.querySelector('.pc-score-gauge')
      : this.coach.widgetEl;
    if (!targetEl) { this.showStep(this.step + 1); return; }

    this.overlay = document.createElement('div');
    this.overlay.className = 'pc-onboard-overlay pc-onboard-spotlight';
    document.body.appendChild(this.overlay);

    const rect = targetEl.getBoundingClientRect();
    const hole = document.createElement('div');
    hole.className = 'pc-onboard-hole';
    hole.style.cssText = `top:${rect.top - 8}px;left:${rect.left - 8}px;width:${rect.width + 16}px;height:${rect.height + 16}px;`;
    document.body.appendChild(hole);
    this._hole = hole;

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'pc-onboard-tip';
    const isLast = this.step === 3;
    const dots = [0,1,2,3].map(i => `<span class="${i === this.step ? 'pc-dot-active' : ''}"></span>`).join('');
    this.tooltip.innerHTML = `
      <div class="pc-onboard-tip-title">${config.title}</div>
      <div class="pc-onboard-tip-text">${config.text}</div>
      <div class="pc-onboard-tip-footer">
        <div class="pc-onboard-step-dots">${dots}</div>
        <div class="pc-onboard-tip-actions">
          <button class="pc-onboard-skip">Skip</button>
          <button class="pc-onboard-primary">${isLast ? 'Got It!' : 'Next →'}</button>
        </div>
      </div>
      <div class="pc-onboard-arrow"></div>`;
    document.body.appendChild(this.tooltip);
    const tipRect = this.tooltip.getBoundingClientRect();
    const top = rect.top - tipRect.height - 16;
    const left = Math.max(12, rect.left + rect.width / 2 - tipRect.width / 2);
    this.tooltip.style.top = (top > 10 ? top : rect.bottom + 16) + 'px';
    this.tooltip.style.left = left + 'px';
    if (top <= 10) this.tooltip.querySelector('.pc-onboard-arrow').classList.add('pc-arrow-top');

    this.tooltip.querySelector('.pc-onboard-primary').addEventListener('click', () => this.showStep(this.step + 1));
    this.tooltip.querySelector('.pc-onboard-skip').addEventListener('click', () => { this.markDone(); this.clear(); });
  }

  clear() {
    this.overlay?.remove(); this.overlay = null;
    this.tooltip?.remove(); this.tooltip = null;
    this._hole?.remove(); this._hole = null;
  }
}

// ---------------------------------------------------------------------------
// Main Controller — "find on demand" architecture
// ---------------------------------------------------------------------------
class PromptCoach {
  constructor() {
    this.platform = this.detectPlatform();
    this.widgetEl = null;
    this.panelEl = null;
    this.isCoaching = false;
    this.lastText = '';
    this.hintShown = {};
    this.onboarding = new Onboarding(this);

    if (this.platform) this.init();
  }

  detectPlatform() {
    const host = window.location.hostname;
    for (const [, cfg] of Object.entries(PLATFORMS)) {
      if (cfg.hostnames.some(h => host.includes(h))) return cfg;
    }
    return null;
  }

  // Find the prompt field RIGHT NOW — never cache the reference.
  // Strategy: gather all candidates, score them, return the best one.
  findField() {
    const candidates = new Set();

    // Platform-specific selectors
    for (const sel of this.platform.selectors) {
      try { document.querySelectorAll(sel).forEach(el => candidates.add(el)); } catch (e) { /* invalid selector */ }
    }

    // Universal fallbacks
    document.querySelectorAll(
      'textarea, [contenteditable="true"], [role="textbox"], input[type="text"]'
    ).forEach(el => candidates.add(el));

    let best = null;
    let bestScore = -1;

    for (const el of candidates) {
      // Skip our own elements
      if (el.closest('.pc-widget, .pc-panel, .pc-onboard-overlay, .pc-hint, .pc-toast')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 10) continue;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

      let score = 0;

      // Prefer elements with text content (strong signal — user is typing there)
      const text = this.getElText(el);
      if (text.trim().length > 0) score += 10000;

      // Prefer elements lower on the page (prompt fields are at the bottom)
      score += rect.top;

      // Prefer larger elements (prompt fields are wide)
      score += rect.width * 0.5;

      // Prefer known prompt field IDs/classes
      if (el.id === 'prompt-textarea') score += 50000;
      if (el.classList.contains('ProseMirror')) score += 40000;
      if (el.getAttribute('role') === 'textbox') score += 30000;

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best;
  }

  getElText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    return el.innerText || el.textContent || '';
  }

  readFieldText() {
    const field = this.findField();
    if (!field) return '';
    return this.getElText(field);
  }

  init() {
    this.createWidget();

    // Poll for text changes every 500ms — works with any input method
    setInterval(() => this.pollScore(), 500);

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.coachMe();
      }
    });

    setTimeout(() => this.onboarding.start(), 800);
  }

  // ---- Widget ----

  createWidget() {
    this.widgetEl = document.createElement('div');
    this.widgetEl.className = 'pc-widget pc-widget-entrance';
    this.widgetEl.style.cssText = `
      position:fixed !important; z-index:2147483647 !important;
      bottom:80px !important; right:24px !important;
      display:flex !important; opacity:1 !important;
      pointer-events:auto !important;
    `;

    this.widgetEl.innerHTML = `
      <div class="pc-widget-whistle">${whistleSVG(34)}</div>
      <div class="pc-score-gauge">
        <svg viewBox="0 0 36 36" class="pc-score-ring">
          <path class="pc-score-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          <path class="pc-score-fill"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            stroke-dasharray="0, 100"/>
        </svg>
        <span class="pc-score-text">—</span>
      </div>
      <div class="pc-token-count">
        <span class="pc-token-num">—</span>
        <span class="pc-token-label">tok</span>
      </div>
      <div class="pc-widget-status">
        <span class="pc-status-dot"></span>
        <span class="pc-status-label">Watching</span>
      </div>
      <span class="pc-session-badge" style="display:none">0</span>`;

    // Entire widget is clickable
    this.widgetEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.coachMe();
    });

    document.body.appendChild(this.widgetEl);
    setTimeout(() => this.widgetEl?.classList.remove('pc-widget-entrance'), 800);

    // Load journal badge count
    chrome.runtime.sendMessage({ type: 'GET_JOURNAL_COUNT' }, (resp) => {
      if (resp?.count > 0) {
        const badge = this.widgetEl?.querySelector('.pc-session-badge');
        if (badge) { badge.textContent = resp.count; badge.style.display = ''; }
      }
    });
  }

  // ---- Polling-based scoring ----

  pollScore() {
    const text = this.readFieldText().trim();
    if (text === this.lastText) return;
    this.lastText = text;

    if (text.length > 10) {
      const score = quickScore(text);
      this.updateScore(score);
      this.updateStatus(score);

      const tokenEst = Math.ceil(text.length / 4);
      const tokenNum = this.widgetEl?.querySelector('.pc-token-num');
      if (tokenNum) tokenNum.textContent = tokenEst > 0 ? tokenEst : '—';

      if (!this.hintShown.typing && this.onboarding.done) {
        this.showContextualHint('typing');
        this.hintShown.typing = true;
      }
      if (score >= 60 && !this.hintShown.goodScore && this.onboarding.done) {
        this.showContextualHint('goodScore');
        this.hintShown.goodScore = true;
      }
    } else {
      this.updateScore(0);
      this.updateStatus(0);
      const tokenNum = this.widgetEl?.querySelector('.pc-token-num');
      if (tokenNum) tokenNum.textContent = '—';
    }
  }

  updateScore(score) {
    const fill = this.widgetEl?.querySelector('.pc-score-fill');
    const label = this.widgetEl?.querySelector('.pc-score-text');
    if (!fill || !label) return;

    fill.style.strokeDasharray = `${score}, 100`;
    label.textContent = score > 0 ? score : '—';

    let color = '#6B7280';
    if (score >= 70) color = '#22C55E';
    else if (score >= 40) color = '#F59E0B';
    else if (score > 0) color = '#EF4444';
    fill.style.stroke = color;
  }

  updateStatus(score) {
    const dot = this.widgetEl?.querySelector('.pc-status-dot');
    const label = this.widgetEl?.querySelector('.pc-status-label');
    if (!dot || !label) return;
    if (score >= 70) { dot.className = 'pc-status-dot pc-dot-green'; label.textContent = 'Strong'; }
    else if (score >= 40) { dot.className = 'pc-status-dot pc-dot-yellow'; label.textContent = 'Needs work'; }
    else if (score > 0) { dot.className = 'pc-status-dot pc-dot-red'; label.textContent = 'Weak'; }
    else { dot.className = 'pc-status-dot'; label.textContent = 'Watching'; }
  }

  // ---- Contextual Hints ----

  showContextualHint(type) {
    if (!this.onboarding.done) return;
    const hints = {
      firstUse:   { text: 'Start typing a prompt — watch the score gauge update in real-time!', icon: '⚡' },
      typing:     { text: 'Score updating! Click the widget for detailed coaching.', icon: '📊' },
      goodScore:  { text: 'Your prompt is getting strong! Click for the full breakdown.', icon: '💪' },
      firstCoach: { text: 'Try "Use This Prompt" to drop the improved version into the field.', icon: '🎯' }
    };
    const hint = hints[type];
    if (!hint) return;

    const el = document.createElement('div');
    el.className = 'pc-hint';
    el.innerHTML = `<span class="pc-hint-icon">${hint.icon}</span><span class="pc-hint-text">${hint.text}</span><button class="pc-hint-dismiss">✕</button>`;

    if (this.widgetEl) {
      const wr = this.widgetEl.getBoundingClientRect();
      el.style.top = (wr.top - 52) + 'px';
      el.style.left = Math.max(12, wr.left - 160) + 'px';
    }
    el.querySelector('.pc-hint-dismiss').addEventListener('click', () => el.remove());
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('pc-hint-show'), 10);
    setTimeout(() => { el.classList.remove('pc-hint-show'); setTimeout(() => el.remove(), 300); }, 5000);
  }

  // ---- Intent Verification ----

  showIntentCheck(intent) {
    return new Promise((resolve, reject) => {
      this.hidePanel();
      this.panelEl = document.createElement('div');
      this.panelEl.className = 'pc-panel';

      const assumptions = (intent.assumptions || []).map(a => `<li>${esc(a)}</li>`).join('');

      this.panelEl.innerHTML = this.shell('Pre-Game Check', `
        <div class="pc-intent-card">
          <div class="pc-intent-label">I think you want to:</div>
          <div class="pc-intent-goal">"${esc(intent.goal_summary || '')}"</div>
          ${assumptions ? `<div class="pc-intent-label">Assumptions I'm making:</div>
          <ul class="pc-intent-assumptions">${assumptions}</ul>` : ''}
        </div>
        <div class="pc-intent-actions">
          <button class="pc-intent-confirm">Yes, coach me!</button>
          <button class="pc-intent-clarify-toggle">Actually, I want...</button>
        </div>
        <div class="pc-intent-clarify-area" style="display:none">
          <textarea class="pc-intent-clarify-input" rows="3" placeholder="Tell me more about what you're actually looking for..."></textarea>
          <button class="pc-intent-clarify-submit">Submit & Coach</button>
        </div>`);

      this.panelEl.querySelector('.pc-close')?.addEventListener('click', () => {
        this.hidePanel();
        reject(new Error('cancelled'));
      });

      this._escH = (e) => {
        if (e.key === 'Escape') {
          this.hidePanel();
          reject(new Error('cancelled'));
        }
      };
      document.addEventListener('keydown', this._escH);

      this.panelEl.querySelector('.pc-intent-confirm').addEventListener('click', () => {
        this.hidePanel();
        resolve(null);
      });

      this.panelEl.querySelector('.pc-intent-clarify-toggle').addEventListener('click', () => {
        const area = this.panelEl.querySelector('.pc-intent-clarify-area');
        if (area) area.style.display = '';
      });

      this.panelEl.querySelector('.pc-intent-clarify-submit').addEventListener('click', () => {
        const txt = this.panelEl.querySelector('.pc-intent-clarify-input')?.value?.trim() || '';
        this.hidePanel();
        resolve(txt || null);
      });

      document.body.appendChild(this.panelEl);
    });
  }

  // ---- Coach Me ----

  async coachMe() {
    const text = this.readFieldText().trim();
    if (!text || text.length < 5) {
      this.toast('Write something first — even a rough draft works!');
      return;
    }
    if (this.isCoaching) return;

    this.isCoaching = true;
    this.widgetEl?.classList.add('pc-widget-coaching');

    try {
      // Check intent verification setting
      const settings = await chrome.storage.sync.get(['intentCheck', 'conciseMode']);
      const intentEnabled = settings.intentCheck !== false; // default true
      const conciseMode = !!settings.conciseMode;

      let clarification = null;

      if (intentEnabled) {
        // Step 1: Verify intent
        this.showPanel({ loading: true });
        const intentResp = await chrome.runtime.sendMessage({
          type: 'VERIFY_INTENT',
          prompt: text,
          platform: this.platform.name,
          model: this.platform.model
        });

        if (intentResp.error) {
          this.showPanel({ error: intentResp.error });
          return;
        }

        if (intentResp.intent) {
          try {
            clarification = await this.showIntentCheck(intentResp.intent);
          } catch (e) {
            // User cancelled
            return;
          }
        }
      }

      // Step 2: Coach
      this.showPanel({ loading: true });

      const resp = await chrome.runtime.sendMessage({
        type: 'COACH_ME',
        prompt: text,
        platform: this.platform.name,
        model: this.platform.model,
        conciseMode: conciseMode,
        clarification: clarification
      });

      if (resp.error) {
        this.showPanel({ error: resp.error });
      } else {
        this.showPanel({ result: resp });
        if (!this.hintShown.firstCoach) {
          setTimeout(() => this.showContextualHint('firstCoach'), 1500);
          this.hintShown.firstCoach = true;
        }

        // Save journal entry
        const entry = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          platform: this.platform.name,
          model: this.platform.model,
          promptText: text,
          promptLength: text.length,
          scores: Object.fromEntries(Object.entries(resp.scores || {}).map(([k, v]) => [k, v.score])),
          overall: resp.overall_score,
          takeaways: (resp.highlights || []).slice(0, 3).map(h => h.issue),
          tokenEstimate: resp.token_estimate || Math.ceil(text.length / 4)
        };
        chrome.runtime.sendMessage({ type: 'SAVE_JOURNAL_ENTRY', entry });

        // Update badge
        const badge = this.widgetEl?.querySelector('.pc-session-badge');
        if (badge) {
          const n = parseInt(badge.textContent || '0') + 1;
          badge.textContent = n;
          badge.style.display = '';
        }
      }
    } catch (err) {
      this.showPanel({ error: 'Could not reach Prompt Coach. Check your settings in the extension popup.' });
    } finally {
      this.isCoaching = false;
      this.widgetEl?.classList.remove('pc-widget-coaching');
    }
  }

  // ---- Panel ----

  showPanel(data) {
    this.hidePanel();
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'pc-panel';

    if (data.loading) {
      this.panelEl.innerHTML = this.shell('Coach is reviewing the tape…',
        `<div class="pc-loading"><span></span><span></span><span></span></div>`);
    } else if (data.error) {
      this.panelEl.innerHTML = this.shell('Technical Foul!',
        `<div class="pc-error">${esc(data.error)}</div>`);
    } else {
      this.panelEl.innerHTML = this.buildResult(data.result);
    }

    this.panelEl.querySelector('.pc-close')?.addEventListener('click', () => this.hidePanel());
    this._escH = (e) => { if (e.key === 'Escape') this.hidePanel(); };
    document.addEventListener('keydown', this._escH);
    document.body.appendChild(this.panelEl);

    if (data.result) {
      this.panelEl.querySelector('.pc-copy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(data.result.improved_prompt);
        this.toast('Copied! Ready to play.');
      });
      this.panelEl.querySelector('.pc-use')?.addEventListener('click', () => {
        this.insertPrompt(data.result.improved_prompt);
        this.hidePanel();
        this.toast('Prompt loaded — send it!');
      });
    }
  }

  hidePanel() {
    this.panelEl?.remove(); this.panelEl = null;
    if (this._escH) { document.removeEventListener('keydown', this._escH); this._escH = null; }
  }

  shell(title, body) {
    return `<div class="pc-panel-inner">
      <div class="pc-header">
        <div class="pc-title">${whistleSVG(24)}<span>${esc(title)}</span></div>
        <button class="pc-close">&times;</button>
      </div>${body}</div>`;
  }

  buildResult(r) {
    const bar = (label, d) => {
      if (!d) return '';
      const cls = d.score >= 70 ? 'good' : d.score >= 40 ? 'ok' : 'weak';
      return `<div class="pc-row">
        <div class="pc-label"><span>${label}</span><span class="pc-val">${d.score}</span></div>
        <div class="pc-track"><div class="pc-fill pc-${cls}" style="width:${d.score}%"></div></div>
        <div class="pc-fb">${esc(d.feedback || '')}</div>
      </div>`;
    };
    const oc = r.overall_score >= 70 ? 'good' : r.overall_score >= 40 ? 'ok' : 'weak';
    const hls = (r.highlights || []).map(h => `
      <div class="pc-hl">
        <div class="pc-hl-orig">"${esc(h.original)}"</div>
        <div class="pc-hl-issue">${esc(h.issue)}</div>
        <div class="pc-hl-fix">${esc(h.fix)}</div>
      </div>`).join('');

    return this.shell("Coach's Playbook", `
      <div class="pc-says">"${esc(r.coach_says)}"</div>
      <div class="pc-scores">
        ${bar('Goal', r.scores?.goal)}
        ${bar('Role', r.scores?.role)}
        ${bar('Context', r.scores?.context)}
        ${bar('Constraints', r.scores?.constraints)}
        ${bar('Format', r.scores?.format)}
        ${bar('Examples', r.scores?.examples)}
        ${bar('Efficiency', r.scores?.efficiency)}
      </div>
      <div class="pc-overall">
        <span class="pc-overall-lbl">Overall</span>
        <span class="pc-overall-num pc-${oc}">${r.overall_score}</span>
      </div>
      ${r.token_estimate ? `
      <div class="pc-token-info">
        <span class="pc-token-big">~${r.token_estimate}</span> tokens
        <div class="pc-token-note">${esc(r.efficiency_note || '')}</div>
      </div>` : ''}
      ${r.model_tip ? `<div class="pc-tip"><strong>Pro Tip</strong> ${esc(r.model_tip)}</div>` : ''}
      ${hls ? `<div class="pc-hls"><div class="pc-sec">Play-by-Play Review</div>${hls}</div>` : ''}
      <div class="pc-improved">
        <div class="pc-sec">The Improved Play</div>
        <div class="pc-improved-text">${esc(r.improved_prompt)}</div>
        <div class="pc-actions">
          <button class="pc-copy">Copy</button>
          <button class="pc-use">Use This Prompt</button>
        </div>
      </div>`);
  }

  insertPrompt(text) {
    const field = this.findField();
    if (!field) return;
    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, text);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      field.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = text;
      field.appendChild(p);
      field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }

  toast(msg) {
    const el = document.createElement('div');
    el.className = 'pc-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('pc-toast-on'));
    setTimeout(() => { el.classList.remove('pc-toast-on'); setTimeout(() => el.remove(), 300); }, 2500);
  }
}

new PromptCoach();
