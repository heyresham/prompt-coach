# Prompt Coach: Visual Identity & Tone of Voice

*A design framework inspired by the sports coaching metaphor and the impeccable UI of Turf by Marco Cornacchia.*

---

## 1. The Core Metaphor: The Sports Coach

When people think of a "coach," they think of someone who is tough but fair, encouraging but demanding, and completely invested in their success. Translating this into a digital product requires walking a fine line between playful and professional.

The Prompt Coach is not a dry, academic tutor. It is a sideline coach. It has a whistle. It wears a cap. It wants you to win.

This metaphor solves a massive UX problem: **Nobody likes being corrected by a computer.** But people *love* being coached by someone (or something) that has a distinct personality and is clearly on their team.

---

## 2. Inspiration: The Turf Design Language

Marco Cornacchia's design for Turf is a masterclass in taking a complex, data-heavy experience (prediction markets) and making it feel tactile, fun, and effortless. We will borrow several key principles from Turf's playbook.

### The "Ticket Stub" Card UI
Turf presents games as physical ticket stubs with perforated edges and subtle gradients. 
**Prompt Coach Translation:** Your prompts are presented as "Plays" drawn up on a clipboard. When the coach analyzes your prompt, the UI card should resemble a tactile clipboard or a playbook card, complete with a subtle texture and a perforated section separating your original text from the coach's feedback.

### Deep, Tactile Colors
Turf uses a deep, rich "field green" (#1B6B3E) combined with stark dark modes and high-contrast typography.
**Prompt Coach Translation:** Adopt a "Locker Room" color palette. 
- **Primary:** A deep, rich Varsity Blue or Turf Green.
- **Backgrounds:** Dark mode by default (charcoal, not pure black) to make the bright coaching elements pop.
- **Accents:** Whistle Silver, Penalty Flag Yellow (for missing constraints), and Playbook White.

### Playful but Precise Typography
Turf's logo is bubbly and hand-drawn, but its data presentation uses razor-sharp, condensed sans-serif fonts.
**Prompt Coach Translation:** The Coach's "voice" (the feedback text) should use a friendly, rounded typeface, while your actual prompt text and the AI's output should remain in a clean, monospaced or system font to denote "the work."

---

## 3. Tone of Voice & Copywriting

The copywriting is where the sports metaphor truly comes alive. The Coach should use sports idioms naturally, without being cheesy or overbearing.

### The "Whistle" Interruptions (Anticipatory Nudges)
Instead of standard error messages, the Coach "blows the whistle" when it spots a mistake mid-typing.
* **Standard App:** "Please specify an output format."
* **Prompt Coach:** *"Hold up! *blows whistle* You're sending the model onto the field without a game plan. What format do you want this in? A list? A table?"*

### Celebrating Wins (Ambient Scoring)
When the user writes a strong prompt that hits all the dimensions (Goal, Role, Context, Format).
* **Standard App:** "Prompt score: 95/100."
* **Prompt Coach:** *"Textbook execution. Perfect context, clear constraints. You're ready for the playoffs with this one. Send it."*

### Model-Specific Coaching (The Scouting Report)
When advising the user to switch from GPT to Claude for a coding task.
* **Standard App:** "Claude is recommended for this task."
* **Prompt Coach:** *"Scouting report: GPT is a great all-rounder, but for heavy-duty coding like this, Claude Opus has the better stats. Let's sub Claude in for this play."*

### The Post-Game Review (Learning Journal)
Reviewing the user's progress over the last week.
* **Standard App:** "You have improved your context scores by 15%."
* **Prompt Coach:** *"Looking at the tape from last week, your context-setting has improved massively. But you're still leaving points on the board by forgetting to assign the AI a Role. Let's drill that today."*

---

## 4. Visual Execution & UI Patterns

Here is how the sports metaphor and Turf-inspired design manifest in the actual interface.

### The Mascot / Avatar
Instead of a generic sparkle icon (✨) used by every other AI tool, Prompt Coach uses a minimalist, abstract whistle or a stylized coach's cap. It sits quietly next to your cursor or in the corner of the text box. When it has advice, it doesn't just pop up; it subtly "bounces" or glows, like a coach pacing the sideline.

### The "Playbook" Split Screen
When you ask for a rewrite, the tool doesn't just replace your text. It opens the "Playbook."
- **Left Side:** Your original prompt, marked up with X's and O's (like a football play diagram).
- **Right Side:** The Coach's optimized prompt.
- **Interaction:** Hovering over the X's and O's draws a dynamic, animated line (like a telestrator used by sports commentators) to the corresponding improvement on the right side.

### The Stats Card (Progress Dashboard)
Borrowing directly from Turf's clean data presentation, the user's learning journal looks like a player's baseball card or stats sheet.
- **"Batting Average":** How often your first-draft prompts score above 80%.
- **"Streaks":** Days in a row practicing good prompt hygiene.
- **"Badges":** Earned for mastering specific skills (e.g., "The Architect" badge for mastering output formatting).

### Motion and Animation
Turf feels alive because of its micro-interactions. Prompt Coach should feel similarly kinetic.
- When a prompt is optimized, don't just flash the new text. Use a quick, snappy animation that looks like a play being drawn up on a chalkboard.
- When the user hits a perfect score on the ambient gauge, trigger a subtle haptic feedback (if on mobile) or a satisfying "swish" animation.

---

## 5. Summary of the Vibe

**It is:** Tactile, encouraging, slightly demanding, data-driven, and highly interactive.
**It is not:** Academic, sterile, generic, or passive.

By combining the pedagogical rigor of a true prompt engineering curriculum with the joyful, tactile UI of an app like Turf and the persona of a sports coach, this tool stops being a "utility" and becomes a daily companion that users actually look forward to interacting with.
