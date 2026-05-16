# Clicky Research Notes

## Overview
- Created by Farza Majeed (founder of buildspace)
- Open-source macOS app (MIT license)
- GitHub: github.com/farzaa/clicky - 5.2k stars, 957 forks
- Went viral on X: 15,000 likes, ~3 million views on original demo
- Product Hunt: #6 Day Rank, 137 upvotes
- Free, open-source, passion project

## What It Does
- AI buddy that lives next to your cursor on macOS
- Sees your screen via ScreenCaptureKit
- Listens to your voice (push-to-talk: Control+Option)
- Responds with spoken answers via text-to-speech
- Can physically POINT at buttons/menu items on screen using [POINT:x,y:label:screenN] tags
- Recently added "Clicky Agent" mode to spawn background agents

## Tech Stack
- Swift (95.2%) - native macOS app
- Claude (Anthropic) for AI intelligence
- AssemblyAI for voice transcription
- ElevenLabs for text-to-speech
- Cloudflare Worker as API proxy (holds API keys)
- ScreenCaptureKit for screen capture
- Menu bar app with NSPanel windows

## Architecture
- Menu bar app (no dock icon) with two NSPanel windows
- One for control panel dropdown, one for full-screen transparent cursor overlay
- Push-to-talk streams audio over websocket to AssemblyAI
- Sends transcript + screenshot to Claude via streaming SSE
- Plays response through ElevenLabs TTS
- Claude embeds [POINT:x,y:label:screenN] tags to make cursor fly to UI elements

## Why It Went Viral / What Works Well
1. **Eliminates context-switching**: No need to leave your app to look up tutorials
2. **Learning by doing**: Teaches you INSIDE the software you're using
3. **Voice-first interaction**: Hands stay on mouse/keyboard, just speak
4. **Dead simple UX**: Hold two keys, speak, let go. That's it.
5. **Visual pointing**: Actually shows you WHERE to click, like a teacher guiding your hand
6. **Character/personality**: The "little blue guy" creates emotional connection
7. **Non-intrusive**: Lives next to cursor, stays out of way until needed
8. **Open source**: Builds trust and community
9. **Free**: No barrier to entry

## Media Coverage
- XDA Developers: "the most useful thing I've tried in months"
- Lifehacker: "a macOS Companion That Can Help You With Just About Anything"
- The Rundown AI: Featured tool
- Product Hunt: #6 Day Rank
- Multiple Instagram reels with hundreds of thousands of views
- LinkedIn viral posts
- Texas AI Institute of Technology featured it

## Key Quotes from Coverage
- XDA: "It's the difference between learning ABOUT the software and learning INSIDE the software"
- XDA: "as close to tapping a friend on the shoulder and asking a question as an AI tool has ever gotten"
- XDA: "like how a teacher in elementary school would hold your hand over the pencil to guide you through writing your first letters"
- Lifehacker: "I've already found it to be genuinely useful, especially when it comes to finding out how to learn to do something inside an app, without having to look up the answer online"

## Potential Drawbacks / Areas for Improvement (from reviews)
1. **Privacy concerns**: Screen capture in corporate/sensitive environments
2. **macOS only** (Windows coming soon, community versions exist)
3. **No persistent memory**: Doesn't track what you've learned over time
4. **No skill progression**: Doesn't know if you've asked the same thing before
5. **Limited to general knowledge**: Could benefit from "skill packs" for niche software
6. **No learning journal**: Doesn't help you see your growth
7. **Hallucination risk**: If it points at wrong elements, could cause confusion
8. **Dependency concern**: Could make users reliant rather than building skills

## Community Reactions (Reddit)
- Web version already being built by others within days of going viral
- Key insight from commenter: "Telling a user what to click is read-only and low trust cost. Clicking for them runs in their session and can submit payments or delete things. Different failure mode, different consent flow."
- Another: "Agent mode is the more compelling product... The show them how version is just a fancier tooltip"
- Counterpoint: Teaching approach builds understanding, agent mode creates dependency

## Relevance to Prompt Coach Project
- Proves that "teaching in context" resonates massively with users
- Voice-first interaction is a winning UX pattern
- The "buddy" metaphor and character create emotional engagement
- Non-intrusive overlay that activates on demand is the right approach
- Open source builds trust and community quickly
- Simple activation (keyboard shortcut) is better than complex UI
- The pointing/showing mechanism is powerful for education
- Missing: long-term memory, progress tracking, pattern detection
