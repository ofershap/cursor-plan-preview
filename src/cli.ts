import { Command } from "commander";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { startServer } from "./server.js";
import { openBrowser } from "./utils.js";
import { isPlanFile } from "./parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
) as { version: string };

const program = new Command();

program
  .name("cursor-plan-preview")
  .description("Visual plan preview and team sharing for Cursor's plan mode")
  .version(pkg.version);

program
  .option("--setup", "Install the Cursor hook and rules")
  .action(async (options: { setup?: boolean }) => {
    if (options.setup) {
      const setupPath = new URL("../agent-config/setup.mjs", import.meta.url)
        .href;
      const { runSetup } = await import(setupPath);
      await (runSetup as () => Promise<void>)();
      return;
    }
    program.help();
  });

program
  .command("serve <file>")
  .description("Open a plan file in the preview UI")
  .option("-p, --port <port>", "Port to use", "19450")
  .action(async (file: string, opts: { port: string }) => {
    const filePath = existsSync(file) ? file : join(process.cwd(), file);
    if (!existsSync(filePath)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }

    const port = parseInt(opts.port, 10);
    const { url } = await startServer({ planFile: filePath, port });
    console.log(`\nCPR Preview running at ${url}\n`);
    openBrowser(url);
  });

program
  .command("hook")
  .description("Hook handler for Cursor afterFileEdit (internal)")
  .action(async () => {
    let raw = "";
    process.stdin.setEncoding("utf-8");

    for await (const chunk of process.stdin) {
      raw += chunk;
    }

    let input: { file_path?: string };
    try {
      input = JSON.parse(raw) as { file_path?: string };
    } catch {
      process.stdout.write("{}\n");
      process.exit(0);
    }

    if (!input.file_path || !isPlanFile(input.file_path)) {
      process.stdout.write("{}\n");
      process.exit(0);
    }

    process.stdout.write("{}\n");

    try {
      const { url } = await startServer({ planFile: input.file_path });
      openBrowser(`${url}?file=${encodeURIComponent(input.file_path)}`);
    } catch {
      process.exit(0);
    }
  });

function findPlansDir(): string {
  return join(homedir(), ".cursor", "plans");
}

function getLatestPlan(plansDir: string): string | null {
  if (!existsSync(plansDir)) return null;

  const plans = readdirSync(plansDir)
    .filter((f) => f.endsWith(".plan.md"))
    .map((f) => ({
      name: f,
      path: join(plansDir, f),
      mtime: statSync(join(plansDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return plans.length > 0 ? plans[0].path : null;
}

program
  .command("share-plan [file]")
  .description(
    "Open the latest plan (or a specific file) in the preview UI for sharing",
  )
  .option("-p, --port <port>", "Port to use", "19450")
  .action(async (file: string | undefined, opts: { port: string }) => {
    let filePath: string;

    if (file) {
      filePath = existsSync(file) ? file : join(process.cwd(), file);
      if (!existsSync(filePath)) {
        console.error(`File not found: ${file}`);
        process.exit(1);
      }
    } else {
      const plansDir = findPlansDir();
      const latest = getLatestPlan(plansDir);
      if (!latest) {
        console.error("No plan files found in ~/.cursor/plans/");
        console.error("Create a plan in Cursor first, then run this command.");
        process.exit(1);
      }
      filePath = latest;
      console.log(`\nFound latest plan: ${latest}\n`);
    }

    const port = parseInt(opts.port, 10);
    const { url } = await startServer({ planFile: filePath, port });
    console.log(`CPR Preview running at ${url}\n`);
    openBrowser(url);
  });

program
  .command("list")
  .description("List recent plans from ~/.cursor/plans/")
  .action(async () => {
    const plansDir = findPlansDir();

    if (!existsSync(plansDir)) {
      console.log("No plans directory found at ~/.cursor/plans/");
      return;
    }

    const files = readdirSync(plansDir)
      .filter((f) => f.endsWith(".plan.md"))
      .sort()
      .reverse()
      .slice(0, 20);

    if (files.length === 0) {
      console.log("No plan files found.");
      return;
    }

    console.log("\nRecent plans:\n");
    files.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });
    console.log("\nRun: cursor-plan-preview share-plan\n");
  });

program.parse();
