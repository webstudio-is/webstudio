import { afterEach, expect, test, vi } from "vitest";
import { initBuilderApi } from "./builder-api";
import { readClipboardText } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("reads clipboard text", async () => {
  vi.stubGlobal("navigator", {
    clipboard: { readText: vi.fn().mockResolvedValue("clipboard text") },
  });

  await expect(readClipboardText()).resolves.toBe("clipboard text");
});

test("reports denied clipboard access without rejecting", async () => {
  initBuilderApi();
  const toastError = vi.fn();
  window.__webstudio__$__builderApi.toast.error = toastError;
  vi.stubGlobal("navigator", {
    clipboard: {
      readText: vi
        .fn()
        .mockRejectedValue(
          new DOMException("Permission denied", "NotAllowedError")
        ),
    },
  });

  await expect(readClipboardText()).resolves.toBeUndefined();
  expect(toastError).toHaveBeenCalledWith(
    "Webstudio cannot read the clipboard. Allow clipboard access in your browser, then try again."
  );
});
