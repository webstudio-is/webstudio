import { describe, expect, test } from "vitest";
import { createLocalResourceRequest } from "./rest.resources-loader-utils";

describe("resources loader local dispatch", () => {
  test("creates nested requests from relative local resource URLs", async () => {
    const request = createLocalResourceRequest(
      new Request("https://p-project.builder.example/rest/resources-loader"),
      "/$resources/assets/query?resourceId=posts",
      { method: "POST", body: '{"query":"*[]"}' }
    );

    expect(request.url).toBe(
      "https://p-project.builder.example/$resources/assets/query?resourceId=posts"
    );
    expect(request.method).toBe("POST");
    expect(await request.text()).toBe('{"query":"*[]"}');
  });
});
