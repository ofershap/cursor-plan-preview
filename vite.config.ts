import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const isGhPages = process.env.DEPLOY_TARGET === "gh-pages";

export default defineConfig({
  root: "ui",
  base: isGhPages ? "/cursor-plan-preview/" : "/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist/ui"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "ui/index.html"),
    },
  },
});
