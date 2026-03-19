import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node20",
  banner: {
    js: "#!/usr/bin/env node",
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["../agent-config/setup.mjs"],
  noExternal: [],
});
