# Research Notes: Model-Specific Coaching and Novel Interaction Patterns

## Model-Specific Strengths (2026 Landscape)

From buildfastwithai.com and aizolo.com:
- Claude Opus 4.6: Best for coding (75.6% SWE-Bench), creative writing, instruction following, long-context analysis
- Gemini 3.1 Pro: Best for reasoning, science (94.3% GPQA), multimodal tasks, agentic coding
- GPT-5.4: Best for general-purpose, lowest hallucination (33% less), ecosystem integration
- Grok 4.20: Best for real-time information, unfiltered responses

## Model-Specific Prompting Differences

From Medium guide:
- GPT-4o/5.4: Conversational, contextual. Treat like expert collaborator. Chain multiple commands.
- Claude: Persona-driven with extensive context. Use XML tags for structure. Leverages massive context windows.
- Specialized reasoning models (DeepSeek, O1): Structured, formal, unambiguous. Explicit step-by-step. Clear constraints.
- Gemini: Good with multimodal inputs. Explicit about modalities.

## Model Routing Technology (Already Exists)

- OpenRouter Auto Router (powered by NotDiamond): Automatically selects best model for prompt
- Azure Model Router: Trained language model that routes prompts to most suitable LLM in real time
- Kilo Auto Model: Uses work modes as signals to route to optimal model
- MindStudio: AI model router for cost optimization

Key insight: Model routing exists for developers/APIs but NOT as an educational tool for end users. Nobody is teaching users WHY they should switch models.

## Novel AI Interaction Patterns (from Shape of AI + research)

### From shapeof.ai (Emily Campbell's taxonomy):
- Wayfinders: Help users construct first prompt (example galleries, follow-ups, nudges, suggestions, templates)
- Prompt Actions: Auto-fill, chained actions, inline actions, inpainting, madlibs, regenerate, restructure
- Tuners: Attachments, connectors, filters, model management, modes, parameters, preset styles, prompt enhancer, saved styles, voice and tone
- Governors: Action plans, branches, citations, controls, cost estimates, draft mode, memory, stream of thought, variations, verification
- Trust Builders: Caveats, consent, data ownership, disclosure, footprints, incognito mode, watermarks

### Predictive Anticipation Pattern:
- AI predicts what user needs before they express it
- Pre-loads content and suggests actions based on behavioral patterns
- Examples: Google Maps pre-loading commute, Spotify Discover Weekly, smart email replies
- Key: Learn from multi-session behavior, make predictions transparent, allow user control

### Ambient Intelligence Pattern:
- AI operates continuously in background using contextual signals
- Makes intelligent decisions without explicit commands
- "Zero UI" - voice, gestures, sensors, context replace buttons

### Proactive AI for Developers (ResearchGate study):
- Study on proactive coding assistants
- Key findings: timing of interventions matters, alignment with developer workflow critical
- Proactive suggestions work when they don't interrupt flow

## Interaction Patterns to Propose for Prompt Coach

1. **Highlight-and-Ask**: User highlights a specific part of their prompt, tool explains just that section
2. **Before/After Split View**: Show original vs improved side by side with annotations
3. **Progressive Disclosure**: Start with simple improvement, let user drill into why
4. **Ambient Scoring**: Subtle color/indicator changes as user types showing prompt quality in real time
5. **Model Compass**: Visual indicator showing which model would handle this prompt best and why
6. **Anticipatory Nudges**: Based on patterns, suggest improvements BEFORE user finishes typing
7. **Voice Sketch to Prompt**: Speak rough thoughts, see them structured into a prompt in real time
8. **Contextual Questioning**: Tool asks one clarifying question that would most improve the prompt
9. **Replay Mode**: Show how your prompting has evolved over time, like a time-lapse
10. **Peer Comparison**: Anonymous comparison of how others prompted for similar tasks
