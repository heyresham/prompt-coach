# Prompt Coach: Research Findings and Project Plan

*A "Grammarly for AI Prompts" that rewrites, teaches, and tracks your growth as a prompter over time.*

---

## 1. The Opportunity

You described a tool that sits between you and the AI model, intercepts what you would have naturally said (typed or spoken), rewrites it into a better prompt, explains why the rewrite is better, and keeps a running journal of what you learn so it can coach you over time. This is a genuinely compelling idea, and after researching the current landscape, I can confirm that nothing on the market today fully realizes this vision.

Several tools handle pieces of it. None combine all the pieces into one coherent experience. That gap is your opportunity.

---

## 2. What Already Exists

I surveyed the current market and found tools that touch on this problem. They fall into four distinct categories, each with clear strengths and equally clear limitations.

### Category 1: One-Click Rewriters

These tools take your rough prompt and spit out a polished version. They work, but they don't teach.

| Tool | Form Factor | What It Does | Users | Key Limitation |
|------|-------------|--------------|-------|----------------|
| Teleprompt AI | Chrome Extension | One-click prompt optimization directly inside ChatGPT, Claude, Gemini | 8,000+ | No explanation of changes, no learning over time |
| MakePromptsBetter | Web App | Paste thoughts, get optimized prompt back | Unknown | Black box rewrite, no teaching, no memory |
| PromptPerfect | Web App | Automated optimization for GPT-4, DALL-E, etc. | Enterprise-focused | Developer tool, no educational component |
| MetaPrompt | Chrome Extension | GPT-4.1 powered prompt refinement | Unknown | Pure rewrite, no coaching |

The builder of Teleprompt AI shared a valuable lesson: his first prototype had toggles, sliders, and options everywhere, and users hated it. The version that succeeded has exactly two modes: "Improve" (one-click rewrite) and "Craft" (answer questions to generate a prompt). Simplicity won [1].

### Category 2: Practice Platforms

These tools teach prompt engineering through structured exercises, but they exist outside your actual workflow.

| Tool | Form Factor | What It Does | Approach |
|------|-------------|--------------|----------|
| Emio.io | Web App | Daily prompt challenges with scoring and feedback | Duolingo-style challenges with background briefs |
| PromptMe AI | iOS App | XP goals, streaks, belt ranks, achievements | Gamified learning with progress tracking |
| Learn Prompting | Web Course | 60+ modules on prompt engineering | Traditional course format with quizzes |

Emio.io is particularly interesting because its creator spent a year running AI training sessions at companies and noticed the core problem: there is no interactive way for people to practice getting better at prompts [3]. His solution was daily challenges where you write a prompt, get scored, and see how your attempt compares to your first try. Over 3,000 users found this useful.

### Category 3: Real-Time Coaches

These tools provide feedback on your prompts as you write them, but they lack persistent memory.

| Tool | Form Factor | What It Does | Key Differentiator |
|------|-------------|--------------|-------------------|
| Buddy AI | Open-source web app (Next.js) | Three-pane UI with coaching panel alongside main chat | Suggests improvements without doing the task for you |
| Wise Prompt Coach | Gemini Gem (internal tool) | Scores prompts across 8 dimensions, guides iterative improvement | Educates rather than just rewrites |

**Buddy AI** is the closest thing to what you described. It is a local-first, open-source chat application built in TypeScript with Next.js, Prisma, and SQLite [4]. It uses a three-pane interface where a "coaching panel" watches your prompts in real time and offers feedback. It suggests improvements to structure, recommends tools, and flags risky delegation. However, it has no persistent learning journal, no pattern detection across sessions, and no progress visualization.

**The Wise Prompt Coach**, built by the design team at Wise (formerly TransferWise), takes a different approach [5]. It is a Gemini Gem (similar to a custom GPT) that scores prompts across eight specific dimensions.

### Category 4: The Context-Aware Assistant (The "Clicky" Model)

Recently, a tool called **Clicky** went viral, representing a new paradigm: the persistent, context-aware companion. Built by Farza Majeed (founder of buildspace), Clicky is an open-source macOS app that lives next to your cursor, sees your screen, listens to your voice, and points at UI elements to teach you how to use software [7].

The media reception for Clicky was overwhelmingly positive. XDA Developers called it "the most useful thing I've tried in months" [8]. Its original demo video on X garnered nearly 3 million views and 15,000 likes.

**What Clicky gets right (Lessons for your project):**
1. **Voice-first, zero-friction input:** Users hold Control+Option and speak. It's the lowest possible friction for asking a question.
2. **Context-awareness:** Because it sees the screen, the user doesn't have to explain *where* they are or *what* they are looking at.
3. **Teaching over doing:** It points at elements and explains steps, acting like a teacher guiding your hand, which users love [8].
4. **Non-intrusive presence:** The "buddy" metaphor (a small blue dot by the cursor) is friendly but stays out of the way until summoned [9].

