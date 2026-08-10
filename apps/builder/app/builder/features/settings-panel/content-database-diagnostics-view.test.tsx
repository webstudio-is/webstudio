/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import { ContentDatabaseDiagnostics } from "./content-database-diagnostics";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

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
});

test("shows the unresolved query result in a read-only JSON editor", () => {
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
                documentResolution: 15,
              },
              compilationCache: "miss",
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

  const editor = container.querySelector(".cm-content");
  expect(editor).not.toBeNull();
  expect(editor?.getAttribute("aria-readonly")).toBe("true");
  expect(container.textContent).toContain("Unresolved query result");
  expect(container.textContent).toContain('"$ref": "./post.md#body"');
  expect(container.textContent).toContain("Query database");
  expect(container.textContent).toContain("Published database");
  expect(container.textContent).toContain("Server duration");
  expect(container.textContent).toContain("125.5 ms");
  expect(container.textContent).toContain("Builder round trip");
  expect(container.textContent).toContain("150.3 ms");
  expect(container.textContent).toContain("1.02 kB");
  expect(container.textContent).toContain("Build plan");
  expect(container.textContent).toContain("Index preparation");
  expect(container.textContent).toContain("Compilation cacheMiss");
  expect(container.textContent).toContain("Resolved documents2");
  expect(container.textContent).toContain("Timing");
  expect(container.textContent).toContain("Query work");
  expect(container.textContent).toContain("Database and sizes");
  expect(container.querySelectorAll('svg[tabindex="0"]')).toHaveLength(16);
});
