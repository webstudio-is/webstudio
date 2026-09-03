import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ResourceDiagnosticsView } from "./resource-diagnostics-view";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("shows an explicit empty state when no diagnostics are available", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <ResourceDiagnosticsView />
      </TooltipProvider>
    );
  });

  expect(container.textContent).toContain("No diagnostics available");
});

test("shows every diagnostics response schema issue at its exact path", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <ResourceDiagnosticsView
          diagnosticsRequestError={{
            status: 500,
            code: "INVALID_DIAGNOSTICS_RESPONSE",
            message: "Resource diagnostics response is invalid",
            retryable: true,
            details: {
              issues: [
                {
                  severity: "error",
                  scope: "diagnostics",
                  code: "invalid_value",
                  path: ["__diagnostics__", "scope"],
                  message: 'Expected "query-preview"',
                },
                {
                  severity: "error",
                  scope: "diagnostics",
                  code: "invalid_type",
                  path: ["__diagnostics__", "query", "usedBytes"],
                  message: "Expected a number",
                },
              ],
            },
          }}
        />
      </TooltipProvider>
    );
  });

  expect(container.textContent).toContain(
    "Error · Diagnostics response · __diagnostics__.scope"
  );
  expect(container.textContent).toContain('Expected "query-preview"');
  expect(container.textContent).toContain(
    "Error · Diagnostics response · __diagnostics__.query.usedBytes"
  );
  expect(container.textContent).toContain("Expected a number");
});

test("shows every detailed diagnostic instead of the ordinary preview error", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <ResourceDiagnosticsView
          requestError={{
            status: 500,
            code: "INTERNAL_ERROR",
            message: "Asset query preview failed",
            retryable: true,
          }}
          diagnostics={{
            scope: "query-preview",
            issues: [
              {
                severity: "warning",
                scope: "query",
                phase: "source",
                code: "FRONTMATTER_INVALID",
                message: "Markdown frontmatter contains invalid YAML",
                assetId: "broken",
                path: "content/broken.md",
                line: 4,
                column: 1,
              },
              {
                severity: "error",
                scope: "query",
                phase: "source",
                code: "invalid-mdx",
                message: "Unexpected closing tag",
                assetId: "broken-mdx",
                path: "content/broken.mdx",
                line: 8,
                column: 3,
              },
            ],
            query: {
              usedBytes: 100,
              maxBytes: 1000,
              unboundedBytes: 100,
              includedDocumentCount: 1,
              omittedDocumentCount: 0,
              truncated: false,
            },
            database: {
              usedBytes: 100,
              maxBytes: 1000,
              unboundedBytes: 100,
              includedDocumentCount: 1,
              omittedDocumentCount: 0,
              truncated: false,
            },
          }}
        />
      </TooltipProvider>
    );
  });

  expect(container.textContent).toContain("content/broken.md:4:1");
  expect(container.textContent).toContain(
    "Markdown frontmatter contains invalid YAML"
  );
  expect(container.textContent).toContain("content/broken.mdx:8:3");
  expect(container.textContent).toContain("Unexpected closing tag");
  expect(container.textContent).not.toContain("Asset query preview failed");
});
