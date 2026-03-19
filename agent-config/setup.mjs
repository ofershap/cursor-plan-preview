#!/usr/bin/env node

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`  Created ${dir}`);
  }
}

function mergeHooksJson(hooksPath, newEntry) {
  let existing = { version: 1, hooks: {} };
  if (existsSync(hooksPath)) {
    try {
      existing = JSON.parse(readFileSync(hooksPath, "utf-8"));
    } catch {
      console.warn(`  Warning: could not parse ${hooksPath}, creating fresh`);
    }
  }

  if (!existing.hooks) existing.hooks = {};
  if (!existing.hooks.afterFileEdit) existing.hooks.afterFileEdit = [];

  const alreadyInstalled = existing.hooks.afterFileEdit.some(
    (h) =>
      typeof h.command === "string" &&
      h.command.includes("cursor-plan-preview"),
  );

  if (alreadyInstalled) {
    console.log("  Hook already installed in hooks.json");
    return;
  }

  existing.hooks.afterFileEdit.push(newEntry);
  writeFileSync(hooksPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  console.log(`  Updated ${hooksPath}`);
}

export async function runSetup() {
  console.log("\nCPR — Cursor Plan Preview setup\n");

  const cursorDir = join(home, ".cursor");
  ensureDir(cursorDir);

  // 1. Merge hook into ~/.cursor/hooks.json
  console.log("Installing Cursor hook...");
  const hooksPath = join(cursorDir, "hooks.json");
  mergeHooksJson(hooksPath, {
    command: "cursor-plan-preview hook",
    matcher: "Write",
  });

  // 2. Install Cursor rule
  console.log("\nInstalling Cursor rule...");
  const rulesDir = join(cursorDir, "rules");
  ensureDir(rulesDir);
  const ruleSrc = join(__dirname, "cursor", "rules", "plan-preview.mdc");
  const ruleDest = join(rulesDir, "plan-preview.mdc");
  copyFileSync(ruleSrc, ruleDest);
  console.log(`  Installed rule -> ${ruleDest}`);

  console.log("\n✓ CPR installed successfully!");
  console.log("\nNext time Cursor saves a plan, it will automatically open");
  console.log("in your browser for preview and sharing.");
  console.log("\nRestart Cursor for the hook to take effect.\n");
}

// Run directly if called as a script
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSetup().catch((err) => {
    console.error("Setup failed:", err);
    process.exit(1);
  });
}
