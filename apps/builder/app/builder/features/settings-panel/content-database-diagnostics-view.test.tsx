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
  expect(triggers).toHaveLength(sectionLabels.length);
  expect(triggers.map((trigger) => trigger.parentElement?.textContent)).toEqual(
    sectionLabels
  );
  expect(triggers.map((trigger) => trigger.dataset.state)).toEqual([
    "open",
    "closed",
    "closed",
    "closed",
    "closed",
    "closed",
  ]);
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
  expect(triggers[1]?.dataset.state).toBe("closed");
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

  act(() => {
    triggers[1]?.click();
    triggers[2]?.click();
    triggers[5]?.click();
  });

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
