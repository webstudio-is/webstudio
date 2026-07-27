import { describe, expect, test } from "vitest";
import {
  apiClientHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import { action } from "../routes/rest.$";

const requestUnknownRoute = async (client: "browser" | "cli") => {
  const response = await action({
    request: new Request("https://webstudio.is/rest/assets/legacy-name.png", {
      method: "POST",
      headers: { [apiClientHeader]: client },
    }),
  } as never);
  return { response, body: await response.json() };
};

describe("unknown REST route", () => {
  test("asks browser callers to reload", async () => {
    const { response, body } = await requestUnknownRoute("browser");

    expect(response.status).toBe(426);
    expect(getApiCompatibilityPayload(body)).toMatchObject({
      reason: "apiRouteNotFound",
      target: "browser",
      action: { type: "reloadBrowser" },
    });
  });

  test("asks CLI callers to update", async () => {
    const { response, body } = await requestUnknownRoute("cli");

    expect(response.status).toBe(426);
    expect(getApiCompatibilityPayload(body)).toMatchObject({
      reason: "apiRouteNotFound",
      target: "cli",
      action: { type: "updateCli" },
    });
  });
});
