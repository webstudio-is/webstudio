/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useContentEditable } from "./use-content-editable";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test("keeps the editor open when completion is rejected", () => {
  const onChangeEditing = vi.fn();
  const onChangeValue = vi.fn(() => false);
  const Editor = () => {
    const { ref, handlers } = useContentEditable({
      isEditable: true,
      isEditing: true,
      onChangeEditing,
      onChangeValue,
      value: "Card",
    });
    return (
      <div ref={ref} {...handlers}>
        Duplicate
      </div>
    );
  };
  act(() => root.render(<Editor />));
  const editor = container.querySelector("div")!;

  act(() => {
    editor.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  });

  expect(onChangeValue).toHaveBeenCalledWith("Duplicate");
  expect(onChangeEditing).not.toHaveBeenCalled();
  expect(editor.getAttribute("contenteditable")).toBe("plaintext-only");
});
