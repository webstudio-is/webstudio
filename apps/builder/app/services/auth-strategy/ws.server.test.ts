import createDebug from "debug";
import { expect, test, vi } from "vitest";

test("loading multiple server bundles keeps OAuth debug output disabled", async () => {
  const originalDebug = process.env.DEBUG;
  createDebug.enable("*");
  try {
    for (let bundle = 0; bundle < 2; bundle += 1) {
      vi.resetModules();
      await import("./ws.server");
      expect(createDebug.enabled("OAuth2Strategy")).toBe(false);
      expect(createDebug.enabled("remix-auth:OAuth2Strategy:callback")).toBe(
        false
      );
      expect(createDebug.enabled("webstudio:request")).toBe(true);
    }
  } finally {
    createDebug.enable(originalDebug ?? "");
    vi.resetModules();
  }
});
