import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@latex-suite/contracts"]
      })
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
      }
    }
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@latex-suite/contracts"]
      })
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
      }
    }
  }
});
