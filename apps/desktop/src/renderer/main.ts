import "./ui/theme.css";
import "katex/dist/katex.min.css";
import { mountComposerApp } from "./app/composer-app.js";

window.addEventListener("error", (event) => {
  console.error("[renderer] Unhandled window error.", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[renderer] Unhandled promise rejection.", event.reason);
});

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root.");
}

void mountComposerApp(root);
