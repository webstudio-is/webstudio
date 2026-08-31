import { afterAll, afterEach, expect, test, vi } from "vitest";
import { __testing__ as builderApiTesting } from "./builder-api";
import { readClipboardText } from "./clipboard";

afterAll(builderApiTesting.useLocalApi());

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("reads clipboard text", async () => {
  vi.stubGlobal("navigator", {
    clipboard: { readText: vi.fn().mockResolvedValue("clipboard text") },
  });

  await expect(readClipboardText()).resolves.toBe("clipboard text");
});

test("reports denied clipboard access without rejecting", async () => {
  const toastError = vi
    .spyOn(builderApiTesting.api.toast, "error")
    .mockImplementation(() => {});
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
