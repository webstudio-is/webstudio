import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import { ContentDatabaseDiagnostics } from "./content-database-diagnostics";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

const revision = `sha256:${"a".repeat(64)}`;
const artifact: ContentArtifactV1 = {
  format: "webstudio-content-database",
  version: 1,
  assetRevision: revision,
  documents: [
    {
      _id: "post",
      properties: { body: { $ref: "./post.md#body" } },
    },
  ],
  fieldCatalog: {
    format: "webstudio-builder-asset-field-catalog",
    version: 1,
    canonicalRevision: revision,
    documentCount: 1,
    fields: {},
  },
  integrity: { algorithm: "sha256", checksum: revision },
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("orders collapsible sections and opens only database sizes by default", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <ContentDatabaseDiagnostics
          performance={{
            serverDurationMs: 125.5,
            loaderDurationMs: 150.25,
            responseBytes: 1024,
            assetQuery: {
              phases: {
                buildPlan: 20,
                indexPreparation: 80,
                diagnosticsPreparation: 40,
                compilerContentRead: 12,
                documentGraph: 30,
                documentGraphContentRead: 8,
                assetReferences: 5,
                sourceValidation: 10,
                documentResolution: 15,
              },
              compilationCache: "miss",
              compilerContentFetchCount: 3,
              compilerContentBytes: 3_000,
              documentGraphContentFetchCount: 2,
              documentGraphContentBytes: 2_000,
              resolvedDocumentCount: 2,
              documentFetchCount: 1,
            },
          }}
          value={{
            scope: "query-preview",
            queryIssues: [
              {
                severity: "warning",
                code: "UNOBSERVED_FIELD",
                path: ["query", "where", "all", "0", "field"],
                message:
                  "Asset field properties.subtitle is not currently observed",
              },
            ],
            queryWarnings: [
              "Asset field properties.subtitle is not currently observed",
            ],
            issues: [
              {
                severity: "warning",
                scope: "query",
                phase: "metadata",
                code: "FRONTMATTER_INVALID",
                message: "Invalid YAML at line 3, column 1",
                assetId: "post",
                path: "posts/broken.md",
                line: 3,
                column: 1,
                reference: "#frontmatter/author",
                sourceRange: {
                  start: { line: 3, column: 1, offset: 12 },
                  end: { line: 3, column: 12, offset: 23 },
                },
              },
            ],
            issueCount: 1,
            issuesTruncated: false,
            unresolved: {
              items: [
                {
                  id: "post",
                  properties: { body: { $ref: "./post.md#body" } },
                },
              ],
              totalCount: 1,
              hasMore: false,
            },
            artifacts: {
              query: artifact,
              database: artifact,
            },
            query: {
              usedBytes: 1_000,
              maxBytes: 500_000,
              unboundedBytes: 1_000,
              includedDocumentCount: 1,
              omittedDocumentCount: 0,
              truncated: false,
            },
            database: {
              usedBytes: 2_000,
              maxBytes: 500_000,
              unboundedBytes: 2_000,
              includedDocumentCount: 1,
              omittedDocumentCount: 0,
              truncated: false,
            },
          }}
        />
      </TooltipProvider>
    );
  });

  const sectionLabels = [
    "Errors and warnings",
    "Database and sizes",
    "Timing",
    "Assets batch work",
    "Query database",
    "Published database",
    "Unresolved query result",
  ];
  const triggers = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button[aria-controls]")
  );
  const sectionTriggers = triggers.filter((trigger) =>
    sectionLabels.includes(trigger.parentElement?.textContent ?? "")
  );
  expect(sectionTriggers).toHaveLength(sectionLabels.length);
  expect(
    sectionTriggers.map((trigger) => trigger.parentElement?.textContent)
  ).toEqual(sectionLabels);
  expect(sectionTriggers.map((trigger) => trigger.dataset.state)).toEqual([
    "open",
    "open",
    "closed",
    "closed",
    "closed",
    "closed",
    "closed",
  ]);
  const diagnosticTriggers = triggers.filter((trigger) =>
    trigger.getAttribute("aria-label")?.startsWith("Warning: ")
  );
  expect(diagnosticTriggers).toHaveLength(2);
  expect(diagnosticTriggers.map((trigger) => trigger.dataset.state)).toEqual([
    "closed",
    "closed",
  ]);
  expect(container.textContent).toContain("Invalid YAML at line 3, column 1");
  expect(container.textContent).toContain(
    "Asset field properties.subtitle is not currently observed"
  );
  expect(
    diagnosticTriggers[0]?.parentElement?.querySelector(
      'svg[aria-hidden="true"]'
    )
  ).not.toBeNull();
  expect(container.textContent).not.toContain("posts/broken.md:3:1");
  expect(container.textContent).not.toContain("query.where.all.0.field");
  expect(container.textContent).toContain("0 errors and 2 warnings.");
  const copyButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Copy "]')
  );
  expect(
    Array.from(
      new Set(copyButtons.map((button) => button.getAttribute("aria-label")))
    )
  ).toEqual(sectionLabels.map((label) => `Copy ${label} as JSON`));
  expect(container.textContent).not.toContain("Server duration");

  const timingCopyButton = copyButtons
    .filter(
      (button) => button.getAttribute("aria-label") === "Copy Timing as JSON"
    )
    .at(-1);
  act(() => timingCopyButton?.click());
  expect(sectionTriggers[2]?.dataset.state).toBe("closed");
  expect(writeText).toHaveBeenCalledOnce();
  expect(JSON.parse(writeText.mock.calls[0]?.[0] ?? "")).toEqual({
    builderRoundTripMs: 150.25,
    serverDurationMs: 125.5,
    phases: {
      buildPlan: 20,
      indexPreparation: 80,
      diagnosticsPreparation: 40,
      compilerContentRead: 12,
      documentGraph: 30,
      documentGraphContentRead: 8,
      assetReferences: 5,
      sourceValidation: 10,
      documentResolution: 15,
    },
  });

  const firstDiagnosticTitle =
    diagnosticTriggers[0]?.parentElement?.querySelector<HTMLButtonElement>(
      'button[tabindex="-1"]'
    );
  expect(firstDiagnosticTitle).not.toBeNull();
  act(() => {
    firstDiagnosticTitle?.click();
    diagnosticTriggers[1]?.click();
    sectionTriggers[2]?.click();
    sectionTriggers[3]?.click();
    sectionTriggers[6]?.click();
  });

  expect(diagnosticTriggers[0]?.dataset.state).toBe("open");
  expect(container.textContent).toContain("posts/broken.md:3:1");
  expect(container.textContent).toContain("posts/broken.md:3:1–3:12");
  expect(container.textContent).toContain("query.where.all.0.field");
  expect(container.textContent).toContain("UNOBSERVED_FIELD");
  const queryDiagnosticContent = document.getElementById(
    diagnosticTriggers[0]?.getAttribute("aria-controls") ?? ""
  );
  expect(queryDiagnosticContent?.textContent).toBe(
    "LocationQuery · query.where.all.0.fieldReasonAsset field properties.subtitle is not currently observedCodeUNOBSERVED_FIELD"
  );
  const editor = container.querySelector(".cm-content");
  expect(editor).not.toBeNull();
  expect(editor?.getAttribute("aria-readonly")).toBe("true");
  expect(container.textContent).toContain('"$ref": "./post.md#body"');
  expect(container.textContent).toContain("Server duration");
  expect(container.textContent).toContain("125.5 ms");
  expect(container.textContent).toContain("Builder round trip");
  expect(container.textContent).toContain("150.3 ms");
  expect(container.textContent).toContain("1.02 kB");
  expect(container.textContent).toContain("Build plan");
  expect(container.textContent).toContain("Index preparation");
  expect(container.textContent).toContain("Published diagnostics");
  expect(container.textContent).toContain("Compiler storage reads");
  expect(container.textContent).toContain("Document graph storage reads");
  expect(container.textContent).toContain("Compilation workCompiled");
  expect(container.textContent).toContain("Resolved documents2");
  expect(container.textContent).toContain("Timing");
  expect(container.textContent).toContain("Assets batch work");
  expect(container.textContent).toContain("Database and sizes");
  expect(container.querySelectorAll('svg[tabindex="0"]')).toHaveLength(26);
});

