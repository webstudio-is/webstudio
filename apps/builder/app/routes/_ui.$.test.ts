import { afterEach, describe, expect, test, vi } from "vitest";
import { loader } from "./_ui.$";

describe("_ui.$ loader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns 404 for missing apple touch icons without cross-origin logging", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const request = new Request(
      "https://p-project.apps.webstudio.is/apple-touch-icon-precomposed.png",
      {
        headers: {
          accept: "*/*",
        },
      }
    );

    await expect(
      loader({
        request,
        params: {},
        context: {},
      })
    ).rejects.toMatchObject({
      status: 404,
    });
    expect(consoleInfo).not.toHaveBeenCalled();
  });
});
