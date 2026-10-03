import { describe, expect, test, vi } from "vitest";
import {
  createCloudflareProtectedResourceFetch,
  createProtectedResourceFetch,
  getDeniedResourceHostnames,
} from "./protected-resource-fetch";

describe("protected Resource fetch", () => {
  test("preflights allowed and denied URL policy without opening a connection", () => {
    const transport = vi.fn();
    const protectedFetch = createProtectedResourceFetch({
      deniedHostnames: ["site.example", "webstudio.is"],
      transport,
    });
    expect(() =>
      protectedFetch.validateDestination(
        new URL("https://api.example.net/submit")
      )
    ).not.toThrow();
    for (const destination of [
      "https://site.example/submit",
      "https://sub.webstudio.is/submit",
      "https://user:password@api.example.net/submit",
      "ftp://api.example.net/submit",
    ]) {
      expect(() =>
        protectedFetch.validateDestination(new URL(destination))
      ).toThrow();
    }
    expect(transport).not.toHaveBeenCalled();
  });

  test("requires an explicit Worker zone and blocks its own origin", async () => {
    expect(() =>
      createCloudflareProtectedResourceFetch({ ownZoneHostnames: [""] })
    ).toThrow("Worker zones must be specified");

    const workerFetch = vi.fn<typeof fetch>();
    const protectedFetch = createCloudflareProtectedResourceFetch({
      ownZoneHostnames: ["example.com"],
      workerFetch,
    });
    await expect(
      protectedFetch("https://private.example.com/submit", { method: "POST" })
    ).rejects.toThrow("not allowed");
    expect(workerFetch).not.toHaveBeenCalled();
  });

  test("blocks sibling hosts within the configured site's registrable domain", () => {
    expect(getDeniedResourceHostnames(["forms.customer.co.uk"])).toEqual(
      expect.arrayContaining(["webstudio.is", "webstudio.io", "customer.co.uk"])
    );
  });

  test("does not forward a configured Host override", async () => {
    let receivedHeaders: Headers | undefined;
    const protectedFetch = createProtectedResourceFetch({
      deniedHostnames: [],
      transport: async (hop) => {
        receivedHeaders = hop.headers;
        return { response: new Response("ok") };
      },
    });

    await protectedFetch("https://public.example/submit", {
      method: "POST",
      headers: { Host: "internal.example", authorization: "Bearer secret" },
    });

    expect(receivedHeaders?.has("host")).toBe(false);
    expect(receivedHeaders?.get("authorization")).toBe("Bearer secret");
  });

  test("makes every Worker hop manual and follows same-origin 307 POST", async () => {
    const workerFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 307,
          headers: { location: "/next" },
        })
      )
      .mockResolvedValueOnce(new Response("ok"));
    const protectedFetch = createCloudflareProtectedResourceFetch({
      ownZoneHostnames: ["own.example"],
      workerFetch,
    });

    const result = await protectedFetch("https://api.example/submit", {
      method: "POST",
      body: "message=hello",
      headers: { authorization: "Bearer secret" },
    });
    expect(await result.text()).toBe("ok");
    expect(workerFetch).toHaveBeenCalledTimes(2);
    expect(workerFetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.example/submit",
      "https://api.example/next",
    ]);
    for (const [, init] of workerFetch.mock.calls) {
      expect(init?.redirect).toBe("manual");
      expect(init?.method).toBe("POST");
      expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(
        "message=hello"
      );
    }
  });

  test("rejects cross-origin redirects before forwarding secrets or submitted values", async () => {
    const workerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { location: "https://other.example/steal" },
      })
    );
    const protectedFetch = createCloudflareProtectedResourceFetch({
      ownZoneHostnames: ["own.example"],
      workerFetch,
    });
    await expect(
      protectedFetch("https://api.example/submit", {
        method: "POST",
        body: "secret value",
        headers: { authorization: "Bearer secret" },
      })
    ).rejects.toThrow("another origin");
    expect(workerFetch).toHaveBeenCalledTimes(1);
  });

  test("rejects redirect method changes and oversized response bodies", async () => {
    const redirect = createProtectedResourceFetch({
      deniedHostnames: [],
      transport: async () => ({
        response: new Response(null, {
          status: 302,
          headers: { location: "/next" },
        }),
      }),
    });
    await expect(
      redirect("https://api.example/submit", { method: "POST" })
    ).rejects.toThrow("changed the submission method");

    const large = createProtectedResourceFetch({
      deniedHostnames: [],
      transport: async () => ({
        response: new Response(new Uint8Array(2 * 1024 * 1024 + 1)),
      }),
    });
    await expect(large("https://api.example/data")).rejects.toThrow(
      "too large"
    );
  });
});