test("counts and labels query setup errors by their severity", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <ContentDatabaseDiagnostics
          value={{
            scope: "query-preview",
            queryIssues: [
              {
                severity: "error",
                code: "INVALID_LIMIT",
                path: ["query", "limit"],
                message: "Limit must be a positive integer",
              },
              {
                severity: "warning",
                code: "UNOBSERVED_FIELD",
                path: ["query", "sort", "0", "field"],
                message: "The sort field is not currently observed",
              },
            ],
            query: {
              usedBytes: 0,
              maxBytes: 500_000,
              unboundedBytes: 0,
              includedDocumentCount: 0,
              omittedDocumentCount: 0,
              truncated: false,
            },
            database: {
              usedBytes: 0,
              maxBytes: 500_000,
              unboundedBytes: 0,
              includedDocumentCount: 0,
              omittedDocumentCount: 0,
              truncated: false,
            },
          }}
        />
      </TooltipProvider>
    );
  });

  expect(container.textContent).toContain("1 error and 1 warning.");
  expect(container.textContent).toContain(
    "Error · Limit must be a positive integer"
  );
  expect(container.textContent).toContain(
    "The sort field is not currently observed"
  );
  expect(container.textContent).not.toContain("query.limit");
  const diagnosticTriggers = Array.from(
    container.querySelectorAll<HTMLButtonElement>('button[data-state="closed"]')
  ).filter((trigger) =>
    trigger.getAttribute("aria-label")?.match(/^(Error|Warning): /)
  );
  act(() => diagnosticTriggers.forEach((trigger) => trigger.click()));
  expect(container.textContent).toContain("Query · query.limit");
  expect(container.textContent).toContain("Query · query.sort.0.field");
});
