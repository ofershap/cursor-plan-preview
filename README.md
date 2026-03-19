<p align="center">
  <img src="assets/logo.svg" alt="cursor-plan-preview" width="120" height="120" />
</p>

<h1 align="center">cursor-plan-preview</h1>

<p align="center">
  <strong>Your agent writes a plan. But your team has no idea what it's about to build.</strong>
</p>

<p align="center">
  The bottleneck in agentic development isn't writing code anymore. It's getting the plan right.<br>
  A bad plan burns tokens, wastes hours, and ships the wrong thing. Team review before execution isn't optional.
</p>

<p align="center">
  Hooks into Cursor's plan mode, opens every plan in a browser UI,<br>
  lets your team annotate inline, shares via a single URL. No server needed.
</p>

<p align="center">
  <a href="https://ofershap.github.io/cursor-plan-preview/"><img src="https://img.shields.io/badge/Live_Preview-22c55e?style=for-the-badge&logoColor=white" alt="Live Preview" /></a>
  &nbsp;
  <a href="#quick-start"><img src="https://img.shields.io/badge/Install-3b82f6?style=for-the-badge&logoColor=white" alt="Install" /></a>
  &nbsp;
  <a href="#how-it-works"><img src="https://img.shields.io/badge/How_It_Works-8b5cf6?style=for-the-badge&logoColor=white" alt="How It Works" /></a>
</p>

<p align="center">
  <a href="https://github.com/ofershap/cursor-plan-preview/stargazers"><img src="https://img.shields.io/github/stars/ofershap/cursor-plan-preview?style=social" alt="GitHub stars" /></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/cursor-plan-preview"><img src="https://img.shields.io/npm/v/cursor-plan-preview.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/cursor-plan-preview"><img src="https://img.shields.io/npm/dm/cursor-plan-preview.svg" alt="npm downloads" /></a>
  <a href="https://github.com/ofershap/cursor-plan-preview/actions/workflows/ci.yml"><img src="https://github.com/ofershap/cursor-plan-preview/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
</p>

---

## Your Agent Plans in the Dark

Cursor's plan mode generates a detailed implementation plan - files to change, architecture decisions, task breakdown. You approve it, the agent starts building. Your teammates find out when the PR lands. Or when something breaks.

There's no review step. No "hey, before you build this, can you check if this makes sense?" moment.

CPR puts the plan in front of your team before a single line of code is written.

- The agent saves a plan, CPR opens it in a browser UI automatically
- You highlight text, annotate inline (delete, replace, comment, insert)
- Click "Share Plan" and paste the URL to your team
- They add their own annotations and share back
- You export the feedback, the agent reads it on the next prompt

No accounts. No backend for most plans. The URL contains everything.

## Quick Start

```bash
npx cursor-plan-preview --setup
```

Restart Cursor. Next time the agent saves a plan, it opens in your browser.

To preview a specific plan:

```bash
npx cursor-plan-preview serve ~/.cursor/plans/my-plan_abc123.plan.md
```

## How It Works

```
Agent generates plan  ->  saved to ~/.cursor/plans/
                              |
                    CPR hook fires on save
                              |
                    Plan opens in browser UI
                              |
              You annotate + click Share Plan  ->  URL copied
                              |
              Teammate opens URL  ->  adds annotations
                              |
              You click Export Feedback  ->  -feedback.md written
                              |
              Agent reads feedback  ->  adjusts plan before building
```

## What You Can Annotate

Select any text in the plan to pick an annotation type:

|                             |                                      |
| --------------------------- | ------------------------------------ |
| **Delete** (scissors)       | Mark text for removal                |
| **Replace** (arrows)        | Suggest replacement text             |
| **Comment** (speech bubble) | Add a note to specific text          |
| **Insert** (plus)           | Add new text at a point              |
| **Global Note**             | Add a note not tied to specific text |

Annotations show as color-coded highlights in the plan body. The sidebar lists all annotations with a count badge.

## Sharing

Plans under ~8KB compressed get encoded entirely in the URL hash. Nothing leaves the browser. Your teammate opens the link and everything decodes client-side.

For larger plans, use `cursor-plan-preview serve` and share your screen, or copy the plan body into a Slack thread.

## The Feedback Loop

After teammates annotate and share back:

1. Open the annotated URL
2. Click **Export Feedback**
3. A `*-feedback.md` file appears in `~/.cursor/plans/`
4. The installed Cursor rule tells the agent to check for feedback before building
5. Agent summarizes annotations and asks if you want to incorporate them

## What Gets Installed

`npx cursor-plan-preview --setup` adds two things:

| File                               | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `~/.cursor/hooks.json`             | Adds `afterFileEdit` hook entry (merges with existing hooks) |
| `~/.cursor/rules/plan-preview.mdc` | Tells the agent to check for feedback before building        |

Existing hooks (Superset, other tools) are preserved. The setup merges, never overwrites.

## Manual Commands

```bash
cursor-plan-preview serve <file>    # open any .plan.md in the preview UI
cursor-plan-preview list            # show recent plans from ~/.cursor/plans/
cursor-plan-preview --setup         # re-run setup
```

## Architecture

```
cursor-plan-preview/
├── src/
│   ├── cli.ts          CLI entry + hook handler
│   ├── server.ts       Local HTTP server (plan API + static files + feedback export)
│   ├── parser.ts       Plan file parser (YAML frontmatter + markdown)
│   └── utils.ts        Shared utilities
├── ui/
│   └── src/
│       ├── App.tsx     Review UI (React 19 + marked)
│       └── utils/
│           └── sharing.ts  Deflate + base64 URL encoding
└── agent-config/
    ├── setup.mjs       --setup handler
    └── cursor/rules/   Cursor rule for feedback loop
```

## Tech Stack

|              |                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Language** | ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)                                |
| **UI**       | ![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)                                                   |
| **Markdown** | ![marked](https://img.shields.io/badge/marked-GFM-yellow)                                                                           |
| **Bundler**  | ![tsup](https://img.shields.io/badge/tsup-ESM-yellow) + ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) |
| **Testing**  | ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)                                                   |
| **CI**       | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white)                            |

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

---

If this helped you, [star the repo](https://github.com/ofershap/cursor-plan-preview), [open an issue](https://github.com/ofershap/cursor-plan-preview/issues) if something breaks.

## License

[MIT](LICENSE) &copy; [Ofer Shapira](https://github.com/ofershap)
