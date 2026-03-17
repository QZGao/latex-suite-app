import "./ui/settings-window.css";
import { mountSettingsApp } from "./settings/settings-app.js";

window.addEventListener("error", (event) => {
  console.error("[settings] Unhandled window error.", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[settings] Unhandled promise rejection.", event.reason);
});

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root.");
}

void mountSettingsApp(root);
