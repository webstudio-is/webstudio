import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { parseStyleInput } from "~/builder/shared/css-editor/parse-style-input";
import { InlineStyleBlockEditor, StyleBlockDialog } from "./style-block-dialog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const declarations = Array.from(
  parseStyleInput("margin: 0; border: 1px solid red", new Map()).styleMap,
  ([property, value]) => ({ property, value })
);

const render = (content: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<TooltipProvider>{content}</TooltipProvider>));
  return container;
};

test("inline Code view renders stored longhands as editable shorthands", async () => {
  const container = render(
    <InlineStyleBlockEditor
      declarations={declarations}
      readonly={false}
      onApply={() => {}}
    />
  );
  await vi.waitFor(() => {
    const content = container.querySelector(".cm-content")?.textContent;
    expect(content).toContain("margin:");
    expect(content).toContain("border:");
    expect(content).not.toContain("margin-top:");
  });
});

test("centered Local editor renders stored longhands as editable shorthands", async () => {
  render(
    <StyleBlockDialog
      declarations={declarations}
      readonly={false}
      open
      onOpenChange={() => {}}
      onApply={() => {}}
    />
  );
  await vi.waitFor(() => {
    const content = document.querySelector(".cm-content")?.textContent;
    expect(content).toContain("margin:");
    expect(content).toContain("border:");
  });
});
