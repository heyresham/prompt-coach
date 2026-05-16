# Research Notes: Prompt Improvement Tools Landscape

## Existing Tools & Projects Found

### 1. Teleprompt AI (Chrome Extension)
- **URL**: https://www.get-teleprompt.com/ / Chrome Web Store
- **What it does**: One-click prompt optimization directly in ChatGPT, Gemini, Claude interfaces
- **Features**: "Improve" mode (paste prompt, click improve) and "Craft" mode (answer questions, get prompt generated)
- **Scale**: 8,000+ users, 4.9/5 rating, supports 100+ languages
- **Tech**: Chrome extension, Manifest V3, content script injection into AI chat sites
- **Lessons from builder**: Keep UI simple (two modes only), show before/after examples, solve a real itch
- **Gap**: Does NOT teach or track learning over time. Pure rewrite tool.

### 2. MakePromptsBetter.com
- **URL**: https://makepromptsbetter.com/
- **What it does**: Paste your rough thoughts, get them translated into proper prompts
- **Target**: Developers doing vibe coding, knowledge workers, non-technical AI users
- **Model**: 5 free optimizations/month, then paid
- **Gap**: No teaching component, no learning journal, no progress tracking

### 3. Buddy AI (Open Source)
- **URL**: https://github.com/nav-v/buddy-ai
- **What it does**: Local-first AI chat app with built-in coaching layer
- **Key differentiator**: Watches prompts and gives real-time FEEDBACK (without doing the task for you)
- **Features**:
  - Suggests improvements to prompt structure (context, constraints, format, examples)
  - Recommends right tools/modes
  - Flags low-value/risky delegation
  - Suggests better next prompt when stuck
  - Three-pane UI: main chat + coaching panel
  - Multi-provider (Gemini, OpenAI, Anthropic, OpenRouter)
  - Customizable coaching prompt
- **Tech**: TypeScript (98.2%), Next.js, Prisma/SQLite, Tailwind, Docker support
- **Gap**: No persistent learning journal, no pattern detection over time, no progress tracking

### 4. Wise Prompt Coach (Gemini Gem)
- **URL**: Medium article by Ben Davies-Romano (Wise Design team)
- **What it does**: Receives draft prompt, assesses against "good prompt" framework, shares feedback, guides improvement
- **Key philosophy**: "Rather than just spit out a rewritten prompt, it educates you about prompting, encourages you to explore techniques, and challenges you to apply creativity"
- **Scoring dimensions**:
  - Clarity and specificity
  - Context and framing
  - Structure and format
  - Goal alignment
  - Use of techniques
  - Robustness and fallibility
  - Creativity and adaptability
  - Linguistic concision
- **Framework taught**: Role, Task, Guardrails/Principles, Knowledge, Expected Input/Output
- **Techniques**: Few-shot, Chain-of-thought
- **Gap**: It's a Gemini Gem (custom GPT equivalent), not a standalone product. No persistent memory or progress tracking.

### 5. PromptPerfect (by Jina AI)
- **URL**: https://promptperfect.jina.ai/
- **What it does**: Automated prompt optimization for GPT-4, ChatGPT, Midjourney, etc.
- **Focus**: Developer/researcher tool for refining prompts
- **Gap**: Pure optimization, no teaching, no learning tracking

### 6. Emio.io (Daily Practice Tool)
- **URL**: https://emio.io
- **What it does**: Daily challenges for prompt engineering practice (like Duolingo for AI)
- **How it works**: Get challenge with background brief, write prompt, get scored and feedback
- **Features**: Challenge-based, scoring, feedback, comparison of attempts, prompt improver
- **Scale**: 3,000+ users
- **Gap**: Practice-focused, not integrated into actual workflow. Doesn't help in real-time when you're actually prompting.

### 7. PromptMe AI (iOS App)
- **Features mentioned**: Save prompts with notepad, progress tracking (daily XP goals, streaks, belt rank, achievements), review past work
- **Gap**: Gamification of learning, but not an overlay/assistant for real-time use

### 8. MetaPrompt (Chrome Extension)
- **URL**: Chrome Web Store
- **What it does**: Powered by GPT-4.1, analyzes questions and refines them
- **Gap**: Pure rewrite, no teaching

### 9. Prompt Engineering Assistant (Chrome Extension)
- **URL**: Chrome Web Store
- **What it does**: Guides users through crafting prompts and creating customized agents
- **Gap**: More of a wizard/guide, not a learning companion

### 10. PromptForge (GitHub - multiple repos)
- Various implementations focusing on prompt management, versioning, testing
- More developer-focused tooling than end-user coaching

## Key Frameworks Referenced

### KERNEL Framework (6 Patterns)
- K - Keep it simple (one clear goal)
- E - Easy to verify (testable outputs)
- R - Relevant context (only what's needed)
- N - Natural language (clear, direct)
- E - Examples included (few-shot)
- L - Logical structure (step-by-step)

### Wise Prompt Coach Framework
- Role, Task, Guardrails/Principles, Knowledge, Expected Input/Output
- Techniques: Few-shot, Chain-of-thought

### OpenAI/Anthropic Best Practices
- Be specific, provide context, use examples, define format, iterate

## Voice Input Tools
- WisprFlow: Voice-to-text AI that cleans speech in real-time
- WillowVoice: Voice dictation for ChatGPT
- Voibe: On-device AI speech-to-text
- Web Speech API: Browser-native speech recognition

## GAP ANALYSIS: What Doesn't Exist Yet

The key insight: **No single tool combines ALL of these:**
1. Real-time prompt rewriting/improvement (like Teleprompt/MakePromptsBetter)
2. Educational feedback explaining WHY the rewrite is better (like Wise Prompt Coach)
3. Persistent learning journal that tracks patterns over time
4. Detection of repeated mistakes with personalized coaching
5. Voice input support for natural expression
6. Progress tracking and skill development visualization
7. Works as an overlay/plugin in the user's actual workflow

Buddy AI comes closest (coaching + real-time feedback) but lacks the learning journal, pattern detection, and progress tracking.
Emio.io has the practice/learning angle but isn't integrated into real workflow.
Teleprompt AI has the overlay/extension UX but no teaching or tracking.

**This is a genuine whitespace opportunity.**
