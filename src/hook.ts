import { isPlanFile } from "./parser.js";
import { startServer } from "./server.js";
import { exec } from "child_process";

interface HookInput {
  file_path: string;
  edits?: unknown[];
}

async function main(): Promise<void> {
  let raw = "";
  process.stdin.setEncoding("utf-8");

  for await (const chunk of process.stdin) {
    raw += chunk;
  }

  let input: HookInput;
  try {
    input = JSON.parse(raw) as HookInput;
  } catch {
    process.stdout.write("{}\n");
    process.exit(0);
  }

  if (!isPlanFile(input.file_path)) {
    process.stdout.write("{}\n");
    process.exit(0);
  }

  try {
    const { url } = await startServer({ planFile: input.file_path });
    openBrowser(`${url}?file=${encodeURIComponent(input.file_path)}`);
  } catch {
    // fail silently — don't block Cursor
  }

  process.stdout.write("{}\n");
  process.exit(0);
}

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;

  if (platform === "darwin") cmd = `open "${url}"`;
  else if (platform === "win32") cmd = `start "" "${url}"`;
  else cmd = `xdg-open "${url}"`;

  exec(cmd);
}

main().catch(() => {
  process.stdout.write("{}\n");
  process.exit(0);
});
