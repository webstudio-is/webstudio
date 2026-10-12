import { describe, expect, test, vi } from "vitest";
import { createCanvasTextDocumentFetch } from "./text-document-fetch";
import {
  encodeDataVariableId,
  type Pages,
  type DataSources,
  type Resources,
  type ResourceRequest,
} from "@webstudio-is/sdk";

const pages = {
  homePageId: "home",
  rootFolderId: "root-folder",
  folders: new Map([
    [
      "root-folder",
      { id: "root-folder", name: "Root", slug: "", children: ["home", "data"] },
    ],
  ]),
  pages: new Map([
    [
      "home",
      {
        id: "home",
        name: "Home",
        title: "Home",
        path: "",
        rootInstanceId: "home-root",
        meta: {},
      },
    ],
    [
      "data",
      {
        id: "data",
        name: "Data",
        title: "Data",
        path: "/data.txt",
        rootInstanceId: "data-root",
        meta: { documentType: "text", content: '"{\\"items\\":[1,2]}"' },
      },
    ],
  ]),
} as Pages;

describe("createCanvasTextDocumentFetch", () => {
  test("resolves relative URLs against the current preview page after navigation", async () => {
    const nestedData = {
      ...pages.pages.get("data")!,
      path: "/docs/data.txt",
    };
    const nestedPages: Pages = {
      ...pages,
      pages: new Map(pages.pages).set("data", nestedData),
    };
    let previewUrl = "https://project.apps.webstudio.is/docs/page";
    const originalFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Not found", { status: 404 }));
    const fetch = createCanvasTextDocumentFetch({
      fetch: originalFetch,
      getBaseUrl: () => previewUrl,
      getData: () => ({
        pages: nestedPages,
        dataSources: new Map(),
        resources: new Map(),
      }),
      loadResource: vi.fn(),
    });

    const nested = await fetch("./data.txt");
    expect(nested.url).toBe("https://project.apps.webstudio.is/docs/data.txt");
    await expect(nested.json()).resolves.toEqual({ items: [1, 2] });

    previewUrl = "https://project.apps.webstudio.is/other/page";
    const fallback = await fetch("./data.txt");
    expect(fallback.status).toBe(404);
    expect(originalFetch).toHaveBeenCalledWith(
      new URL("https://project.apps.webstudio.is/other/data.txt"),
      undefined
    );
    expect(originalFetch).toHaveBeenCalledTimes(1);
  });

  test("serves a project's text-document page to relative same-origin fetches", async () => {
    const originalFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Not found", { status: 404 }));
    const fetch = createCanvasTextDocumentFetch({
      fetch: originalFetch,
      getBaseUrl: () => "https://project.apps.webstudio.is/canvas",
      getData: () => ({ pages, dataSources: new Map(), resources: new Map() }),
      loadResource: vi.fn(),
    });

    const response = await fetch("./data.txt");

    expect(response.status).toBe(200);
    expect(response.url).toBe("https://project.apps.webstudio.is/data.txt");
    expect(response.redirected).toBe(false);
    expect(response.type).toBe("basic");
    expect(response.clone()).toMatchObject({
      url: response.url,
      redirected: false,
      type: "basic",
    });
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8"
    );
    await expect(response.json()).resolves.toEqual({ items: [1, 2] });
    expect(originalFetch).not.toHaveBeenCalled();
  });

  test("does not intercept other origins, methods, or non-text pages", async () => {
    const originalFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Not found", { status: 404 }));
    const fetch = createCanvasTextDocumentFetch({
      fetch: originalFetch,
      getBaseUrl: () => "https://project.apps.webstudio.is/canvas",
      getData: () => ({ pages, dataSources: new Map(), resources: new Map() }),
      loadResource: vi.fn(),
    });

    await fetch("https://example.com/data.txt");
    await fetch("https://project.apps.webstudio.is/data.txt", {
      method: "POST",
    });
    await fetch("https://project.apps.webstudio.is/unknown.txt");
    await fetch("https://project.apps.webstudio.is/");

    expect(originalFetch).toHaveBeenCalledTimes(4);
    const signal = new AbortController().signal;
    const absoluteRequest = new Request(
      "https://project.apps.webstudio.is/unknown.txt",
      { signal }
    );
    await fetch(absoluteRequest);
    expect(originalFetch).toHaveBeenLastCalledWith(absoluteRequest, undefined);
    expect(absoluteRequest.signal.aborted).toBe(false);
    await fetch(new URL("https://example.com/data.txt"));
    expect(originalFetch).toHaveBeenLastCalledWith(
      new URL("https://example.com/data.txt"),
      undefined
    );
    const request = new Request("https://project.apps.webstudio.is/data.txt", {
      method: "POST",
      body: "payload",
    });
    await fetch(request);
    expect(request.bodyUsed).toBe(false);
    await expect(request.text()).resolves.toBe("payload");
  });

  test("evaluates target-page system and dependent resources without selected-page values", async () => {
    const target = {
      ...pages.pages.get("data")!,
      path: "/data/:slug",
      systemDataSourceId: "target-system",
      meta: {
        documentType: "text" as const,
        content: `${encodeDataVariableId("result")}.data`,
      },
    };
    const dataSources: DataSources = new Map([
      [
        "target-system",
        {
          id: "target-system",
          name: "System",
          type: "parameter",
          scopeInstanceId: "data-root",
        },
      ],
      [
        "dependency",
        {
          id: "dependency",
          name: "Dependency",
          type: "resource",
          scopeInstanceId: "data-root",
          resourceId: "first",
        },
      ],
      [
        "result",
        {
          id: "result",
          name: "Result",
          type: "resource",
          scopeInstanceId: "data-root",
          resourceId: "second",
        },
      ],
    ]);
    const system = encodeDataVariableId("target-system");
    const resources: Resources = new Map([
      [
        "first",
        {
          id: "first",
          name: "First",
          method: "get",
          url: `"https://api.example/" + ${system}.params.slug`,
          headers: [],
          searchParams: [
            { name: "category", value: `${system}.search.category` },
          ],
        },
      ],
      [
        "second",
        {
          id: "second",
          name: "Second",
          method: "get",
          url: `${encodeDataVariableId("dependency")}.data.url`,
          headers: [],
        },
      ],
    ]);
    const loadResource = vi.fn(async (request: ResourceRequest) =>
      request.name === "First"
        ? { data: { url: "https://api.example/result" } }
        : { data: JSON.stringify({ items: [1, 2] }) }
    );
    const requestFetch = createCanvasTextDocumentFetch({
      fetch: vi.fn(),
      getBaseUrl: () => "https://project.apps.webstudio.is/canvas",
      getData: () => ({
        pages: { ...pages, pages: new Map(pages.pages).set(target.id, target) },
        dataSources,
        resources,
      }),
      loadResource,
    });
    await expect(
      (await requestFetch("/data/news?category=recent")).json()
    ).resolves.toEqual({ items: [1, 2] });
    expect(
      loadResource.mock.calls.map(([request]) => [
        request.url,
        request.searchParams,
      ])
    ).toEqual([
      ["https://api.example/news", [{ name: "category", value: "recent" }]],
      ["https://api.example/result", []],
    ]);
  });

  test("preserves plain content, status, HEAD, and redirects", async () => {
    const target = {
      ...pages.pages.get("data")!,
      meta: {
        documentType: "text" as const,
        content: "User-agent: *",
        status: "404",
      },
    };
    const redirect = {
      ...target,
      id: "redirect",
      path: "/old.txt",
      meta: {
        documentType: "text" as const,
        redirect: '"/data.txt"',
        status: "301",
      },
    };
    const redirectToNative = {
      ...redirect,
      id: "redirect-native",
      path: "/old-native.txt",
      meta: { ...redirect.meta, redirect: '"/native.txt"' },
    };
    const redirectToExternal = {
      ...redirect,
      id: "redirect-external",
      path: "/old-external.txt",
      meta: {
        ...redirect.meta,
        redirect: '"https://other.example/data.txt"',
      },
    };
    const opaqueResponse = Response.error();
    Object.defineProperty(opaqueResponse, "type", { value: "opaque" });
    const originalFetch = vi.fn<typeof fetch>(async (input) =>
      input instanceof Request && input.mode === "no-cors"
        ? opaqueResponse
        : new Response("native")
    );
    const requestFetch = createCanvasTextDocumentFetch({
      fetch: originalFetch,
      getBaseUrl: () => "https://project.apps.webstudio.is/canvas",
      getData: () => ({
        pages: {
          ...pages,
          pages: new Map(pages.pages)
            .set(target.id, target)
            .set(redirect.id, redirect)
            .set(redirectToNative.id, redirectToNative)
            .set(redirectToExternal.id, redirectToExternal),
        },
        dataSources: new Map(),
        resources: new Map(),
      }),
      loadResource: vi.fn(),
    });
    const response = await requestFetch("./data.txt");
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("User-agent: *");
    expect((await requestFetch("./data.txt#anchor")).url).toBe(
      "https://project.apps.webstudio.is/data.txt"
    );
    await expect(
      (await requestFetch("./data.txt", { method: "HEAD" })).text()
    ).resolves.toBe("");
    const manual = await requestFetch("./old.txt", { redirect: "manual" });
    expect(manual.status).toBe(0);
    expect(manual.type).toBe("opaqueredirect");
    expect(manual.url).toBe("https://project.apps.webstudio.is/old.txt");
    expect(manual.redirected).toBe(false);
    expect(manual.headers.get("location")).toBeNull();
    await expect(manual.text()).resolves.toBe("");
    expect(manual.clone()).toMatchObject({
      status: 0,
      type: "opaqueredirect",
      url: "https://project.apps.webstudio.is/old.txt",
      redirected: false,
    });
    expect(
      (await requestFetch("./old.txt#anchor", { redirect: "manual" })).url
    ).toBe("https://project.apps.webstudio.is/old.txt");
    const followed = await requestFetch("./old.txt");
    expect(followed.url).toBe("https://project.apps.webstudio.is/data.txt");
    expect(followed.redirected).toBe(true);
    expect(followed.type).toBe("basic");
    expect(followed.clone()).toMatchObject({
      url: followed.url,
      redirected: true,
      type: "basic",
    });
    await expect(followed.text()).resolves.toBe("User-agent: *");
    const native = await requestFetch("./old-native.txt");
    expect(native).toMatchObject({
      url: "https://project.apps.webstudio.is/native.txt",
      redirected: true,
    });
    expect(native.clone()).toMatchObject({
      url: native.url,
      redirected: true,
    });
    const opaque = await requestFetch("./old-external.txt", {
      mode: "no-cors",
    });
    expect(opaque).toMatchObject({
      url: "",
      redirected: false,
      type: "opaque",
      status: 0,
    });
    await expect(
      requestFetch("./old.txt", { redirect: "error" })
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      requestFetch("./data.txt", { signal: AbortSignal.abort() })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
