// ---------------------------------------------------------------------------
// Prompt Coach — Content Script
// Detects AI platform prompt fields, injects the whistle mascot + score gauge,
// handles ambient scoring and the "Coach Me" panel.
// ---------------------------------------------------------------------------

const PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT',
    hostnames: ['chatgpt.com', 'chat.openai.com'],
    selectors: ['#prompt-textarea', '[id="prompt-textarea"]', 'div[contenteditable="true"][data-placeholder]'],
    model: 'GPT-4o'
  },
  claude: {
    name: 'Claude',
    hostnames: ['claude.ai'],
    selectors: ['div.ProseMirror[contenteditable="true"]', 'fieldset div[contenteditable="true"]'],
    model: 'Claude Sonnet'
  },
  gemini: {
    name: 'Gemini',
    hostnames: ['gemini.google.com'],
    selectors: ['div[contenteditable="true"]', '.ql-editor', 'rich-textarea div[contenteditable="true"]'],
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
// Whistle mascot SVG
// ---------------------------------------------------------------------------
function whistleSVG(size = 40) {
  return `<svg class="pc-whistle-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Lanyard -->
    <path d="M58 18 C63 4, 76 4, 72 18" stroke="#1B6B3E" fill="none" stroke-width="3" stroke-linecap="round"/>
    <!-- Ring -->
    <circle cx="65" cy="15" r="4.5" fill="none" stroke="#9CA3AF" stroke-width="2.5"/>
    <!-- Body -->
    <path d="M12 40 C8 40, 5 44, 5 52 C5 60, 8 64, 12 64 L68 64 C76 64, 80 60, 80 52 C80 44, 76 40, 68 40 Z" fill="#D4D4D8" stroke="#A1A1AA" stroke-width="1.5"/>
    <!-- Mouthpiece -->
    <path d="M76 45 L92 45 C95 45, 97 47, 97 50 L97 54 C97 57, 95 59, 92 59 L76 59" fill="#B4B4BA" stroke="#A1A1AA" stroke-width="1.5"/>
    <!-- Sound slot -->
    <ellipse cx="10" cy="52" rx="4" ry="6" fill="#71717A"/>
    <!-- Stripes -->
    <line x1="28" y1="40" x2="28" y2="64" stroke="#E8E8EC" stroke-width="1.5" opacity="0.5"/>
    <line x1="62" y1="40" x2="62" y2="64" stroke="#E8E8EC" stroke-width="1.5" opacity="0.5"/>
    <!-- Left eye -->
    <ellipse cx="39" cy="51" rx="8" ry="9" fill="white"/>
    <circle cx="41" cy="51" r="5" fill="#1a1a1a"/>
    <circle cx="42.5" cy="49" r="2" fill="white"/>
    <!-- Right eye -->
    <ellipse cx="55" cy="51" rx="8" ry="9" fill="white"/>
    <circle cx="57" cy="51" r="5" fill="#1a1a1a"/>
    <circle cx="58.5" cy="49" r="2" fill="white"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Quick client-side scoring (no API needed)
// ---------------------------------------------------------------------------
function quickScore(text) {
  let score = 0;
  const lower = text.toLowerCase();
  const len = text.length;

  // Goal: clear action verb / request
  const actions = ['write','create','generate','explain','analyze','summarize','list','compare',
    'design','build','help','review','suggest','describe','translate','convert','refactor',
    'debug','optimize','implement','rewrite','draft','evaluate','outline','plan','identify'];
  if (actions.some(w => lower.includes(w))) score += 15;
  if (len > 30) score += 5;

  // Role: persona assigned
  const roles = ['you are','act as','as a','pretend','role of','expert in','specialist',
    "you're a",'imagine you','you will be','behave as'];
  if (roles.some(p => lower.includes(p))) score += 15;

  // Context: background info
  const ctx = ['because','context','background','i am',"i'm working",'the goal','i need',
    'i want','my project','we are','our team','the situation','currently','for a','given that',
    'considering','the purpose'];
  const ctxHits = ctx.filter(s => lower.includes(s)).length;
  score += Math.min(ctxHits * 7, 20);

  // Constraints: boundaries
  const cons = ["don't",'do not','avoid','must','should not','limit','only','no more than',
    'at most','at least','without','except','must not','keep it','make sure','ensure'];
  if (cons.some(s => lower.includes(s))) score += 15;

  // Format: output structure
  const fmt = ['format','table','list','bullet','json','csv','markdown','step by step',
    'numbered','paragraph','code block','sections','headers','outline','in the form'];
  if (fmt.some(s => lower.includes(s))) score += 15;

  // Examples
  const ex = ['for example','e.g.','such as','like this',"here's an example",'for instance',
    'example:','sample','here is an example'];
  if (ex.some(s => lower.includes(s))) score += 15;

  if (len > 100) score += 3;
  if (len > 200) score += 3;
  if (len > 500) score += 4;

  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Main controller
// ---------------------------------------------------------------------------
class PromptCoach {
  constructor() {
    this.platform = this.detectPlatform();
    this.promptField = null;
    this.mascotEl = null;
    this.scoreEl = null;
    this.panelEl = null;
    this.debounceTimer = null;
    this.isCoaching = false;

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
    this.observe();
    this.tryAttach();
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.coachMe();
      }
    });
  }

  observe() {
    new MutationObserver(() => {
      if (!this.promptField || !document.contains(this.promptField)) {
        this.promptField = null;
        this.tryAttach();
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  tryAttach() {
    if (this.promptField) return;
    for (const sel of this.platform.selectors) {
      const el = document.querySelector(sel);
      if (el && !el.dataset.pcAttached) {
        this.attach(el);
        return;
      }
    }
  }

  attach(field) {
    this.promptField = field;
    field.dataset.pcAttached = 'true';

    this.createMascot(field);

    field.addEventListener('input', () => this.onInput());
    field.addEventListener('keyup', () => this.onInput());
  }

  // ---- Mascot + Score Gauge ----

  createMascot(field) {
    this.mascotEl = document.createElement('div');
    this.mascotEl.className = 'pc-mascot';
    this.mascotEl.innerHTML = whistleSVG(36);
    this.mascotEl.title = 'Click to get coached! (Ctrl+Shift+P)';

    // Score ring
    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'pc-score-gauge';
    this.scoreEl.innerHTML = `
      <svg viewBox="0 0 36 36" class="pc-score-ring">
        <path class="pc-score-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        <path class="pc-score-fill"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          stroke-dasharray="0, 100"/>
      </svg>
      <span class="pc-score-text">—</span>`;
    this.mascotEl.appendChild(this.scoreEl);

    // Position near the prompt field
    const anchor = field.closest('form') || field.parentElement;
    if (anchor) {
      const pos = getComputedStyle(anchor).position;
      if (pos === 'static') anchor.style.position = 'relative';
      anchor.appendChild(this.mascotEl);
    }

    this.mascotEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.coachMe();
    });
  }

  // ---- Input handling ----

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
      if (text.length > 10) {
        this.updateScore(quickScore(text));
        this.mascotEl.classList.add('pc-active');
      } else {
        this.updateScore(0);
        this.mascotEl.classList.remove('pc-active');
      }
    }, 400);
  }

  updateScore(score) {
    const fill = this.scoreEl?.querySelector('.pc-score-fill');
    const label = this.scoreEl?.querySelector('.pc-score-text');
    if (!fill || !label) return;

    fill.style.strokeDasharray = `${score}, 100`;
    label.textContent = score > 0 ? score : '—';

    let color = '#6B7280';
    if (score >= 70) color = '#22C55E';
    else if (score >= 40) color = '#F59E0B';
    else if (score > 0) color = '#EF4444';
    fill.style.stroke = color;
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
    this.mascotEl.classList.add('pc-coaching');
    this.showPanel({ loading: true });

    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'COACH_ME',
        prompt: text,
        platform: this.platform.name,
        model: this.platform.model
      });
      if (resp.error) this.showPanel({ error: resp.error });
      else this.showPanel({ result: resp });
    } catch {
      this.showPanel({ error: 'Could not reach Prompt Coach. Check your API key in the extension popup.' });
    } finally {
      this.isCoaching = false;
      this.mascotEl.classList.remove('pc-coaching');
    }
  }

  // ---- Panel rendering ----

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
    document.addEventListener('keydown', this._escHandler = (e) => {
      if (e.key === 'Escape') this.hidePanel();
    });
    document.body.appendChild(this.panelEl);

    // Wire buttons after DOM insertion
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
      this.promptField.textContent = text;
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

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Boot
new PromptCoach();
