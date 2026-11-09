import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { copyDesignToken } from "@webstudio-is/project-build/runtime";
import { StyleSourceInput } from "./style-source-input";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("pastes copied tokens through the token flow and leaves ordinary text to the input", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onPasteToken = vi.fn();
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

  try {
    act(() =>
      root.render(
        <StyleSourceInput
          inputRef={() => {}}
          selectedItemSelector={undefined}
          onPasteToken={onPasteToken}
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
    expect(onPasteToken).toHaveBeenCalledExactlyOnceWith(tokenData);
    expect(paste("Button").defaultPrevented).toBe(false);
    expect(paste('{"other":"value"}').defaultPrevented).toBe(false);
    expect(onPasteToken).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
