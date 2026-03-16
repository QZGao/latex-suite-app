import "./ui/theme.css";
import "katex/dist/katex.min.css";
import { mountComposerApp } from "./app/composer-app.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root.");
}

void mountComposerApp(root);
