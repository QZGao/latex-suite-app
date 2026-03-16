import { describe, expect, it } from "vitest";
import { buildLatexSuiteSourceBundle } from "./snippet-loader.js";

describe("buildLatexSuiteSourceBundle", () => {
  it("returns defaults when built-in snippets are enabled", () => {
    const bundle = buildLatexSuiteSourceBundle({
      builtInEnabled: true
    });

    expect(bundle.snippets).toContain("export default");
    expect(bundle.snippetVariables).toContain("Object.assign");
  });

  it("supports plain custom arrays and objects without export syntax", () => {
    const bundle = buildLatexSuiteSourceBundle({
      builtInEnabled: false,
      userSnippetSource: '[{ trigger: "ff", replacement: "\\\\frac{$0}{$1}", options: "tA" }]',
      userVariableSource: '{ "${TEST}": "foo|bar" }'
    });

    expect(bundle.snippets).toContain('trigger: "ff"');
    expect(bundle.snippetVariables).toContain('"${TEST}"');
    expect(bundle.snippets).not.toContain("undefined");
  });

  it("strips export default when the user file already exports a module", () => {
    const bundle = buildLatexSuiteSourceBundle({
      builtInEnabled: false,
      userSnippetSource:
        'export default [{ trigger: "aa", replacement: "\\\\alpha", options: "tA" }];',
      userVariableSource: 'export default { "${ALPHA}": "alpha" };'
    });

    expect(bundle.snippets).toContain('trigger: "aa"');
    expect(bundle.snippets).not.toContain("export default export default");
    expect(bundle.snippetVariables).toContain('"${ALPHA}"');
  });
});
