#!/usr/bin/env node

import { mkdirSync, existsSync, copyFileSync } from "fs";
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

export async function runSetup() {
  console.log("\nCPR — Cursor Plan Preview setup\n");

  const cursorDir = join(home, ".cursor");
  ensureDir(cursorDir);

  console.log("Installing Cursor rule...");
  const rulesDir = join(cursorDir, "rules");
  ensureDir(rulesDir);
  const ruleSrc = join(__dirname, "cursor", "rules", "plan-preview.mdc");
  const ruleDest = join(rulesDir, "plan-preview.mdc");
  copyFileSync(ruleSrc, ruleDest);
  console.log(`  Installed rule -> ${ruleDest}`);

  console.log("Installing /plan-preview-and-share skill...");
  const skillDir = join(cursorDir, "skills", "plan-preview-and-share");
  ensureDir(skillDir);
  const skillSrc = join(
    __dirname,
    "cursor",
    "skills",
    "plan-preview-and-share",
    "SKILL.md",
  );
  const skillDest = join(skillDir, "SKILL.md");
  copyFileSync(skillSrc, skillDest);
  console.log(`  Installed skill -> ${skillDest}`);

  console.log("\n\u2713 CPR installed successfully!\n");
  console.log("You can now use /plan-preview-and-share in Cursor chat,");
  console.log("or run directly in terminal:");
  console.log("  cursor-plan-preview plan-preview-and-share\n");
  console.log("The agent will also remind you when a plan is ready.\n");
}

// Run directly if called as a script
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSetup().catch((err) => {
    console.error("Setup failed:", err);
    process.exit(1);
  });
}
