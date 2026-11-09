import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import {
  copyDesignToken,
  copyStyleSourceTransfer,
} from "@webstudio-is/project-build/runtime";
import { StyleSourceInput } from "./style-source-input";
import { StyleSourceMenu } from "./style-source-menu";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("pastes copied Tokens and Tag styles while leaving ordinary text to the input", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onPasteStyleSource = vi.fn();
  const tokenData = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
      ]),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { tokenId: "token" }
  ).data;
  const tagStyleData = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { styleSourceId: "tag-style:button", sourceType: "tagStyle" }
  ).data;
  const localData = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { styleSourceId: "temporary-local", sourceType: "local" }
  ).data;

  try {
    act(() =>
      root.render(
        <StyleSourceInput
          inputRef={() => {}}
          selectedItemSelector={undefined}
          onPasteStyleSource={onPasteStyleSource}
        />
      )
    );
    const input = container.querySelector("input")!;
    const paste = (text: string) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
      const event = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      act(() => input.dispatchEvent(event));
      return event;
    };

    expect(paste(tokenData).defaultPrevented).toBe(true);
    expect(onPasteStyleSource).toHaveBeenCalledExactlyOnceWith(tokenData);
    expect(paste(tagStyleData).defaultPrevented).toBe(true);
    expect(onPasteStyleSource).toHaveBeenLastCalledWith(tagStyleData);
    expect(paste(localData).defaultPrevented).toBe(true);
    expect(onPasteStyleSource).toHaveBeenLastCalledWith(localData);
    expect(paste("Button").defaultPrevented).toBe(false);
    expect(paste('{"other":"value"}').defaultPrevented).toBe(false);
    expect(onPasteStyleSource).toHaveBeenCalledTimes(3);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test.each([
  ["tagStyle", "tag-style:button", "button"],
  ["local", "temporary-local", "Local"],
] as const)(
  "copies the selected %s source from its menu",
  (source, id, label) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCopy = vi.fn();
    try {
      act(() =>
        root.render(
          <StyleSourceMenu
            open
            onOpenChange={() => {}}
            selectedItemSelector={undefined}
            item={{
              id,
              label,
              source,
              disabled: false,
              locked: false,
              states: [],
            }}
            hasStyles
            states={[]}
            onCopy={onCopy}
          />
        )
      );
      const copy = Array.from(
        document.querySelectorAll<HTMLElement>('[role="menuitem"]')
      ).find((item) => item.textContent === "Copy");
      expect(copy).toBeDefined();
      act(() => copy?.click());
      expect(onCopy).toHaveBeenCalledExactlyOnceWith(id);
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  }
);
