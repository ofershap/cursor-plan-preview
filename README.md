# cursor-plan-preview

[![npm version](https://img.shields.io/npm/v/cursor-plan-preview.svg)](https://www.npmjs.com/package/cursor-plan-preview)
[![npm downloads](https://img.shields.io/npm/dm/cursor-plan-preview.svg)](https://www.npmjs.com/package/cursor-plan-preview)
[![CI](https://github.com/ofershap/cursor-plan-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/cursor-plan-preview/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Your agent just wrote a plan. Your team has no idea what it's about to build.

```bash
npx cursor-plan-preview --setup
```

> **CPR — Cursor Plan Preview.** Hooks into Cursor's plan mode, opens every plan in a visual browser UI the moment it's saved, lets your team annotate inline, and shares via a single URL. No server required for most plans.

![Demo](assets/demo.gif)

---

## The Problem

Cursor's plan mode is great for you. It's invisible to your team.

The agent generates a detailed implementation plan — files to change, architecture decisions, task breakdown. You approve it and it starts building. Your teammates find out when the PR lands, or when something breaks.

CPR puts the plan in front of your team before a single line of code is written.

---

## Quick Start

```bash
npx cursor-plan-preview --setup
```

Restart Cursor. The next time the agent saves a plan, it opens automatically in your browser.

---

## How It Works

```
Agent generates plan → saved to ~/.cursor/plans/
        ↓
CPR afterFileEdit hook fires
        ↓
Plan opens in browser preview UI
        ↓
You annotate + click Share Plan → URL copied
        ↓
Teammate opens URL → adds annotations → shares back
        ↓
You click Export Feedback → -feedback.md written
        ↓
Agent reads feedback on next prompt → incorporates before building
```

---

## Annotation Types

Select any text in the plan to annotate it:

| Type        | Icon | What it does                         |
| ----------- | ---- | ------------------------------------ |
| Delete      | ✂    | Mark text for removal                |
| Replace     | ↔    | Suggest replacement text             |
| Comment     | 💬   | Add a note to specific text          |
| Insert      | +    | Add new text at a point              |
| Global Note | —    | Add a note not tied to specific text |

Annotations appear highlighted in the plan with color-coded borders. The sidebar ("Vital Signs") lists all annotations with a count badge.

---

## Sharing

**Small plans** (< 8KB compressed): the entire plan + annotations are encoded in the URL hash using deflate compression. Zero server, zero data leaves the browser. Teammate opens the URL, everything decodes client-side.

**Large plans**: stored temporarily via the CPR paste service with AES-256-GCM encryption. Auto-deleted after 7 days. The decryption key lives only in the URL — the server stores only ciphertext it cannot read.

---

## Manual Usage

```bash
# Open any plan file directly
cursor-plan-preview serve ~/.cursor/plans/my-plan_abc123.plan.md

# List recent plans
cursor-plan-preview list

# Re-run setup
cursor-plan-preview --setup
```

---

## Feedback Loop

After teammates annotate and share back:

1. Open the annotated URL in your browser
2. Click **Export Feedback**
3. A `*-feedback.md` file is written to `~/.cursor/plans/`
4. The installed Cursor rule tells the agent to check for feedback before building
5. The agent summarizes the team's annotations and asks if you want to incorporate them

---

## What Gets Installed

`npx cursor-plan-preview --setup` adds three things:

| File                               | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `~/.cursor/hooks.json`             | Adds `afterFileEdit` hook entry (merges with existing hooks) |
| `~/.cursor/rules/plan-preview.mdc` | Tells the agent to check for feedback files before building  |

Existing hooks (like Superset or other tools) are preserved — the setup merges, never overwrites.

---

## Architecture

```
cursor-plan-preview/
├── src/
│   ├── cli.ts          CLI entry (serve, list, --setup)
│   ├── hook.ts         afterFileEdit hook handler
│   ├── server.ts       Local HTTP server (plan API + feedback export)
│   └── parser.ts       Plan file parser (YAML frontmatter + markdown)
├── ui/
│   ├── src/
│   │   ├── App.tsx     Main review app
│   │   ├── app.css     CPR medical theme
│   │   └── utils/
│   │       └── sharing.ts  Deflate + base64 URL encoding
│   └── index.html
├── agent-config/
│   ├── setup.mjs       --setup handler
│   └── cursor/
│       └── rules/plan-preview.mdc
└── api/
    └── paste.ts        Vercel serverless paste API
```

**Stack:** TypeScript (strict) · React 19 · Vite · Node HTTP · Vitest

---

## Contributing

Bug reports, feature requests, and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

---

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

---

## License

[MIT](LICENSE) © [Ofer Shapira](https://github.com/ofershap)
