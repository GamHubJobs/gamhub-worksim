# WorkSim AI: plan

The milestone that brings AI into the work computer: a WorkSim AI app, AI help
inside the existing apps, colleagues who respond to the player's use of AI, and
AI skills tracked like the other professional skills.

## Principles

- **The game works fully without AI.** No account, key, subscription or internet
  connection is needed. Real AI is optional and off until the player turns it on.
- **Honest labels.** Every answer says what produced it: WorkSim's built-in guide
  (deterministic, not an AI model), a local model, or a cloud model, with its name.
  A built-in answer is never presented as AI.
- **Minimal data.** Each request carries only what that request needs (the task's
  brief, the selected email, the selected cells), never the whole save. The player
  can see exactly what will be sent before anything leaves the device.
- **Teaching, not doing.** The aim is to make the player a better professional who
  uses AI well: prompting, giving context, checking answers, protecting data.

## Architecture

```
Apps (Mail, Sheets, Docs, Slides, Tasks, Code, Help Desk, WorkSim AI)
  │  describe their context (only what is relevant)
  ▼
src/ai/context.ts ── trims, redacts the player's name, caps the size
  ▼
src/ai/service.ts ── consent, daily limit, timeout, one request at a time,
  │                   falls back to the built-in guide (and says why)
  ├─ Built-in guide (src/ai/builtin/)       offline, free, deterministic
  ├─ Local model (OpenAI-compatible API)    e.g. Ollama on this computer, free
  └─ AI bridge (scripts/ai-bridge.mjs)      a small server the player runs on
        │                                    their own computer; it holds the
        │                                    API keys, applies a daily cap
        ├─ Anthropic
        ├─ OpenAI
        └─ Google
```

- **No API keys in the app.** Keys live only in the bridge's environment (a
  `.env.local` file that git ignores). The browser never sees them.
- **Settings** (engine, models, consent, assistance mode, daily limit) are kept on
  this device, not in saves or backups.
- **Assistance modes**: Learning (explains, hints, small steps, does not complete
  graded work), Professional (practical guidance and review), Expert (advanced
  reasoning and trade-offs). The mode changes the depth of explanation, not how much
  work is done for the player.

## Stages

1. Architecture audit (done; see the development log).
2. AI infrastructure: types, context, settings, usage, built-in guide, local and
   bridge engines, the bridge itself, tests.
3. The WorkSim AI desktop app: conversation, context panel, modes, engine status,
   desktop/taskbar/Start/search integration.
4. AI inside the apps: Mail, Sheets, Docs, Slides, Tasks, Code, Help Desk. Changes
   proposed by AI are previewed and applied only when the player accepts them.
5. Workplace AI: colleagues' expectations and feedback about AI use, through Mail
   and conversations (deterministic).
6. AI competency: practical AI-literacy tasks, tracking of prompt quality,
   verification and responsible use, and its place in career readiness.
7. Quality assurance: regression, saves, engines, offline, performance, browsers,
   production build.

## After the plan: WorkSim AI at home

WorkSim Life stage L7 brings the same assistant to the laptop at home, for budgeting,
planning the evening or morning, and what to learn next. Same engines, consent,
limits and labels; three new context kinds (`budget`, `plan`, `learning`) built from
the save, answered by the built-in guide unless a model is on. See
[LIFE_PLAN.md](LIFE_PLAN.md).

## Costs

| Engine           | Cost                                                            |
| ---------------- | --------------------------------------------------------------- |
| Built-in guide   | Free (the default)                                              |
| Local model      | Free (runs on the player's computer)                            |
| Cloud via bridge | Paid by the player to their provider, per request; capped daily |

WorkSim never switches to a paid engine by itself.

## Risks and answers

| Risk                                | Answer                                                    |
| ----------------------------------- | --------------------------------------------------------- |
| Breaking "nothing is sent anywhere" | Off by default; explicit consent; preview of what is sent |
| AI doing graded work for the player | Learning mode guides; AI help is visible to the grading   |
| Invented answers (hallucinations)   | Verification is taught and tracked                        |
| Save compatibility                  | Only additive fields with defaults                        |
| Size and speed                      | The AI app and engines load only when used                |
| Flaky tests                         | Tests never call real AI; engines are simulated           |
