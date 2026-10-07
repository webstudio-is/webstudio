import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import { TooltipProvider } from "@webstudio-is/design-system";
import { computeExpressionWithinScope } from "@webstudio-is/project-build/runtime";
import { __testing__ } from "./resource-panel";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});
const setup = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  return container;
};

test("bound body content type and editor follow its value type at runtime", async () => {
  const container = setup();
  const render = (scope: Record<string, unknown>) =>
    root?.render(
      <TooltipProvider>
        <__testing__.BodyField
          scope={scope}
          aliases={new Map()}
          bodyFormat="auto"
          value={encodeDataVariableId("payload")}
          onChange={() => {}}
        />
      </TooltipProvider>
    );
  await act(async () =>
    render({ [encodeDataVariableId("payload")]: "plain text" })
  );
  await expect
    .poll(() => container.querySelector('input[name="header-value"]'))
    .not.toBeNull();
  expect(container.querySelector(".cm-editor")).toBeNull();
  const expression = container.querySelector<HTMLInputElement>(
    'input[name="header-value"]'
  )!.value;
  expect(
    await computeExpressionWithinScope(expression, {
      [encodeDataVariableId("payload")]: "plain text",
    })
  ).toBe("text/plain");
  expect(
    await computeExpressionWithinScope(expression, {
      [encodeDataVariableId("payload")]: { field: "value" },
    })
  ).toBe("application/json");
  await act(async () =>
    render({ [encodeDataVariableId("payload")]: { field: "value" } })
  );
  await expect.poll(() => container.querySelector(".cm-editor")).not.toBeNull();
  expect(
    container.querySelector<HTMLTextAreaElement>('textarea[name="body"]')
      ?.validationMessage
  ).toBe("");
});

test("invalid JSON edits retain the JSON editor and recover validation when fixed", async () => {
  const container = setup();
  const render = (value: string) =>
    root?.render(
      <TooltipProvider>
        <__testing__.BodyField
          scope={{}}
          aliases={new Map()}
          bodyFormat="auto"
          value={value}
          onChange={() => {}}
        />
      </TooltipProvider>
    );
  await act(async () => render("{ field: 1 }"));
  expect(container.querySelector(".cm-editor")).not.toBeNull();
  await act(async () => render("{ field:"));
  await expect
    .poll(
      () =>
        container.querySelector<HTMLTextAreaElement>('textarea[name="body"]')
          ?.validationMessage
    )
    .toBe("Expected valid JSON object in body");
  expect(container.querySelector(".cm-editor")).not.toBeNull();
  await act(async () => render("{ field: 2 }"));
  await expect
    .poll(
      () =>
        container.querySelector<HTMLTextAreaElement>('textarea[name="body"]')
          ?.validationMessage
    )
    .toBe("");
  expect(container.querySelector(".cm-editor")).not.toBeNull();
});
