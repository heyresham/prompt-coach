importScripts('journal.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COACH_ME') {
    handleCoachRequest(message.prompt, message.platform, message.model, message.conciseMode, message.clarification)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'VERIFY_INTENT') {
    handleIntentVerification(message.prompt, message.platform, message.model)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(['apiKey', 'apiProvider'], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === 'SAVE_JOURNAL_ENTRY') {
    JournalStorage.addEntry(message.entry).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === 'GET_JOURNAL_COUNT') {
    JournalStorage.getCount().then(count => sendResponse({ count }));
    return true;
  }
  if (message.type === 'GET_JOURNAL') {
    JournalStorage.getEntries().then(entries => sendResponse({ entries })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === 'CLEAR_JOURNAL') {
    JournalStorage.clear().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'SET_PASSPHRASE') {
    JournalStorage.setPassphrase(message.passphrase).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === 'UNLOCK_JOURNAL') {
    JournalStorage.unlock(message.passphrase).then(ok => sendResponse({ ok })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === 'GET_JOURNAL_STATUS') {
    JournalStorage.isEncrypted().then(enc => sendResponse({ encrypted: enc, unlocked: JournalStorage.isUnlocked() }));
    return true;
  }
});

async function handleCoachRequest(prompt, platform, model, conciseMode, clarification) {
  const { apiKey, apiProvider } = await chrome.storage.sync.get(['apiKey', 'apiProvider']);

  if (!apiKey || apiProvider === 'demo') {
    return generateDemoResponse(prompt, platform, model);
  }

  let systemPrompt = buildSystemPrompt(platform, model);

  if (conciseMode) {
    systemPrompt += '\n\nCONCISE MODE: Aggressively optimize the improved prompt for minimal tokens while preserving meaning. Aim for 30%+ reduction.';
  }

  let userPrompt = `Analyze and coach this prompt:\n\n${prompt}`;
  if (clarification) {
    userPrompt += `\n\n[User clarification: ${clarification}]`;
  }

  if (apiProvider === 'anthropic') {
    return callAnthropic(apiKey, systemPrompt, userPrompt);
  }
  return callOpenAI(apiKey, systemPrompt, userPrompt);
}

function generateDemoResponse(prompt, platform, model) {
  const lower = prompt.toLowerCase();
  const len = prompt.length;

  const hasGoal = /\b(write|create|generate|explain|analyze|summarize|list|compare|design|build|help|review|suggest|describe|debug|implement|draft|outline)\b/.test(lower);
  const hasRole = /\b(you are|act as|as a|pretend|role of|expert|specialist|you're a|imagine you)\b/.test(lower);
  const hasContext = /\b(because|context|background|i am|i'm working|the goal|i need|i want|my project|we are|currently|given that)\b/.test(lower);
  const hasConstraints = /\b(don't|do not|avoid|must|should not|limit|only|no more than|without|ensure|make sure)\b/.test(lower);
  const hasFormat = /\b(format|table|list|bullet|json|csv|markdown|step by step|numbered|code block|sections|outline)\b/.test(lower);
  const hasExamples = /\b(for example|e\.g\.|such as|like this|here's an example|for instance|example:|sample)\b/.test(lower);

  const hasFiller = /\b(please|kindly|basically|actually|really|very|just|simply|I would like you to|if you could|would you be able to)\b/.test(lower);
  const isVerbose = len > 300 && !hasConstraints;
  const isEfficient = !isVerbose && !hasFiller && len < 500;

  const score = (has, base) => has ? Math.min(base + Math.floor(Math.random() * 20), 95) : Math.floor(Math.random() * 25) + 5;

  const scores = {
    goal:        { score: score(hasGoal, 60),        feedback: hasGoal ? 'Clear ask — the model knows what you want.' : 'What exactly do you want the AI to produce? Be specific.' },
    role:        { score: score(hasRole, 55),        feedback: hasRole ? 'Good — you gave the AI an identity to work from.' : 'Try assigning a role: "Act as a senior developer…"' },
    context:     { score: score(hasContext, 55),     feedback: hasContext ? 'Solid background info for the model to work with.' : 'Add context — what\'s the situation, who\'s the audience?' },
    constraints: { score: score(hasConstraints, 55), feedback: hasConstraints ? 'Nice boundaries — keeps the output focused.' : 'Set some guardrails: length, tone, things to avoid.' },
    format:      { score: score(hasFormat, 60),      feedback: hasFormat ? 'Output format specified — no guesswork for the model.' : 'Tell it what shape the answer should take: list, table, essay?' },
    examples:    { score: score(hasExamples, 55),    feedback: hasExamples ? 'Examples give the model a target to aim for.' : 'Show an example of what "good" looks like — even a short one helps.' },
    efficiency:  { score: score(isEfficient, 55),    feedback: isEfficient ? 'Lean and mean — no wasted tokens.' : 'Cut filler words and tighten up. Every token counts.' }
  };

  const overall = Math.round(Object.values(scores).reduce((s, d) => s + d.score, 0) / 7);

  const coachLines = {
    low:  [
      "Timeout! You're running onto the field without a game plan. Let's draw up a proper play.",
      "Whistle! That prompt is a Hail Mary — let's turn it into a designed play.",
      "Hold up, rookie! You've got heart, but this prompt needs fundamentals."
    ],
    mid:  [
      "Decent first drive! A few adjustments and you'll be in the red zone.",
      "Good hustle — you're moving the ball. Let's tighten up the weak spots.",
      "Solid start, but we're leaving points on the board. Let's fix that."
    ],
    high: [
      "Textbook execution! Clean reads, great fundamentals. Almost ready to send.",
      "Now THAT's championship-caliber prompting. Just minor tweaks left.",
      "You're in the zone! This prompt has all the right moves."
    ]
  };

  const tier = overall >= 65 ? 'high' : overall >= 40 ? 'mid' : 'low';
  const lines = coachLines[tier];
  const coachSays = lines[Math.floor(Math.random() * lines.length)];

  const modelTips = {
    'ChatGPT':    `GPT responds well to conversational framing. Try: "Let's work through this together…" instead of just issuing a command.`,
    'Claude':     `Claude loves XML tags for structure. Wrap key sections in <context>, <constraints>, <format> tags for sharper results.`,
    'Gemini':     `Gemini excels at reasoning tasks. Explicitly ask it to "think step by step" or "show your reasoning" for better outputs.`,
    'Perplexity': `Perplexity is search-augmented — be specific about what facts you need and ask it to cite sources.`,
    'Copilot':    `Copilot works best with direct, task-focused prompts. Skip the preamble and get to the point.`
  };

  const highlights = [];
  if (!hasRole) highlights.push({ original: prompt.slice(0, 40) + (prompt.length > 40 ? '…' : ''), issue: 'No role assigned — the AI doesn\'t know what expert hat to wear.', fix: 'Start with "Act as a [role]…" to set the AI\'s expertise and tone.' });
  if (!hasFormat) highlights.push({ original: 'the entire prompt', issue: 'No output format specified — you\'ll get whatever shape the model defaults to.', fix: 'Add "Format the response as a [bullet list / table / code block]."' });
  if (!hasConstraints) highlights.push({ original: 'the entire prompt', issue: 'No constraints — the model has no boundaries on length, tone, or scope.', fix: 'Add limits: "Keep it under 200 words" or "Avoid jargon."' });

  const improved = [
    hasRole ? '' : 'Act as an experienced assistant. ',
    prompt,
    hasFormat ? '' : '\n\nFormat your response as a clear, structured breakdown.',
    hasConstraints ? '' : ' Keep it concise and actionable.'
  ].join('').trim();

  const tokenEstimate = Math.ceil(len / 4);
  const efficiency_note = tokenEstimate > 200
    ? `Your prompt uses ~${tokenEstimate} tokens. Models have limited context windows (4K–128K tokens). Longer prompts = less room for the response. Trim the fat.`
    : `~${tokenEstimate} tokens — compact and efficient. Plenty of room for a detailed response.`;

  return {
    scores,
    overall_score: overall,
    coach_says: coachSays,
    model_tip: modelTips[platform] || modelTips['ChatGPT'],
    highlights,
    improved_prompt: improved,
    token_estimate: tokenEstimate,
    efficiency_note: efficiency_note
  };
}

async function handleIntentVerification(prompt, platform, model) {
  const { apiKey, apiProvider } = await chrome.storage.sync.get(['apiKey', 'apiProvider']);

  if (!apiKey || apiProvider === 'demo') {
    return generateDemoIntent(prompt);
  }

  const systemPrompt = buildIntentPrompt(platform, model);
  const userPrompt = prompt;

  if (apiProvider === 'anthropic') {
    return callAnthropic(apiKey, systemPrompt, userPrompt);
  }
  return callOpenAI(apiKey, systemPrompt, userPrompt);
}

function generateDemoIntent(prompt) {
  const lower = prompt.toLowerCase();

  // Extract goal from action verbs
  const actionVerbs = ['write', 'create', 'generate', 'explain', 'analyze', 'summarize', 'list', 'compare',
    'design', 'build', 'help', 'review', 'suggest', 'describe', 'debug', 'implement', 'draft', 'outline',
    'translate', 'convert', 'refactor', 'optimize', 'rewrite', 'evaluate', 'plan', 'identify'];
  const foundVerb = actionVerbs.find(v => lower.includes(v)) || 'do something with';

  // Build a short goal summary
  const words = prompt.split(/\s+/).slice(0, 12).join(' ');
  const goalSummary = `You want to ${foundVerb} something: "${words}${prompt.split(/\s+/).length > 12 ? '...' : ''}"`;

  // Detect assumptions
  const assumptions = [];
  if (!/\b(audience|reader|user|customer|beginner|expert|technical|non-technical)\b/.test(lower)) {
    assumptions.push('Audience is unclear — who is this for?');
  }
  if (!/\b(formal|informal|casual|professional|friendly|tone|voice)\b/.test(lower)) {
    assumptions.push('Tone is not specified — defaulting to neutral.');
  }
  if (!/\b(english|spanish|french|german|chinese|japanese|language)\b/.test(lower)) {
    assumptions.push('Language not specified — assuming English.');
  }

  return {
    intent: {
      goal_summary: goalSummary,
      assumptions: assumptions.slice(0, 3)
    }
  };
}

function buildIntentPrompt(platform, model) {
  return `You are a prompt intent analyzer. The user will give you a prompt they plan to send to ${model} on ${platform}.

Your job: identify what they're trying to accomplish and surface hidden assumptions.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code fences — raw JSON only):
{
  "intent": {
    "goal_summary": "1-sentence summary of what the user wants",
    "assumptions": ["assumption 1", "assumption 2", "assumption 3"]
  }
}

Keep assumptions to max 3. Focus on: audience, tone, language, scope, output format, or domain knowledge that the prompt takes for granted.

Return ONLY valid JSON.`;
}

function buildSystemPrompt(platform, model) {
  return `You are the Prompt Coach — a sports-themed AI prompting coach with the personality of an enthusiastic, knowledgeable sideline coach. You have a whistle and you're not afraid to use it.

Your job is to analyze the user's prompt and help them improve it. You score prompts across 7 dimensions and provide actionable, educational feedback using sports metaphors.

The user is currently on ${platform} using ${model}.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code fences — raw JSON only):
{
  "scores": {
    "goal": { "score": 0-100, "feedback": "brief feedback" },
    "role": { "score": 0-100, "feedback": "brief feedback" },
    "context": { "score": 0-100, "feedback": "brief feedback" },
    "constraints": { "score": 0-100, "feedback": "brief feedback" },
    "format": { "score": 0-100, "feedback": "brief feedback" },
    "examples": { "score": 0-100, "feedback": "brief feedback" },
    "efficiency": { "score": 0-100, "feedback": "brief" }
  },
  "overall_score": 0-100,
  "improved_prompt": "the rewritten, improved version of their prompt",
  "coach_says": "A 1-2 sentence sports-themed coaching comment. Be encouraging but honest.",
  "model_tip": "A specific tip for optimizing this prompt on ${model}.",
  "highlights": [
    { "original": "weak text from prompt", "issue": "what's wrong", "fix": "what to change" }
  ],
  "token_estimate": <number>,
  "efficiency_note": "1-sentence educational note about token usage"
}

SCORING GUIDE:
- Goal (0-100): Clear, specific request? What should the AI produce?
- Role (0-100): Is the AI given a persona or expertise?
- Context (0-100): Relevant background information provided?
- Constraints (0-100): Boundaries, limitations, or requirements set?
- Format (0-100): Desired output format specified?
- Examples (0-100): Examples of "good" output provided?
- Efficiency (0-100): Is the prompt concise? Are there filler words or redundancy? Every token costs money and fills the context window.

0 = completely absent. 50 = present but vague. 100 = excellent.

MODEL-SPECIFIC KNOWLEDGE:
- GPT-4o / GPT-5: Conversational all-rounder, low hallucination. Responds well to expert-collaborator framing.
- Claude (Opus/Sonnet): Excellent at coding, instruction following, long context. Responds exceptionally to XML tags (<constraints>, <context>, etc.).
- Gemini Pro: Strong reasoning, science, multimodal. Ask explicitly for step-by-step.
- Perplexity: Search-augmented. Be specific about needed facts.
- Copilot: Microsoft-integrated. Be direct and task-focused.

TONE:
- Sports metaphors, used naturally (not forced)
- Encouraging but honest — push to improve
- Concise — coaches bark, they don't lecture
- Celebrate good work
- Examples: "Timeout! You're running onto the field without a game plan..." / "Textbook execution! Send it."

Return ONLY valid JSON.`;
}

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.choices[0].message.content;
  return parseCoachResponse(text);
}

async function callAnthropic(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.content[0].text;
  return parseCoachResponse(text);
}

function parseCoachResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return { error: 'Coach got tongue-tied. Try again.' };
  }
}