**Where Clicky falls short (The gap you can fill):**
1. **No persistent memory or skill progression:** Clicky doesn't remember what it taught you yesterday. It doesn't track your growth.
2. **No pattern detection:** It won't notice if you repeatedly struggle with the same type of task or prompt structure.
3. **Privacy concerns:** Constant screen capture makes it unsuitable for many corporate environments [10].

---

## 3. Model-Aware Coaching: The Missing Dimension

Prompt engineering is not one-size-fits-all. Different models have distinct strengths and respond to different prompting techniques. While developer tools like OpenRouter and Azure Model Router automatically route requests to the best model [11], no consumer tool teaches users *why* they should switch models or *how* to adapt their prompt for the model they are using.

Your Prompt Coach should evaluate prompts not just in a vacuum, but against the specific model the user is targeting:

| Model Target | Coaching Focus | Example Nudge |
|--------------|----------------|---------------|
| **GPT-5.4** | General purpose, conversational style, ecosystem integration | "Since you're using GPT, try treating it more like an expert collaborator. Let's add a conversational framing to this prompt." |
| **Claude Opus 4.6** | Coding, long-context analysis, instruction following | "Claude responds exceptionally well to XML tags. Let's wrap your constraints in `<constraints>` tags so it doesn't miss them." |
| **Gemini 3.1 Pro** | Reasoning, science, multimodal tasks | "You're asking for complex reasoning. Gemini excels here, but you need to explicitly ask it to 'show your work step by step'." |
| **DeepSeek / O1** | Mathematical problems, logical puzzles | "For this logic puzzle, this model needs strict boundaries. Let's list your assumptions first." |

If a user writes a highly analytical coding prompt while using a general-purpose model, the coach should intervene: *"This is a complex coding task. While GPT can handle it, Claude Opus currently benchmarks higher for this specific type of work (75.6% on SWE-Bench). Consider switching models."* [12]

---

## 4. Novel Interaction Patterns

