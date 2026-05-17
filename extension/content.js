// ---------------------------------------------------------------------------
// Prompt Coach — Content Script (v2)
// Fixes: ProseMirror detection, MutationObserver on field content,
// body-appended fixed-position widget, Grammarly-style onboarding.
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
      'form textarea'
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

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------
function whistleSVG(size = 40) {
  return `<svg class="pc-whistle-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M58 18 C63 4, 76 4, 72 18" stroke="#1B6B3E" fill="none" stroke-width="3" stroke-linecap="round"/>
    <circle cx="65" cy="15" r="4.5" fill="none" stroke="#9CA3AF" stroke-width="2.5"/>
    <path d="M12 40 C8 40, 5 44, 5 52 C5 60, 8 64, 12 64 L68 64 C76 64, 80 60, 80 52 C80 44, 76 40, 68 40 Z" fill="#D4D4D8" stroke="#A1A1AA" stroke-width="1.5"/>
    <path d="M76 45 L92 45 C95 45, 97 47, 97 50 L97 54 C97 57, 95 59, 92 59 L76 59" fill="#B4B4BA" stroke="#A1A1AA" stroke-width="1.5"/>
    <ellipse cx="10" cy="52" rx="4" ry="6" fill="#71717A"/>
    <line x1="28" y1="40" x2="28" y2="64" stroke="#E8E8EC" stroke-width="1.5" opacity="0.5"/>
    <line x1="62" y1="40" x2="62" y2="64" stroke="#E8E8EC" stroke-width="1.5" opacity="0.5"/>
    <ellipse cx="39" cy="51" rx="8" ry="9" fill="white"/>
    <circle cx="41" cy="51" r="5" fill="#1a1a1a"/>
    <circle cx="42.5" cy="49" r="2" fill="white"/>
    <ellipse cx="55" cy="51" rx="8" ry="9" fill="white"/>
    <circle cx="57" cy="51" r="5" fill="#1a1a1a"/>
    <circle cx="58.5" cy="49" r="2" fill="white"/>
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
  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Onboarding Manager
// ---------------------------------------------------------------------------
class Onboarding {
  constructor(coach) {
    this.coach = coach;
    this.step = 0;
    this.overlay = null;
    this.tooltip = null;
    this.done = false;
  }

  async shouldShow() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['onboardingDone'], data => {
        resolve(!data.onboardingDone);
      });
    });
  }

  markDone() {
    this.done = true;
    chrome.storage.sync.set({ onboardingDone: true });
  }

  async start() {
    if (!(await this.shouldShow())) {
      this.done = true;
      return;
    }
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

    if (step >= steps.length) {
      this.markDone();
      this.clear();
      this.coach.showContextualHint('firstUse');
      return;
    }

    const s = steps[step];
    if (s.type === 'welcome') this.showWelcome();
    else this.showTooltip(s);
  }

  showWelcome() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'pc-onboard-overlay';
    this.overlay.innerHTML = `
      <div class="pc-onboard-welcome">
        <div class="pc-onboard-mascot">${whistleSVG(72)}</div>
        <h2 class="pc-onboard-title">Meet Your Prompt Coach!</h2>
        <p class="pc-onboard-desc">
          I live right here where you prompt. I'll score your prompts in real-time
          and help you write better ones — like a coach on the sideline.
        </p>
        <div class="pc-onboard-features">
          <div class="pc-onboard-feat">
            <span class="pc-onboard-feat-icon">⚡</span>
            <span>Real-time prompt scoring as you type</span>
          </div>
          <div class="pc-onboard-feat">
            <span class="pc-onboard-feat-icon">🎯</span>
            <span>Detailed feedback across 6 dimensions</span>
          </div>
          <div class="pc-onboard-feat">
            <span class="pc-onboard-feat-icon">🔄</span>
            <span>Improved prompts you can use instantly</span>
          </div>
        </div>
        <div class="pc-onboard-actions">
          <button class="pc-onboard-primary">Show Me How</button>
          <button class="pc-onboard-skip">Skip Tour</button>
        </div>
        <div class="pc-onboard-step-dots">
          <span class="pc-dot-active"></span><span></span><span></span><span></span>
        </div>
      </div>`;

    this.overlay.querySelector('.pc-onboard-primary').addEventListener('click', () => this.showStep(1));
    this.overlay.querySelector('.pc-onboard-skip').addEventListener('click', () => {
      this.markDone();
      this.clear();
    });
    document.body.appendChild(this.overlay);
  }

  showTooltip(config) {
    const targetEl = config.target === 'gauge'
      ? this.coach.widgetEl?.querySelector('.pc-score-gauge')
      : this.coach.widgetEl;

    if (!targetEl) { this.showStep(this.step + 1); return; }

    // Spotlight overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'pc-onboard-overlay pc-onboard-spotlight';
    document.body.appendChild(this.overlay);

    // Spotlight hole
    const rect = targetEl.getBoundingClientRect();
    const hole = document.createElement('div');
    hole.className = 'pc-onboard-hole';
    hole.style.cssText = `top:${rect.top - 8}px;left:${rect.left - 8}px;width:${rect.width + 16}px;height:${rect.height + 16}px;`;
    document.body.appendChild(hole);
    this._hole = hole;

    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'pc-onboard-tip';

    const isLast = this.step === 3;
    const stepDots = [0,1,2,3].map(i =>
      `<span class="${i === this.step ? 'pc-dot-active' : ''}"></span>`).join('');

    this.tooltip.innerHTML = `
      <div class="pc-onboard-tip-title">${config.title}</div>
      <div class="pc-onboard-tip-text">${config.text}</div>
      <div class="pc-onboard-tip-footer">
        <div class="pc-onboard-step-dots">${stepDots}</div>
        <div class="pc-onboard-tip-actions">
          <button class="pc-onboard-skip">Skip</button>
          <button class="pc-onboard-primary">${isLast ? 'Got It!' : 'Next →'}</button>
        </div>
      </div>
      <div class="pc-onboard-arrow"></div>`;

    // Position tooltip above the target
    document.body.appendChild(this.tooltip);
    const tipRect = this.tooltip.getBoundingClientRect();
    const top = rect.top - tipRect.height - 16;
    const left = Math.max(12, rect.left + rect.width / 2 - tipRect.width / 2);
    this.tooltip.style.top = (top > 10 ? top : rect.bottom + 16) + 'px';
    this.tooltip.style.left = left + 'px';

    if (top <= 10) {
      this.tooltip.querySelector('.pc-onboard-arrow').classList.add('pc-arrow-top');
    }

    this.tooltip.querySelector('.pc-onboard-primary').addEventListener('click', () => this.showStep(this.step + 1));
    this.tooltip.querySelector('.pc-onboard-skip').addEventListener('click', () => {
      this.markDone();
      this.clear();
    });
  }

  clear() {
    this.overlay?.remove();
    this.overlay = null;
    this.tooltip?.remove();
    this.tooltip = null;
    this._hole?.remove();
    this._hole = null;
  }
}

// ---------------------------------------------------------------------------
// Main Controller
// ---------------------------------------------------------------------------
class PromptCoach {
  constructor() {
    this.platform = this.detectPlatform();
    this.promptField = null;
    this.widgetEl = null;
    this.panelEl = null;
    this.debounceTimer = null;
    this.isCoaching = false;
    this.lastText = '';
    this.fieldObserver = null;
    this.positionRAF = null;
    this.onboarding = new Onboarding(this);
    this.hintShown = {};

    if (this.platform) this.init();
  }

  detectPlatform() {
    const host = window.location.hostname;
    for (const [, cfg] of Object.entries(PLATFORMS)) {
      if (cfg.hostnames.some(h => host.includes(h))) return cfg;
    }
    return null;
  }

  init() {
    this.observeDOM();
    this.tryAttach();
    // Polling fallback — SPAs can re-render at any time
    setInterval(() => this.tryAttach(), 1500);

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.coachMe();
      }
    });
  }

  observeDOM() {
    new MutationObserver(() => {
      if (this.promptField && !document.contains(this.promptField)) {
        this.detach();
      }
      if (!this.promptField) this.tryAttach();
    }).observe(document.body, { childList: true, subtree: true });
  }

  tryAttach() {
    if (this.promptField && document.contains(this.promptField)) return;

    for (const sel of this.platform.selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (this.isValidPromptField(el)) {
          this.attach(el);
          return;
        }
      }
    }
  }

  isValidPromptField(el) {
    if (el.dataset.pcAttached) return false;
    const rect = el.getBoundingClientRect();
    // Must be visible and reasonably sized
    if (rect.width < 100 || rect.height < 20) return false;
    if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
    // Skip hidden elements
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  }

  attach(field) {
    this.promptField = field;
    field.dataset.pcAttached = 'true';

    this.createWidget();
    this.startPositionTracking();
    this.observeFieldContent();

    // Standard events
    field.addEventListener('input', () => this.onInput());
    field.addEventListener('keyup', () => this.onInput());
    field.addEventListener('paste', () => setTimeout(() => this.onInput(), 50));
    field.addEventListener('focus', () => this.showWidget());
    field.addEventListener('blur', () => {
      // Delay hide so clicks on widget still register
      setTimeout(() => {
        if (!this.isCoaching && !document.activeElement?.closest('.pc-widget')) {
          this.dimWidget();
        }
      }, 200);
    });

    // Trigger onboarding after widget is placed
    setTimeout(() => this.onboarding.start(), 600);
  }

  detach() {
    this.promptField = null;
    this.widgetEl?.remove();
    this.widgetEl = null;
    this.fieldObserver?.disconnect();
    this.fieldObserver = null;
    if (this.positionRAF) cancelAnimationFrame(this.positionRAF);
  }

  // Observe the field's DOM for content changes (handles voice input, ProseMirror)
  observeFieldContent() {
    this.fieldObserver = new MutationObserver(() => this.onInput());
    this.fieldObserver.observe(this.promptField, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // ---- Widget (body-appended, fixed position) ----

  createWidget() {
    this.widgetEl?.remove();

    this.widgetEl = document.createElement('div');
    this.widgetEl.className = 'pc-widget';
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
      <div class="pc-widget-status">
        <span class="pc-status-dot"></span>
        <span class="pc-status-label">Watching</span>
      </div>`;

    this.widgetEl.querySelector('.pc-widget-whistle').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.coachMe();
    });

    document.body.appendChild(this.widgetEl);
  }

  startPositionTracking() {
    const update = () => {
      if (this.promptField && this.widgetEl && document.contains(this.promptField)) {
        const rect = this.promptField.getBoundingClientRect();
        // Bottom-right of the prompt field, offset inward
        this.widgetEl.style.top = (rect.bottom - 44) + 'px';
        this.widgetEl.style.left = (rect.right - 130) + 'px';
      }
      this.positionRAF = requestAnimationFrame(update);
    };
    this.positionRAF = requestAnimationFrame(update);
  }

  showWidget() {
    this.widgetEl?.classList.remove('pc-widget-dim');
    this.widgetEl?.classList.add('pc-widget-visible');
  }

  dimWidget() {
    this.widgetEl?.classList.add('pc-widget-dim');
  }

  // ---- Input + Scoring ----

  getPromptText() {
    if (!this.promptField) return '';
    if (this.promptField.tagName === 'TEXTAREA' || this.promptField.tagName === 'INPUT') {
      return this.promptField.value;
    }
    return this.promptField.innerText || this.promptField.textContent || '';
  }

  onInput() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const text = this.getPromptText().trim();
      if (text === this.lastText) return;
      this.lastText = text;

      if (text.length > 10) {
        const score = quickScore(text);
        this.updateScore(score);
        this.updateStatus(score);
        this.showWidget();

        if (!this.hintShown.typing) {
          this.showContextualHint('typing');
          this.hintShown.typing = true;
        }
        if (score >= 60 && !this.hintShown.goodScore) {
          this.showContextualHint('goodScore');
          this.hintShown.goodScore = true;
        }
      } else {
        this.updateScore(0);
        this.updateStatus(0);
      }
    }, 300);
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

    if (score >= 70) {
      dot.className = 'pc-status-dot pc-dot-green';
      label.textContent = 'Strong';
    } else if (score >= 40) {
      dot.className = 'pc-status-dot pc-dot-yellow';
      label.textContent = 'Needs work';
    } else if (score > 0) {
      dot.className = 'pc-status-dot pc-dot-red';
      label.textContent = 'Weak';
    } else {
      dot.className = 'pc-status-dot';
      label.textContent = 'Watching';
    }
  }

  // ---- Contextual Hints ----

  showContextualHint(type) {
    if (this.onboarding && !this.onboarding.done) return;

    const hints = {
      firstUse: {
        text: 'Start typing a prompt — watch the score gauge update in real-time!',
        icon: '⚡'
      },
      typing: {
        text: 'Score updating! Click the whistle for detailed coaching.',
        icon: '📊'
      },
      goodScore: {
        text: 'Your prompt is getting strong! Click the whistle to see the full breakdown.',
        icon: '💪'
      },
      firstCoach: {
        text: 'Try the "Use This Prompt" button to drop the improved version right into the field.',
        icon: '🎯'
      }
    };

    const hint = hints[type];
    if (!hint) return;

    const el = document.createElement('div');
    el.className = 'pc-hint';
    el.innerHTML = `
      <span class="pc-hint-icon">${hint.icon}</span>
      <span class="pc-hint-text">${hint.text}</span>
      <button class="pc-hint-dismiss">✕</button>`;

    // Position near widget
    if (this.widgetEl) {
      const wr = this.widgetEl.getBoundingClientRect();
      el.style.top = (wr.top - 52) + 'px';
      el.style.left = Math.max(12, wr.left - 160) + 'px';
    }

    el.querySelector('.pc-hint-dismiss').addEventListener('click', () => el.remove());
    document.body.appendChild(el);

    setTimeout(() => el.classList.add('pc-hint-show'), 10);
    setTimeout(() => {
      el.classList.remove('pc-hint-show');
      setTimeout(() => el.remove(), 300);
    }, 5000);
  }

  // ---- Coach Me ----

  async coachMe() {
    const text = this.getPromptText().trim();
    if (!text || text.length < 5) {
      this.toast('Write something first — even a rough draft works!');
      return;
    }
    if (this.isCoaching) return;

    this.isCoaching = true;
    this.widgetEl?.classList.add('pc-widget-coaching');
    this.showPanel({ loading: true });

    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'COACH_ME',
        prompt: text,
        platform: this.platform.name,
        model: this.platform.model
      });
      if (resp.error) this.showPanel({ error: resp.error });
      else {
        this.showPanel({ result: resp });
        if (!this.hintShown.firstCoach) {
          setTimeout(() => this.showContextualHint('firstCoach'), 1500);
          this.hintShown.firstCoach = true;
        }
      }
    } catch {
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
      this.panelEl.innerHTML = this.panelShell('Coach is reviewing the tape…',
        `<div class="pc-loading"><span></span><span></span><span></span></div>`);
    } else if (data.error) {
      this.panelEl.innerHTML = this.panelShell('Technical Foul!',
        `<div class="pc-error">${esc(data.error)}</div>`);
    } else {
      this.panelEl.innerHTML = this.buildResultPanel(data.result);
    }

    this.panelEl.querySelector('.pc-close')?.addEventListener('click', () => this.hidePanel());
    this._escHandler = (e) => { if (e.key === 'Escape') this.hidePanel(); };
    document.addEventListener('keydown', this._escHandler);
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
    this.panelEl?.remove();
    this.panelEl = null;
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  }

  panelShell(title, body) {
    return `<div class="pc-panel-inner">
      <div class="pc-header">
        <div class="pc-title">${whistleSVG(24)}<span>${esc(title)}</span></div>
        <button class="pc-close">&times;</button>
      </div>
      ${body}
    </div>`;
  }

  buildResultPanel(r) {
    const scoreBar = (label, d) => {
      if (!d) return '';
      const cls = d.score >= 70 ? 'good' : d.score >= 40 ? 'ok' : 'weak';
      return `<div class="pc-row">
        <span class="pc-label">${label}</span>
        <div class="pc-track"><div class="pc-fill pc-${cls}" style="width:${d.score}%"></div></div>
        <span class="pc-val">${d.score}</span>
        <span class="pc-fb">${esc(d.feedback || '')}</span>
      </div>`;
    };

    const overallCls = r.overall_score >= 70 ? 'good' : r.overall_score >= 40 ? 'ok' : 'weak';
    const highlights = (r.highlights || []).map(h => `
      <div class="pc-hl">
        <div class="pc-hl-orig">"${esc(h.original)}"</div>
        <div class="pc-hl-issue">${esc(h.issue)}</div>
        <div class="pc-hl-fix">${esc(h.fix)}</div>
      </div>`).join('');

    return this.panelShell("Coach's Playbook", `
      <div class="pc-says">"${esc(r.coach_says)}"</div>
      <div class="pc-scores">
        ${scoreBar('Goal', r.scores?.goal)}
        ${scoreBar('Role', r.scores?.role)}
        ${scoreBar('Context', r.scores?.context)}
        ${scoreBar('Constraints', r.scores?.constraints)}
        ${scoreBar('Format', r.scores?.format)}
        ${scoreBar('Examples', r.scores?.examples)}
      </div>
      <div class="pc-overall">
        <span class="pc-overall-lbl">Overall</span>
        <span class="pc-overall-num pc-${overallCls}">${r.overall_score}</span>
      </div>
      ${r.model_tip ? `<div class="pc-tip"><strong>Scouting Report (${esc(this.platform.model)}):</strong> ${esc(r.model_tip)}</div>` : ''}
      ${highlights ? `<div class="pc-hls"><div class="pc-sec">Play-by-Play Review</div>${highlights}</div>` : ''}
      <div class="pc-improved">
        <div class="pc-sec">The Improved Play</div>
        <div class="pc-improved-text">${esc(r.improved_prompt)}</div>
        <div class="pc-actions">
          <button class="pc-copy">Copy</button>
          <button class="pc-use">Use This Prompt</button>
        </div>
      </div>
    `);
  }

  // ---- Helpers ----

  insertPrompt(text) {
    if (!this.promptField) return;
    if (this.promptField.tagName === 'TEXTAREA' || this.promptField.tagName === 'INPUT') {
      const proto = this.promptField.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(this.promptField, text);
      this.promptField.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      this.promptField.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = text;
      this.promptField.appendChild(p);
      this.promptField.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }

  toast(msg) {
    const el = document.createElement('div');
    el.className = 'pc-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('pc-toast-on'));
    setTimeout(() => {
      el.classList.remove('pc-toast-on');
      setTimeout(() => el.remove(), 300);
    }, 2500);
  }
}

// Boot
new PromptCoach();
