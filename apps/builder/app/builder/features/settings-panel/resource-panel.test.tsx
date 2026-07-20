import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { UrlField } from "./resource-panel";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("preserves resource URL expression newlines in form data", () => {
  const expression = `"https://example.com/" +\n  "path"`;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <form>
        <TooltipProvider>
          <UrlField
            scope={{}}
            aliases={new Map()}
            value={expression}
            onChange={() => {}}
            onCurlPaste={() => {}}
          />
        </TooltipProvider>
      </form>
    );
  });

  const form = container.querySelector("form");
  if (form === null) {
    throw new Error("Expected resource form");
  }
  expect(new FormData(form).get("url")).toEqual(expression);
});
