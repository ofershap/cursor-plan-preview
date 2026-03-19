# cursor-plan-preview

[![npm version](https://img.shields.io/npm/v/cursor-plan-preview.svg)](https://www.npmjs.com/package/cursor-plan-preview)
[![npm downloads](https://img.shields.io/npm/dm/cursor-plan-preview.svg)](https://www.npmjs.com/package/cursor-plan-preview)
[![CI](https://github.com/ofershap/cursor-plan-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/cursor-plan-preview/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Cursor generates a plan. Your team X-rays it before you build.

```bash
npx cursor-plan-preview --setup
```

> **CPR** — Cursor Plan Preview. Hooks into Cursor's plan mode, opens every plan in a visual browser UI, lets your team annotate inline, and shares via a single URL. No server required for most plans.

![Demo](assets/demo.gif)

## Install

```bash
npx cursor-plan-preview --setup
```

That's it. Restart Cursor. The next time the agent saves a plan, it opens automatically in your browser.

## How it works

1. You run Cursor in Plan Mode (Shift+Tab)
2. The agent generates a plan and saves it to `~/.cursor/plans/`
3. CPR's `afterFileEdit` hook fires automatically
4. Your plan opens in a visual preview in the browser
5. Annotate: select any text → choose Delete / Replace / Insert / Comment
6. Click **Share Plan** → copy the URL → send to your team
7. Teammates open the URL, add their annotations, share back
8. Click **Export Feedback** → a `-feedback.md` file is written to your plans folder
9. The agent reads the feedback on the next prompt before building

## Annotation types

| Type        | What it does                         |
| ----------- | ------------------------------------ |
| ✂ Delete    | Mark text for removal                |
| ↔ Replace   | Suggest replacement text             |
| 💬 Comment  | Add a note to specific text          |
| + Insert    | Add new text at a point              |
| Global Note | Add a note not tied to specific text |

## Sharing

**Small plans** (< 8KB compressed): the entire plan + annotations are encoded in the URL hash. Zero server, zero data leaves the browser.

**Large plans**: stored temporarily via the CPR paste service with AES-256-GCM encryption. Auto-deleted after 7 days. The decryption key lives only in the URL.

## Manual usage

```bash
# Open any plan file
cursor-plan-preview serve ~/.cursor/plans/my-plan_abc123.plan.md

# List recent plans
cursor-plan-preview list

# Re-run setup
cursor-plan-preview --setup
```

## Feedback loop with the agent

After teammates annotate and share back:

1. Open the annotated URL
2. Click **Export Feedback**
3. A `*-feedback.md` file is written to `~/.cursor/plans/`
4. The installed Cursor rule tells the agent to check for feedback before building

The agent will summarize the team's feedback and ask if you want to incorporate it.

## License

MIT
