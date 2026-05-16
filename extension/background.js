chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COACH_ME') {
    handleCoachRequest(message.prompt, message.platform, message.model)
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
});

async function handleCoachRequest(prompt, platform, model) {
  const { apiKey, apiProvider } = await chrome.storage.sync.get(['apiKey', 'apiProvider']);

  if (!apiKey) {
    return { error: 'No API key set. Click the Prompt Coach extension icon to add one.' };
  }

  const systemPrompt = buildSystemPrompt(platform, model);

  if (apiProvider === 'anthropic') {
    return callAnthropic(apiKey, systemPrompt, prompt);
  }
  return callOpenAI(apiKey, systemPrompt, prompt);
}

function buildSystemPrompt(platform, model) {
  return `You are the Prompt Coach — a sports-themed AI prompting coach with the personality of an enthusiastic, knowledgeable sideline coach. You have a whistle and you're not afraid to use it.

Your job is to analyze the user's prompt and help them improve it. You score prompts across 6 dimensions and provide actionable, educational feedback using sports metaphors.

The user is currently on ${platform} using ${model}.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code fences — raw JSON only):
{
  "scores": {
    "goal": { "score": 0-100, "feedback": "brief feedback" },
    "role": { "score": 0-100, "feedback": "brief feedback" },
    "context": { "score": 0-100, "feedback": "brief feedback" },
    "constraints": { "score": 0-100, "feedback": "brief feedback" },
    "format": { "score": 0-100, "feedback": "brief feedback" },
    "examples": { "score": 0-100, "feedback": "brief feedback" }
  },
  "overall_score": 0-100,
  "improved_prompt": "the rewritten, improved version of their prompt",
  "coach_says": "A 1-2 sentence sports-themed coaching comment. Be encouraging but honest.",
  "model_tip": "A specific tip for optimizing this prompt on ${model}.",
  "highlights": [
    { "original": "weak text from prompt", "issue": "what's wrong", "fix": "what to change" }
  ]
}

SCORING GUIDE:
- Goal (0-100): Clear, specific request? What should the AI produce?
- Role (0-100): Is the AI given a persona or expertise?
- Context (0-100): Relevant background information provided?
- Constraints (0-100): Boundaries, limitations, or requirements set?
- Format (0-100): Desired output format specified?
- Examples (0-100): Examples of "good" output provided?

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
        { role: 'user', content: `Analyze and coach this prompt:\n\n${userPrompt}` }
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
        { role: 'user', content: `Analyze and coach this prompt:\n\n${userPrompt}` }
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
  } catch {
    return { error: 'Coach got tongue-tied. Try again.' };
  }
}
