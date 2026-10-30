import { describe, expect, test, vi } from "vitest";
import {
  createCloudflareProtectedResourceFetch,
  createProtectedResourceFetch,
  getDeniedResourceHostnames,
  isProtectedResourceReentry,
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

  test("requires a site hostname and blocks requests back to the site", async () => {
    expect(() =>
      createCloudflareProtectedResourceFetch({
        projectId: "project-a",
        ownZoneHostnames: [""],
      })
    ).toThrow("Worker zones must be specified");

    const workerFetch = vi.fn<typeof fetch>();
    const protectedFetch = createCloudflareProtectedResourceFetch({
      projectId: "project-a",
      ownZoneHostnames: ["site.example.com", "alias.example.net"],
      publicRouting: true,
      workerFetch,
    });
    for (const hostname of ["site.example.com", "alias.example.net"]) {
      await expect(
        protectedFetch(`https://${hostname}/submit`, { method: "POST" })
      ).rejects.toThrow("not allowed");
    }
    expect(workerFetch).not.toHaveBeenCalled();
  });

  test("allows a sibling API hostname on a public-routed Worker", async () => {
    const workerFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok"));
    const protectedFetch = createCloudflareProtectedResourceFetch({
      projectId: "project-a",
      ownZoneHostnames: ["site.example.com"],
      publicRouting: true,
      workerFetch,
    });

    await expect(
      protectedFetch("https://api.site.example.com/submit", { method: "POST" })
    ).resolves.toBeInstanceOf(Response);
    expect(workerFetch).toHaveBeenCalledOnce();
  });

  test("marks Cloudflare Resource requests so another site alias can reject reentry", async () => {
    const workerFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok"));
    const protectedFetch = createCloudflareProtectedResourceFetch({
      projectId: "project-a",
      ownZoneHostnames: ["site.example.com"],
      publicRouting: true,
      workerFetch,
    });

    await protectedFetch("https://same-site.pages.dev/data");
    const [, init] = workerFetch.mock.calls[0];
    expect(
      isProtectedResourceReentry(
        new Request("https://same-site.pages.dev/data", init),
        "project-a"
      )
    ).toBe(true);
    expect(
      isProtectedResourceReentry(
        new Request("https://same-site.pages.dev/data"),
        "project-a"
      )
    ).toBe(false);
  });

  test("keeps the zone-wide block without public routing", async () => {
    const workerFetch = vi.fn<typeof fetch>();
    const protectedFetch = createCloudflareProtectedResourceFetch({
      projectId: "project-a",
      ownZoneHostnames: ["site.example.com"],
      workerFetch,
    });

    expect(() =>
      protectedFetch.validateDestination(
        new URL("https://api.site.example.com/submit")
      )
    ).toThrow("not allowed");
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
      projectId: "project-a",
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
      projectId: "project-a",
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

  test("follows a public cross-origin GET without forwarding configured headers", async () => {
    const workerFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: "https://www.public.example/path" },
        })
      )
      .mockResolvedValueOnce(new Response("ok"));
    const protectedFetch = createCloudflareProtectedResourceFetch({
      projectId: "project-a",
      ownZoneHostnames: ["own.example"],
      workerFetch,
    });

    const response = await protectedFetch("https://public.example/path", {
      headers: {
        authorization: "Bearer secret",
        cookie: "session=secret",
        "x-submitted-data": "private value",
      },
    });

    expect(await response.text()).toBe("ok");
    expect(workerFetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://public.example/path",
      "https://www.public.example/path",
    ]);
    const first = workerFetch.mock.calls[0][1];
    const second = workerFetch.mock.calls[1][1];
    expect(new Headers(first?.headers).get("authorization")).toBe(
      "Bearer secret"
    );
    expect([...new Headers(second?.headers)]).toEqual([
      ["x-webstudio-protected-resource", "project-a"],
    ]);
    expect(second?.body).toBeUndefined();
    expect(second?.redirect).toBe("manual");
  });

  test("rejects an internal cross-origin redirect before the next fetch", async () => {
    const workerFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://own.example/private" },
      })
    );
    const protectedFetch = createCloudflareProtectedResourceFetch({
      projectId: "project-a",
      ownZoneHostnames: ["own.example"],
      workerFetch,
    });

    await expect(protectedFetch("https://public.example/path")).rejects.toThrow(
      "not allowed"
    );
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
        response: new Response(new Uint8Array(1024 * 1024 + 1)),
      }),
    });
    await expect(large("https://api.example/data")).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
    });
  });
});

test("allows another project but rejects the originating project through any alias", async () => {
  const resourceFetch = createCloudflareProtectedResourceFetch({
    projectId: "project-a",
    ownZoneHostnames: ["site-a.example"],
    publicRouting: true,
    workerFetch: async (input, init) => {
      const request = new Request(input, init);
      const projectId =
        new URL(request.url).hostname === "site-b.example"
          ? "project-b"
          : "project-a";
      return new Response(null, {
        status: isProtectedResourceReentry(request, projectId) ? 508 : 200,
      });
    },
  });
  expect((await resourceFetch("https://site-b.example/data")).status).toBe(200);
  expect((await resourceFetch("https://alias-a.example/data")).status).toBe(
    508
  );
});
