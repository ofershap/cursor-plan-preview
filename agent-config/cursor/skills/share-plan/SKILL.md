---
name: share-plan
description: Share the current Cursor plan with your team for review. Opens the latest plan in a browser UI where teammates can annotate and give feedback. Use after creating or finalizing a plan.
---

# Share Plan (cursor-plan-preview)

Open the latest Cursor plan in a visual review UI for team annotation and sharing.

## Steps

1. Run the share-plan command in the terminal:

```bash
npx cursor-plan-preview share-plan
```

This auto-detects the most recent `.plan.md` file from `~/.cursor/plans/` and opens it in the browser.

2. To share a specific plan file instead:

```bash
npx cursor-plan-preview share-plan <path-to-file>
```

3. Tell the user the preview is running and they can:
   - Annotate text inline (select text to delete, replace, comment, or insert)
   - Click **Share Plan** to copy a shareable URL
   - Send the URL to teammates for review
   - Export feedback back to `~/.cursor/plans/` for the agent to read

## If cursor-plan-preview is not installed

Run setup first:

```bash
npx cursor-plan-preview --setup
```

This installs a Cursor rule that reminds the agent to suggest sharing after every plan.
