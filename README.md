# LaTeX Suite desktop app

Windows-only Electron app for fast LaTeX composition.

## Commands

- `corepack pnpm install`
- `npm run version:check`
- `npm run version:bump -- <version>`
- `npm run test`
- `npm run build`
- `npm run package:desktop:dir`
- `npm run dist:desktop:win`

## Release Outputs

- unpacked app: `artifacts/desktop/win-unpacked`
- installer: `artifacts/desktop/LaTeX Suite Setup <version>.exe`
- portable build: `artifacts/desktop/LaTeX Suite <version>.exe`
- packaged bridge payload: `artifacts/win-bridge/win-x64/win-bridge.exe`
