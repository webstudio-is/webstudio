import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { AssetQueryForm } from "./asset-query-form";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("renders a centered message while the OpenAPI description is loading", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <AssetQueryForm
        scope={{}}
        aliases={new Map()}
        fetchDescription={() => new Promise(() => {})}
      />
    );
  });

  expect(container.textContent).toContain("Loading query editor…");
});
