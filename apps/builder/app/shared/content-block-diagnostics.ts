import type { ContentBlockDiagnostic } from "@webstudio-is/sdk";

const formatSourceLocation = (diagnostic: ContentBlockDiagnostic) => {
  const point = diagnostic.sourceRange?.start;
  return point === undefined
    ? ""
    : ` Line ${point.line}, column ${point.column}.`;
};

export const formatContentBlockDiagnostic = (
  diagnostic: ContentBlockDiagnostic
) => {
  let message = "Invalid MDX content.";
  if (diagnostic.code === "invalid-mdx") {
    message = diagnostic.message;
  } else if (diagnostic.code === "unsafe-mdx") {
    message = diagnostic.reason;
  } else if (diagnostic.code === "unresolved-template") {
    message = `Template "${diagnostic.templateName}" is not available and was skipped.`;
  } else if (diagnostic.code === "ambiguous-template") {
    message = `Multiple templates match ${diagnostic.semanticKey}: ${diagnostic.templateNames.join(", ")}. The unstyled fallback was used.`;
  } else if (diagnostic.code === "ignored-template-prop") {
    message = `Property "${diagnostic.propName}" on template "${
      diagnostic.templateName
    }" was ignored because it is ${diagnostic.reason.replace("-", " ")}.`;
  }
  return `${message}${formatSourceLocation(diagnostic)}`;
};

export const deduplicateContentBlockDiagnostics = (
  diagnostics: readonly ContentBlockDiagnostic[]
) => {
  const keys = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = JSON.stringify(diagnostic);
    if (keys.has(key)) {
      return false;
    }
    keys.add(key);
    return true;
  });
};

const notifiedDiagnosticKeys = new Set<string>();
const maxNotifiedDiagnosticKeys = 1000;

export const takeNewContentBlockDiagnostics = (
  diagnostics: readonly ContentBlockDiagnostic[],
  revision?: string
) => {
  const fresh: ContentBlockDiagnostic[] = [];
  for (const diagnostic of deduplicateContentBlockDiagnostics(diagnostics)) {
    const key = JSON.stringify([revision, diagnostic]);
    if (notifiedDiagnosticKeys.has(key)) {
      continue;
    }
    notifiedDiagnosticKeys.add(key);
    if (notifiedDiagnosticKeys.size > maxNotifiedDiagnosticKeys) {
      const oldestKey = notifiedDiagnosticKeys.values().next().value;
      if (oldestKey !== undefined) {
        notifiedDiagnosticKeys.delete(oldestKey);
      }
    }
    fresh.push(diagnostic);
  }
  return fresh;
};
