import defaultSnippetSource from "../../../../../vendors/latex-suite-core/src/default_snippets.js?raw";
import defaultSnippetVariableSource from "../../../../../vendors/latex-suite-core/src/default_snippet_variables.js?raw";
import type { ComposerSnippetPayload } from "../../shared/composer-payload.js";

export interface LatexSuiteSourceBundle {
  snippets: string;
  snippetVariables: string;
}

function normalizeModuleExpression(source: string | undefined, fallback: string): string {
  const trimmed = source?.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("export default")) {
    return trimmed.replace(/^export\s+default\s+/, "").replace(/;?\s*$/, "");
  }

  return trimmed;
}

/**
 * Builds source strings in the exact format expected by latex-suite-core.
 */
export function buildLatexSuiteSourceBundle(
  payload: ComposerSnippetPayload
): LatexSuiteSourceBundle {
  const snippetExpressions: string[] = [];
  const variableExpressions: string[] = [];

  if (payload.builtInEnabled) {
    snippetExpressions.push(normalizeModuleExpression(defaultSnippetSource, "[]"));
    variableExpressions.push(
      normalizeModuleExpression(defaultSnippetVariableSource, "{}")
    );
  }

  if (payload.userSnippetSource) {
    snippetExpressions.push(normalizeModuleExpression(payload.userSnippetSource, "[]"));
  }

  if (payload.userVariableSource) {
    variableExpressions.push(
      normalizeModuleExpression(payload.userVariableSource, "{}")
    );
  }

  const snippets =
    snippetExpressions.length === 0
      ? "export default [];"
      : `export default [${snippetExpressions
          .map((expression) => `...(${expression})`)
          .join(",\n")}];`;

  const snippetVariables =
    variableExpressions.length === 0
      ? "export default {};"
      : `export default Object.assign({}, ${variableExpressions
          .map((expression) => `(${expression})`)
          .join(", ")});`;

  return {
    snippets,
    snippetVariables
  };
}
