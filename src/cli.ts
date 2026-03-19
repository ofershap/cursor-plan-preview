import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { startServer } from "./server.js";
import { exec } from "child_process";

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
  .command("list")
  .description("List recent plans from ~/.cursor/plans/")
  .action(async () => {
    const { homedir } = await import("os");
    const { readdirSync } = await import("fs");
    const plansDir = join(homedir(), ".cursor", "plans");

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
    console.log(
      `\nRun: cursor-plan-preview serve ~/.cursor/plans/<filename>\n`,
    );
  });

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;

  if (platform === "darwin") cmd = `open "${url}"`;
  else if (platform === "win32") cmd = `start "" "${url}"`;
  else cmd = `xdg-open "${url}"`;

  exec(cmd);
}

program.parse();
