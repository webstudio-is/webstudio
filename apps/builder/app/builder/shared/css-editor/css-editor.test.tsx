import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { CssEditor } from "./css-editor";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const declaration = {
  property: "color",
  source: { name: "local" },
  cascadedValue: { type: "keyword", value: "red" },
  computedValue: { type: "keyword", value: "red" },
  usedValue: { type: "keyword", value: "red" },
} as ComputedStyleDecl;

const renderEditor = (declarations = [declaration]) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onRenameProperty = vi.fn();
  const onToggleAddStyleInput = vi.fn();
  const Editor = () => {
    const [showAddStyleInput, setShowAddStyleInput] = useState(false);
    return (
      <CssEditor
        declarations={declarations}
        virtualize={false}
        showSearch={false}
        showAddStyleInput={showAddStyleInput}
        onToggleAddStyleInput={(show) => {
          onToggleAddStyleInput(show);
          setShowAddStyleInput(show);
        }}
        onDeleteProperty={() => undefined}
        onSetProperty={() => () => undefined}
        onRenameProperty={onRenameProperty}
        onAddDeclarations={() => undefined}
        onDeleteAllDeclarations={() => undefined}
      />
    );
  };
  act(() =>
    root?.render(
      <TooltipProvider>
        <Editor />
      </TooltipProvider>
    )
  );
  return { container, onRenameProperty, onToggleAddStyleInput };
};

test("edits a saved property name inline and preserves its value", async () => {
  const { container, onRenameProperty } = renderEditor();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Property name: color"]'
  )!;
  await userEvent.clear(input);
  await userEvent.type(input, "background-color");
  await userEvent.tab();
  expect(onRenameProperty).toHaveBeenCalledWith(
    "color",
    "background-color",
    declaration.cascadedValue
  );
});

test("Escape cancels an inline property rename", async () => {
  const { container, onRenameProperty } = renderEditor();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Property name: color"]'
  )!;
  await userEvent.clear(input);
  await userEvent.type(input, "background-color");
  await userEvent.keyboard("{Escape}");
  expect(input.value).toBe("color");
  expect(onRenameProperty).not.toHaveBeenCalled();
});

test("renaming to an existing property keeps both declarations", async () => {
  const backgroundColor = {
    ...declaration,
    property: "background-color",
  } as ComputedStyleDecl;
  const { container, onRenameProperty } = renderEditor([
    declaration,
    backgroundColor,
  ]);
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Property name: color"]'
  )!;
  await userEvent.clear(input);
  await userEvent.type(input, "background-color");
  await userEvent.tab();
  expect(input.value).toBe("color");
  expect(onRenameProperty).not.toHaveBeenCalled();
});

test("renaming to a property that cannot use the value keeps the original", async () => {
  const { container, onRenameProperty } = renderEditor();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Property name: color"]'
  )!;
  await userEvent.clear(input);
  await userEvent.type(input, "opacity");
  await userEvent.tab();
  expect(input.value).toBe("color");
  expect(onRenameProperty).not.toHaveBeenCalled();
});

test("Enter at the end of a value focuses a new property input", async () => {
  const { container, onToggleAddStyleInput } = renderEditor();
  const valueInput = container.querySelector<HTMLInputElement>(
    'input[name="color"]'
  )!;
  await userEvent.click(valueInput);
  await new Promise((resolve) => setTimeout(resolve, 160));
  valueInput.setSelectionRange(
    valueInput.value.length,
    valueInput.value.length
  );
  expect(valueInput.selectionStart).toBe(valueInput.value.length);
  expect(valueInput.selectionEnd).toBe(valueInput.value.length);
  await userEvent.keyboard("{Enter}");
  expect(onToggleAddStyleInput).toHaveBeenCalledWith(true);
  await vi.waitFor(() => {
    expect(document.activeElement).toBe(
      container.querySelector('input[aria-label="Property name: "]')
    );
  });
});

test("Enter inside a value keeps focus in that value", async () => {
  const { container, onToggleAddStyleInput } = renderEditor();
  const valueInput = container.querySelector<HTMLInputElement>(
    'input[name="color"]'
  )!;
  await userEvent.click(valueInput);
  await new Promise((resolve) => setTimeout(resolve, 160));
  valueInput.setSelectionRange(1, 1);
  await userEvent.keyboard("{Enter}");
  expect(onToggleAddStyleInput).not.toHaveBeenCalledWith(true);
  expect(document.activeElement).toBe(valueInput);
});
