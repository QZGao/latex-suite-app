import type { Extension } from "@codemirror/state";
import type { ComposerSnippetPayload } from "../../shared/composer-payload.js";
import { buildLatexSuiteSourceBundle } from "./snippet-loader.js";

interface LatexSuiteVendorModule {
  latexSuiteWithDefaults(overrides?: Record<string, unknown>): Promise<Extension[]>;
}

/**
 * Single integration seam for the vendored latex-suite-core build.
 */
export async function loadLatexSuiteExtensions(
  snippetPayload: ComposerSnippetPayload
): Promise<Extension[]> {
  const bundle = buildLatexSuiteSourceBundle(snippetPayload);
  const vendorModule = (await import(
    "../../../../../vendors/latex-suite-core/main.js"
  )) as LatexSuiteVendorModule;

  return vendorModule.latexSuiteWithDefaults({
    snippets: bundle.snippets,
    snippetVariables: bundle.snippetVariables,
    concealEnabled: false,
    mathPreviewEnabled: false
  });
}
