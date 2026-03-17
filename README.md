![LaTeX Suite desktop app icon](./apps/desktop/assets/icon.svg)

# LaTeX Suite desktop app

Lightweight Windows app for fast LaTeX composition. Built with Electron on top of the [LaTeX Suite Core](https://github.com/QZGao/latex-suite-core) CodeMirror 6 Extension, which is a fork of the popular [Obsidian LaTeX Suite](https://github.com/artisticat1/obsidian-latex-suite).

## Features

- Fast LaTeX composition with live preview.
- Lightweight and portable, no installation required (although an installer is also provided if you prefer).
- Launchable via a global hotkey (default: <kbd>Ctrl</kbd>+<kbd>.</kbd>) for quick access from any application.

Three launch modes:

- Insert: directly insert the formula into the active application at the cursor position.
- Selection Replace: <kbd>Ctrl</kbd>+<kbd>C</kbd> the current selection as the formula context, then insert the composed formula back to replace the selection.
- Auto Selection Replace: <kbd>Ctrl</kbd>+<kbd>A</kbd>, <kbd>Ctrl</kbd>+<kbd>C</kbd> to select all and copy as the formula context, then insert the composed formula back to replace the selection.

## Development

### Commands

- `corepack pnpm install`
- `npm run version:check`
- `npm run version:bump -- <version>`
- `npm run test`
- `npm run build`
- `npm run package:desktop:dir`
- `npm run dist:desktop:win`

### Artifacts

- unpacked app: `artifacts/desktop/win-unpacked`
- installer: `artifacts/desktop/LaTeX Suite Setup <version>.exe`
- portable build: `artifacts/desktop/LaTeX Suite <version>.exe`
- packaged bridge payload: `artifacts/win-bridge/win-x64/win-bridge.exe`

## Credits

The icon is designed based on the work of [Guy vandegrift](https://commons.wikimedia.org/wiki/File:Ell-mathematical_symbol.svg) under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.en).
