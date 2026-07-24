import { describe, expect, test } from "vitest";
import { createLocalResourceRequest } from "./create-local-resource-request";

describe("resources loader local dispatch", () => {
  test("creates nested requests from relative local resource URLs", async () => {
    const body = '{"query":{"filters":[],"limit":20,"offset":0}}';
    const request = createLocalResourceRequest(
      new Request("https://p-project.builder.example/rest/resources-loader"),
      "/$resources/assets",
      { method: "POST", body }
    );

    expect(request.url).toBe(
      "https://p-project.builder.example/$resources/assets"
    );
    expect(request.method).toBe("POST");
    expect(await request.text()).toBe(body);
  });
});
