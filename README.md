# latex-suite-app

Windows-only Electron app for fast LaTeX composition with a native bridge and a vendored `latex-suite-core`.

## Commands

- `corepack pnpm install`
- `npm run test`
- `npm run build`
- `npm run package:desktop:dir`
- `npm run dist:desktop:win`

## Release Outputs

- unpacked app: `artifacts/desktop/win-unpacked`
- installer: `artifacts/desktop/LaTeX Suite Setup 0.1.0.exe`
- portable build: `artifacts/desktop/LaTeX Suite 0.1.0.exe`
- packaged bridge payload: `artifacts/win-bridge/win-x64/win-bridge.exe`
