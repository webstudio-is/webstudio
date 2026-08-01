/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ContentDatabaseDiagnostics } from "./content-database-diagnostics";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

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
});
