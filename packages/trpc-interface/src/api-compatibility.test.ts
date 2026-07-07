import { describe, expect, test } from "vitest";
import {
  apiCompatibilityErrorType,
  createApiCompatibilityPayload,
  getApiCompatibilityPayload,
} from "./api-compatibility";

describe("api compatibility", () => {
  test("uses camelCase payload values", () => {
    const payload = createApiCompatibilityPayload({
      reason: "apiProcedureNotFound",
      target: "browser",
    });

    expect(payload).toMatchObject({
      type: "webstudioApiCompatibilityError",
      reason: "apiProcedureNotFound",
      action: { type: "reloadBrowser" },
    });
    expect(apiCompatibilityErrorType).toBe("webstudioApiCompatibilityError");
  });

  test("finds nested tRPC error payload", () => {
    const payload = createApiCompatibilityPayload({
      reason: "apiRouteNotFound",
      target: "cli",
    });

    expect(
      getApiCompatibilityPayload({
        data: {
          apiCompatibility: payload,
        },
      })
    ).toEqual(payload);
  });

  test("finds payload in batched tRPC response", () => {
    const payload = createApiCompatibilityPayload({
      reason: "apiProcedureNotFound",
      target: "browser",
    });

    expect(
      getApiCompatibilityPayload([
        {
          error: {
            data: {
              apiCompatibility: payload,
            },
          },
        },
      ])
    ).toEqual(payload);
  });

  test("ignores circular objects", () => {
    const error: { cause?: unknown } = {};
    error.cause = error;

    expect(getApiCompatibilityPayload(error)).toBeUndefined();
  });

  test("ignores ordinary errors", () => {
    expect(
      getApiCompatibilityPayload(new Error("Cannot POST"))
    ).toBeUndefined();
  });
});
