import { expect, test, vi } from "vitest";
import { renderAndVerifyRoute } from "./mcp-route";

test("renders one route and evaluates focused assertions without a build", async () => {
  const fetchImpl = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith("/pricing")) {
      return new Response(
        `<!doctype html><html><head><title>Pricing</title><meta name="description" content="Plans"><script type="application/ld+json">{"@type":"WebPage"}</script></head><body><h1 id="plans">Choose a plan</h1><img src="/logo.png"><a href="/terms">Terms</a></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } }
      );
    }
    if (url.endsWith("logo.png")) {
      return new Response("image", {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    return new Response("ok", { status: 200 });
  });

  const result = await renderAndVerifyRoute({
    baseUrl: "http://127.0.0.1:5173",
    path: "/pricing",
    assertions: {
      status: 200,
      text: ["Choose a plan"],
      elements: [{ tag: "h1", id: "plans" }],
      metadata: ["title", "description"],
      linksResolve: true,
      resourcesResolve: true,
      imageContentTypes: true,
      structuredDataParses: true,
      structuredDataTypes: ["WebPage"],
    },
    fetchImpl,
  });

  expect(result.passed).toBe(true);
  expect(result.metadata).toEqual({ title: "Pricing", description: "Plans" });
  expect(result.resourceUrls).toEqual([
    "http://127.0.0.1:5173/logo.png",
    "http://127.0.0.1:5173/terms",
  ]);
  expect(fetchImpl).toHaveBeenCalledTimes(3);
});

test("reports assertion failures with the rendered evidence", async () => {
  const result = await renderAndVerifyRoute({
    baseUrl: "https://example.com",
    path: "/missing",
    assertions: { status: 200, text: ["Expected"] },
    fetchImpl: vi.fn<typeof fetch>(
      async () => new Response("Not found", { status: 404 })
    ),
  });

  expect(result).toMatchObject({
    passed: false,
    route: { status: 404 },
    assertions: [
      { assertion: "status", passed: false },
      { assertion: "text", passed: false },
    ],
  });
});