To truly differentiate your product, you must move beyond the standard "chat" interface or the simple "rewrite" button. Based on emerging UX paradigms in AI (such as Emily Campbell's "Shape of AI" framework [13]), here are novel interaction patterns your tool should incorporate:

### 1. The "Point-and-Explain" Highlighter
Instead of just returning a rewritten block of text, the tool presents your original prompt with specific words or phrases highlighted. Hovering over a highlight reveals the coach's specific advice. This borrows from the "TalkPointer" concept of pointer-centric AI interaction [14].

### 2. Anticipatory Nudges (Predictive Anticipation)
Using the Predictive Anticipation design pattern [15], the coach doesn't wait for you to hit "Submit." If it detects you are writing a prompt for a complex coding task but haven't specified a format, a subtle, ambient indicator glows. Clicking it reveals: *"You're asking for a script. Do you want it in Python or JavaScript? Should it include comments?"*

### 3. Contextual Questioning (The "Follow-up" Pattern)
Rather than guessing what you mean, the coach pauses and asks one high-leverage clarifying question. For example, if you prompt: *"Write a blog post about AI,"* the coach interrupts: *"Who is the intended audience? Beginners or experts?"* This teaches the user that audience definition is a critical component of prompting.

### 4. Ambient Scoring
As you type, a small, unobtrusive gauge (like a temperature gauge) fills up. It measures the "strength" of your prompt in real time based on the core dimensions (Goal, Context, Format, etc.). This provides immediate, gamified feedback without requiring a click.

### 5. The Model Compass
A visual indicator that dynamically shifts as you type, pointing toward the AI model best suited for the task you are describing. If you start typing math equations, the compass swings toward a reasoning model like DeepSeek.

---

## 5. The Gap Your Project Fills

By combining the best elements of the tools above, your project can fill a massive void. No existing tool combines all of these capabilities:

1. **Real-time rewriting** that works inside your actual AI tools
2. **Educational feedback** explaining why the rewrite is better
3. **Model-aware coaching** that adapts advice based on the specific LLM you are using
4. **Novel interaction patterns** like ambient scoring and anticipatory nudges
5. **A persistent learning journal** that remembers your history across sessions
6. **Pattern detection** that identifies recurring mistakes and coaches you on them specifically
7. **Frictionless voice input and in-context presence** (inspired by Clicky's cursor-buddy model)

This is the product you should build. It is feasible, it fills a real gap, and it solves a problem that will only grow as more people use AI tools daily.

---

## 6. Proposed Architecture

The system has three main components that work together:

**The Browser Extension (The "Ambient Coach")** lives inside your AI tools (ChatGPT, Claude, Gemini). It detects when you are typing in a prompt field, offers a button or keyboard shortcut to activate the coach, captures your input (text or voice), sends it to the backend, and displays the results using novel interaction patterns (like the Point-and-Explain highlighter) right where you are working.

**The Backend API** receives the raw prompt and the target model. It processes it through an LLM with a carefully designed system prompt, and returns the optimized prompt, the educational explanation, model-specific advice, and scores across the evaluation dimensions. It also stores this data in the user's profile for long-term tracking.

**The Web Dashboard** is where users review their learning journal, see their progress over time, read past coaching notes, and identify areas for improvement. Think of it as the "stats page" that shows your growth.

---

## 7. The Prompt Engineering Framework to Teach

Your tool needs a clear, memorable framework to evaluate prompts against and teach to users. Based on the research, I recommend combining the best elements from the KERNEL framework [6] and the Wise Prompt Coach scoring system [5] into something like this:

| Element | Question the Tool Asks | What It Teaches |
|---------|----------------------|-----------------|
| **Goal** | What exactly do you want the AI to produce? | Specificity and clarity of intent |
| **Role** | Who should the AI "be" when answering? | Persona-setting for better tone and expertise |
| **Context** | What background does the AI need? | Providing relevant information |
| **Constraints** | What should the AI avoid or limit? | Setting boundaries and guardrails |
| **Format** | What should the output look like? | Specifying structure (list, table, essay, code) |
| **Examples** | Can you show what "good" looks like? | Few-shot prompting technique |

Each time the user submits a prompt, the tool evaluates which of these elements are present, which are missing, and scores accordingly. Over time, the learning journal reveals patterns like "You almost never specify a format" or "You've gotten much better at providing context."

---

## 8. Implementation Plan

### Phase 1: Core Engine & Model Awareness (Weeks 1-4)

Start with a standalone web application. This lets you iterate on the most important part (the LLM-powered coaching logic) without dealing with browser extension complexity yet.

**Week 1-2: Backend Foundation**
Build a simple API with user authentication and a database to store prompt history. Set up the LLM integration. Design the system prompt that instructs the LLM to analyze, rewrite, and explain, *including* the logic for model-specific advice.

**Week 3-4: Frontend Interface & Novel UX**
Build a clean interface with two panels. Implement the "Point-and-Explain" highlighter pattern here to test how users react to contextual feedback rather than just a rewritten block of text. Store every interaction in the database.

**Deliverable:** A working web app where users can paste prompts, select their target model, get tailored rewrites with highlighted explanations, and see their history.

### Phase 2: Browser Extension & Ambient UX (Weeks 5-8)

Now take the working engine and bring it into the user's actual workflow, drawing heavy inspiration from Clicky's frictionless UX and ambient intelligence patterns.

**Week 5-6: Extension Skeleton & Ambient Scoring**
Build a Chrome extension using Manifest V3. Implement content scripts that detect prompt input fields on ChatGPT, Claude, and Gemini. Build the "Ambient Scoring" gauge that fills up as the user types.

**Week 7-8: Integration and Voice**
Connect the extension to your backend API. Implement the "Anticipatory Nudges" pattern to offer suggestions before the user submits. Add voice input using the Web Speech API so users can speak their thoughts and have them transcribed and then optimized.

**Deliverable:** A Chrome extension that works inside popular AI tools, offering ambient scoring, anticipatory nudges, and one-click (or one-voice) prompt optimization.

### Phase 3: The Learning Engine (Weeks 9-12)

This is what makes your tool genuinely different from everything else on the market.

**Week 9-10: Pattern Detection**
Build the analytics layer that examines the user's prompt history and identifies recurring gaps. If someone has submitted 20 prompts and only 3 of them included a specified output format, the system should flag this as a pattern and begin proactively reminding them.

**Week 11-12: Dashboard and Coaching**
Build the Learning Journal dashboard showing progress over time (line charts of scores across dimensions, streak tracking, milestone celebrations). Implement proactive coaching in the extension: before the user submits, a gentle nudge appears if the system detects they are about to repeat a known weakness.

**Deliverable:** A complete system with persistent memory, pattern detection, and personalized coaching that improves over time.

---

## 9. Design Principles

Based on what worked (and failed) for the builders who came before you, here are the principles I recommend:

**Simplicity over features.** Teleprompt's creator learned that users hated a complex interface with toggles and sliders. The winning version had two modes and one button [1]. Your tool should feel invisible until needed.

**Teach, don't just fix.** The Wise Prompt Coach's philosophy is correct: the goal is to make the user better, not to make them dependent on the tool [5]. Always show the "why" alongside the "what." This is also why Clicky succeeded—it guides rather than just doing [8].

**Model empathy.** A prompt that is perfect for Claude might fail in Gemini. The tool must understand the nuances of the destination model and coach accordingly.

**Anticipate, don't interrupt.** Use ambient indicators (like a glowing dot or a filling gauge) to signal that help is available, rather than throwing pop-ups in the user's face.

**Celebrate growth.** Emio.io and PromptMe AI both show that people respond well to seeing their progress. A simple score that trends upward over weeks is deeply motivating.

---

## 10. Potential Names

A few directions to consider:

| Name | Vibe |
|------|------|
| Prompt Coach | Direct, clear, educational |
| PromptFlow | Smooth, workflow-oriented |
| ClearPrompt | About clarity and improvement |
| PromptLens | Seeing your prompts more clearly |
| Nudge | Gentle coaching, non-intrusive |

---

## 11. Next Steps

If you want to move forward with this, here is what I would suggest as immediate next steps:

1. **Decide on the starting scope.** Do you want to begin with the web app (Phase 1) or jump straight to the browser extension? The web app is faster to prototype and lets you validate the core coaching logic before investing in extension development.

2. **Choose your tech stack.** Based on what we have seen work in this space, I would recommend: React or Next.js for the frontend, a Node.js or Python backend, PostgreSQL or Supabase for data, and OpenAI's API for the LLM layer.

3. **Design the system prompt.** This is the heart of the product. The prompt that instructs the LLM how to analyze, rewrite, score, explain, and provide model-specific advice is what determines whether the coaching feels insightful or generic. I can help you draft this.

4. **Build a prototype.** Even a simple version that takes a prompt, rewrites it, and explains the changes would be enough to validate the concept and start getting feedback from others.

I am ready to help you build any of these pieces whenever you want to start.

---

## References

[1]: https://www.reddit.com/r/chrome_extensions/comments/1mew3ig/lessons_learned_what_building_a_promptengineering/ "[Lessons Learned] What building a prompt-engineering assistant taught me (8K users & 100 languages). Reddit."
[2]: https://promptperfect.jina.ai/ "PromptPerfect - AI Prompt Generator and Optimizer."
[3]: https://www.reddit.com/r/PromptEngineering/comments/1lbdr7b/i_made_a_daily_practice_tool_for_prompt/ "I made a daily practice tool for prompt engineering (like duolingo for AI). Reddit."
[4]: https://github.com/nav-v/buddy-ai "Buddy AI - A local-first, open-source AI chat app with a built-in coaching layer. GitHub."
[5]: https://medium.com/transferwise-design/from-playtime-to-practice-designing-ai-with-the-prompt-coach-71e6ac672ac2 "From playtime to practice: Designing AI with the Prompt Coach. Medium."
[6]: https://www.linkedin.com/posts/kunalverma19_a-tech-lead-has-devoted-1000-hours-on-prompt-activity-7390853966542188544-rv6B "KERNEL: 6 patterns for consistent LLM prompts. LinkedIn."
[7]: https://github.com/farzaa/clicky "Clicky - An open-source AI buddy that lives next to your cursor. GitHub."
[8]: https://www.xda-developers.com/someone-built-tiny-ai-that-lives-next-to-your-cursor-the-most-useful-thing-ive-tried-this-year/ "Someone built a tiny AI that lives next to your cursor, and it's the most useful thing I've tried in months. XDA Developers."
[9]: https://www.funblocks.net/aitools/reviews/clicky-2 "Clicky Review: The AI Co-pilot That Lives Where You Work. FunBlocks AI Reviews."
[10]: https://www.reddit.com/r/indiehackers/comments/1sqrsgv/i_saw_clicky_go_viral_on_twitter_so_i_built_the/ "I saw Clicky go viral on Twitter, so I built the web version. Reddit."
[11]: https://openrouter.ai/docs/guides/routing/routers/auto-router "Auto Router | Smart AI Model Selection. OpenRouter."
[12]: https://www.buildfastwithai.com/blogs/best-ai-model-per-task-2026 "Every AI Model Compared: Best One Per Task (2026). Build Fast with AI."
[13]: https://www.shapeof.ai/ "The Shape of AI | UX Patterns for Artificial Intelligence Design."
[14]: https://dl.acm.org/doi/full/10.1145/3772318.3790797 "An Interaction Suite for AI-Supported Pointer-Centric Think-Aloud. ACM Digital Library."
[15]: https://www.aiuxdesign.guide/patterns/predictive-anticipation "Predictive Anticipation — AI That Suggests Before You Ask. AI UX Design Guide."
