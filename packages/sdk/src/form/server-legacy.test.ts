import { expect, test, vi } from "vitest";
import type { ResourceRequestGraph } from "../resource-loader";
import {
  adaptLegacyFormSubmission,
  createLegacyFormResourceFetch,
} from "./server-legacy";
import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./fields";

const url = new URL("https://site.example/contact");

test.each(["get", "post", "put", "delete"] as const)(
  "keeps a legacy action's %s method and configured request fields",
  (method) => {
    const formData = new FormData();
    formData.set(formIdFieldName, "action");
    formData.set(formBotFieldName, "brave");
    formData.append("choice", "first");
    formData.append("choice", "last");
    const resources: ResourceRequestGraph = {
      rootIds: [],
      resources: [
        {
          id: "action",
          outputName: "action",
          dependencies: ["dependency"],
          createRequest: () => ({
            name: "action",
            method,
            url: "https://receiver.example/",
            searchParams: [{ name: "source", value: "saved" }],
            headers: [{ name: "X-Saved", value: "yes" }],
            body: "saved body",
          }),
        },
        {
          id: "dependency",
          outputName: "dependency",
          dependencies: [],
          createRequest: () => ({
            name: "dependency",
            method: "get",
            url: "https://receiver.example/data",
            searchParams: [],
            headers: [],
          }),
        },
        {
          id: "unrelated",
          outputName: "unrelated",
          dependencies: [],
          createRequest: () => {
            throw new Error("Unrelated Resource must not run");
          },
        },
      ],
    };
    const adapted = adaptLegacyFormSubmission({
      formData,
      action: { id: "action", outputName: "action" },
      resources,
      url,
    });
    expect(adapted.formData.get(managedFormIdFieldName)).toBe("legacy");
    expect(adapted.formData.get(formIdFieldName)).toBeNull();
    expect(adapted.formData.get(managedFormArrayNamesFieldName)).toBe(
      '["choice"]'
    );
    expect(adapted.graph.resources.map(({ id }) => id)).toEqual([
      "action",
      "dependency",
    ]);
    expect(adapted.graph.resources[0]?.createRequest(new Map())).toEqual({
      name: "action",
      method,
      url: "https://receiver.example/",
      searchParams: [{ name: "source", value: "saved" }],
      headers: [{ name: "X-Saved", value: "yes" }],
      body: { choice: "last" },
    });
  }
);

test("uses the Email Resource transport for the default owner notification", () => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set("message", "Hello");
  const adapted = adaptLegacyFormSubmission({
    formData,
    resources: { rootIds: [], resources: [] },
    contactEmail: "owner@example.com",
    url,
  });
  expect(adapted.graph.rootIds).toEqual(["legacy-email"]);
  expect(adapted.graph.resources[0]?.control).toBe("email");
  expect(adapted.graph.resources[0]?.createRequest(new Map()).email).toEqual({
    recipientMode: "project",
    recipients: [{ address: "owner@example.com" }],
    subject: "New form submission from site.example",
    body: "There has been a new submission of your form at https://site.example/contact:\n\nmessage: Hello\n",
    includeAttachments: true,
  });
});

test("keeps uploaded files in the configured action body", () => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set("attachment", new File(["hello"], "hello.txt"));
  const adapted = adaptLegacyFormSubmission({
    formData,
    action: { id: "action", outputName: "action" },
    resources: {
      rootIds: [],
      resources: [
        {
          id: "action",
          outputName: "action",
          dependencies: [],
          createRequest: () => ({
            name: "action",
            method: "post",
            url: "https://receiver.example/",
            searchParams: [],
            headers: [],
          }),
        },
      ],
    },
    url,
  });
  const request = adapted.graph.resources[0]?.createRequest(new Map());
  expect((request?.body as { attachment: File }).attachment.name).toBe(
    "hello.txt"
  );
  expect((request?.body as { attachment: File }).attachment.size).toBe(5);
});

test("routes local Assets dependencies without leaking its internal marker", async () => {
  const localFetch = vi.fn(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).has("x-test-dependency")).toBe(false);
      return Response.json({ assets: [] });
    }
  );
  const protectedFetch = Object.assign(
    vi.fn(async () => Response.json({})),
    { validateDestination: vi.fn() }
  );
  const resourceFetch = createLegacyFormResourceFetch({
    protectedFetch,
    localFetch,
    dependencyHeader: "x-test-dependency",
    projectId: "project",
  });
  await expect(
    resourceFetch("/$resources/assets", {
      method: "POST",
      headers: { "x-test-dependency": "1" },
      body: JSON.stringify({ query: {} }),
    })
  ).resolves.toHaveProperty("ok", true);
  expect(localFetch).toHaveBeenCalledOnce();
  expect(protectedFetch).not.toHaveBeenCalled();
});

test("caches only opted-in dependencies and validates every cache hit", async () => {
  const cache = new Map<string, Response>();
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (key: URL) => cache.get(key.href)?.clone(),
      put: async (key: URL, response: Response) => {
        cache.set(key.href, response.clone());
      },
    }),
  });
  const protectedFetch = Object.assign(
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      expect(request.headers.has("x-test-dependency")).toBe(false);
      return Response.json({ delivered: true });
    }),
    { validateDestination: vi.fn() }
  );
  const resourceFetch = createLegacyFormResourceFetch({
    protectedFetch,
    localFetch: vi.fn(),
    dependencyHeader: "x-test-dependency",
    projectId: "project",
  });
  const headers = {
    "x-test-dependency": "1",
    "Cache-Control": "public, max-age=60",
  };
  try {
    await resourceFetch("https://receiver.example/data", { headers });
    await resourceFetch("https://receiver.example/data", { headers });
    expect(protectedFetch).toHaveBeenCalledTimes(1);
    expect(protectedFetch.validateDestination).toHaveBeenCalledTimes(2);
    await resourceFetch("https://receiver.example/data", {
      headers: { "Cache-Control": "public, max-age=60" },
    });
    expect(protectedFetch).toHaveBeenCalledTimes(2);
    const controller = new AbortController();
    controller.abort();
    await expect(
      resourceFetch("https://receiver.example/data", {
        headers,
        signal: controller.signal,
      })
    ).rejects.toThrow();
    expect(protectedFetch).toHaveBeenCalledTimes(2);
  } finally {
    vi.unstubAllGlobals();
  }
});
