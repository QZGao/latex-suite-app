import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

function resolveDesktopNodeModule(...segments: string[]): string {
  return resolve(__dirname, "node_modules", ...segments);
}

const codeMirrorAliases = {
  codemirror: resolveDesktopNodeModule("codemirror", "dist", "index.js"),
  "@codemirror/commands": resolveDesktopNodeModule(
    "@codemirror",
    "commands",
    "dist",
    "index.js"
  ),
  "@codemirror/language": resolveDesktopNodeModule(
    "@codemirror",
    "language",
    "dist",
    "index.js"
  ),
  "@codemirror/state": resolveDesktopNodeModule(
    "@codemirror",
    "state",
    "dist",
    "index.js"
  ),
  "@codemirror/view": resolveDesktopNodeModule(
    "@codemirror",
    "view",
    "dist",
    "index.js"
  )
};

function createResolveConfig() {
  return {
    alias: {
      "@": resolve(__dirname, "src"),
      ...codeMirrorAliases
    },
    dedupe: [
      "codemirror",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/state",
      "@codemirror/view"
    ]
  };
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@latex-suite/contracts"]
      })
    ],
    resolve: createResolveConfig()
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@latex-suite/contracts"]
      })
    ],
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
          chunkFileNames: "chunks/[name]-[hash].cjs"
        }
      }
    },
    resolve: createResolveConfig()
  },
  renderer: {
    resolve: createResolveConfig()
  }
});
