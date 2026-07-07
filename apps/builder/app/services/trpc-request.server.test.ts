import { describe, expect, test } from "vitest";
import { apiClientHeader } from "@webstudio-is/trpc-interface/api-compatibility";
import { isCliApiRequest } from "./trpc-request.server";

describe("isCliApiRequest", () => {
  test("accepts CLI API requests", () => {
    const request = new Request("https://webstudio.is/trpc", {
      headers: {
        [apiClientHeader]: "cli",
      },
    });

    expect(isCliApiRequest(request)).toBe(true);
  });

  test("rejects browser and unknown API requests", () => {
    const browserRequest = new Request("https://webstudio.is/trpc", {
      headers: {
        [apiClientHeader]: "browser",
      },
    });
    const unknownRequest = new Request("https://webstudio.is/trpc");

    expect(isCliApiRequest(browserRequest)).toBe(false);
    expect(isCliApiRequest(unknownRequest)).toBe(false);
  });
});
