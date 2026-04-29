import { afterEach, describe, expect, test, vi } from "vitest";
import { preventCrossOriginCookie } from "./no-cross-origin-cookie";

describe("preventCrossOriginCookie", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("logs blocked cross-origin requests as info", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const request = new Request("https://apps.webstudio.is/rest/data", {
      method: "POST",
      headers: {
        cookie: "session=1",
      },
    });

    expect(() => preventCrossOriginCookie(request)).toThrow();

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith(
      "Blocked cross-origin request to https://apps.webstudio.is/rest/data",
      []
    );
    expect(request.headers.has("cookie")).toBe(false);
  });
});
