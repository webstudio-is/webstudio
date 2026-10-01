import { afterEach, expect, test, vi } from "vitest";
import { getFormSubmissionHeaders, submitFormActions } from "./form-actions";
import type { ResourceRequestGraph } from "./resource-loader";

const request = (name: string) => ({
  name,
  searchParams: [],
  method: "post" as const,
  url: `https://example.com/${name}`,
  headers: [{ name: "Content-Type", value: "application/json" }],
});
const node = (id: string, dependencies: string[] = []) => ({
  id,
  outputName: id,
  dependencies,
  createRequest: () => request(id),
});
const baseUrl = new URL("https://example.com");

test("shares read dependencies and sends uncached multipart to every action on each submission", async () => {
  const graph: ResourceRequestGraph = {
    rootIds: [],
    resources: [
      node("shared"),
      node("first", ["shared"]),
      node("second", ["shared"]),
    ],
  };
  const dependencyFetch = vi.fn<typeof fetch>(async () =>
    Response.json({ id: "shared" })
  );
  const received: FormData[] = [];
  const actionFetch = vi.fn<typeof fetch>(async (input, init) => {
    received.push(await new Request(input, init).formData());
    return Response.json({ ok: true });
  });
  const body = new FormData();
  body.append("topics", "a");
  body.append("topics", "b");
  body.append(
    "file",
    new Blob([new Uint8Array([0, 128, 255])], {
      type: "application/octet-stream",
    }),
    "file.bin"
  );
  for (let index = 0; index < 2; index += 1) {
    await expect(
      submitFormActions({
        graph,
        resourceIds: ["first", "second"],
        body,
        baseUrl,
        dependencyFetch,
        actionFetch,
      })
    ).resolves.toEqual({ success: true });
  }
  expect(dependencyFetch).toHaveBeenCalledTimes(2);
  expect(actionFetch).toHaveBeenCalledTimes(4);
  for (const data of received) {
    expect(data.getAll("topics")).toEqual(["a", "b"]);
    const file = data.get("file") as File;
    expect(file.name).toBe("file.bin");
    expect(file.type).toBe("application/octet-stream");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(
      new Uint8Array([0, 128, 255])
    );
  }
});

test.each(["http", "network", "expression", "timeout"])(
  "settles independent siblings after a %s failure without leaking configuration",
  async (failure) => {
    const graph: ResourceRequestGraph = {
      rootIds: [],
      resources: [
        {
          ...node("failed"),
          createRequest: () => {
            if (failure === "expression") {
              throw new Error("private credential");
            }
            return request("failed");
          },
        },
        node("sibling"),
      ],
    };
    let release = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started: string[] = [];
    let timeoutSignal: AbortSignal | undefined;
    const actionFetch: typeof fetch = async (input, init) => {
      const id = new URL(String(input)).pathname;
      started.push(id);
      if (id === "/sibling") {
        await barrier;
        return Response.json({ ok: true });
      }
      if (failure === "network") {
        throw new Error("private credential");
      }
      if (failure === "timeout") {
        timeoutSignal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      }
      return new Response("private credential", { status: 503 });
    };
    let settled = false;
    const result = submitFormActions({
      graph,
      resourceIds: ["failed", "sibling"],
      body: {},
      baseUrl,
      dependencyFetch: actionFetch,
      actionFetch,
      timeoutMs: 100,
    });
    result.then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(started).toContain("/sibling"));
    expect(settled).toBe(false);
    release();
    await expect(result).resolves.toEqual({
      success: false,
      partialSuccess: true,
      errors: ["One or more form actions failed"],
    });
    expect(started.filter((id) => id === "/sibling")).toHaveLength(1);
    if (failure === "timeout") {
      expect(timeoutSignal?.aborted).toBe(true);
    }
  }
);

test("validates the whole graph before sending email or any webhook", async () => {
  const actionFetch = vi.fn<typeof fetch>(async () =>
    Response.json({ ok: true })
  );
  const invalidGroups = [
    { resourceIds: ["email"], resources: [] },
    { resourceIds: ["first"], resources: [node("first", ["email"])] },
    { resourceIds: ["missing"], resources: [node("first")] },
    { resourceIds: ["first", "first"], resources: [node("first")] },
    {
      resourceIds: ["first"],
      resources: [node("first", ["second"]), node("second", ["first"])],
    },
  ];
  for (const { resourceIds, resources } of invalidGroups) {
    await expect(
      submitFormActions({
        graph: { rootIds: [], resources },
        resourceIds,
        emailRequest: request("email"),
        body: {},
        baseUrl,
        dependencyFetch: actionFetch,
        actionFetch,
      })
    ).rejects.toThrow();
  }
  await expect(
    submitFormActions({
      graph: { rootIds: [], resources: [] },
      resourceIds: [],
      body: {},
      baseUrl,
      dependencyFetch: actionFetch,
      actionFetch,
    })
  ).rejects.toThrow("No form actions configured");
  expect(actionFetch).not.toHaveBeenCalled();
});

test("respects dependencies between selected actions and skips an action when its dependency fails", async () => {
  const graph: ResourceRequestGraph = {
    rootIds: [],
    resources: [node("first"), node("second", ["first"])],
  };
  for (const ok of [true, false]) {
    const actionFetch = vi.fn<typeof fetch>(
      async () => new Response("", { status: ok ? 200 : 503 })
    );
    const result = await submitFormActions({
      graph,
      resourceIds: ["second", "first"],
      body: {},
      baseUrl,
      dependencyFetch: actionFetch,
      actionFetch,
    });
    expect(result.success).toBe(ok);
    expect(actionFetch.mock.calls.map(([url]) => url)).toEqual(
      ok
        ? ["https://example.com/first", "https://example.com/second"]
        : ["https://example.com/first"]
    );
  }
});

afterEach(() => vi.unstubAllGlobals());

test("forwards only visitor metadata and uses a trusted IPv4 or IPv6 address", () => {
  const incoming = new Request("https://site.example", {
    headers: {
      "User-Agent": "Visitor browser",
      "Accept-Language": "de-DE,de;q=0.9",
      "X-Forwarded-For": "192.0.2.66, 192.0.2.67",
      "CF-Connecting-IP": "192.0.2.68",
      Cookie: "private-cookie",
      Authorization: "Bearer private-token",
      Origin: "https://private.example",
      Referer: "https://private.example/path?private=1",
    },
  });
  const metadata = [
    { name: "User-Agent", value: "Visitor browser" },
    { name: "Accept-Language", value: "de-DE,de;q=0.9" },
  ];
  vi.stubGlobal("navigator", { userAgent: "Node.js" });
  expect(getFormSubmissionHeaders(incoming)).toEqual(metadata);
  for (const address of ["203.0.113.9", "2001:db8::9", "::ffff:127.0.0.1"]) {
    expect(getFormSubmissionHeaders(incoming, address)).toEqual([
      ...metadata,
      { name: "X-Forwarded-For", value: address },
    ]);
  }
  for (const address of [
    "",
    "not an IP",
    "192.0.2.1, 192.0.2.2",
    "999.0.0.1",
    "192.0.2.1:80",
  ]) {
    expect(getFormSubmissionHeaders(incoming, address)).toEqual(metadata);
  }
  expect(getFormSubmissionHeaders(new Request("https://site.example"))).toEqual(
    []
  );
  incoming.headers.set("User-Agent", "Cloudflare-Workers");
  expect(getFormSubmissionHeaders(incoming)).toEqual([
    { name: "User-Agent", value: "Cloudflare-Workers" },
    metadata[1],
  ]);
  incoming.headers.set("User-Agent", "Visitor browser");
  vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
  expect(getFormSubmissionHeaders(incoming)).toEqual([
    ...metadata,
    { name: "X-Forwarded-For", value: "192.0.2.68" },
  ]);
  expect(getFormSubmissionHeaders(incoming, "203.0.113.10")).toEqual([
    ...metadata,
    { name: "X-Forwarded-For", value: "203.0.113.10" },
  ]);
  incoming.headers.set("CF-Connecting-IP", "192.0.2.1, 192.0.2.2");
  expect(getFormSubmissionHeaders(incoming)).toEqual(metadata);
  incoming.headers.delete("CF-Connecting-IP");
  expect(getFormSubmissionHeaders(incoming)).toEqual(metadata);
});

test("each webhook gets its visitor headers without changing dependencies, email or configured headers", async () => {
  const configured = [
    { name: "uSeR-aGeNt", value: "Configured integration" },
    { name: "Authorization", value: "Configured credential" },
    { name: "x-FORWARDED-for", value: "192.0.2.40" },
    { name: "accept-LANGUAGE", value: "en" },
  ];
  const graph: ResourceRequestGraph = {
    rootIds: [],
    resources: [
      node("shared"),
      node("first", ["shared"]),
      {
        ...node("second", ["shared"]),
        createRequest: () => ({ ...request("second"), headers: configured }),
      },
    ],
  };
  const received: Request[] = [];
  const capture: typeof fetch = async (input, init) => {
    received.push(new Request(input, init));
    return Response.json({ ok: true });
  };
  for (const visitor of ["first visitor", "second visitor"]) {
    await expect(
      submitFormActions({
        graph,
        resourceIds: ["first", "second"],
        emailRequest: request("email"),
        body: { message: "Hello" },
        baseUrl,
        actionFetch: capture,
        dependencyFetch: capture,
        submissionHeaders: [
          { name: "User-Agent", value: visitor },
          { name: "Accept-Language", value: "fr" },
          { name: "X-Forwarded-For", value: "2001:db8::1" },
        ],
      })
    ).resolves.toEqual({ success: true });
    for (const outgoing of received.splice(0)) {
      const path = new URL(outgoing.url).pathname;
      expect(outgoing.headers.get("user-agent")).toBe(
        path === "/first"
          ? visitor
          : path === "/second"
            ? "Configured integration"
            : null
      );
      expect(outgoing.headers.get("accept-language")).toBe(
        path === "/first" ? "fr" : path === "/second" ? "en" : null
      );
      expect(outgoing.headers.get("x-forwarded-for")).toBe(
        path === "/first"
          ? "2001:db8::1"
          : path === "/second"
            ? "192.0.2.40"
            : null
      );
      if (path === "/second") {
        expect(outgoing.headers.get("authorization")).toBe(
          "Configured credential"
        );
      }
    }
  }
  expect(configured).toEqual([
    { name: "uSeR-aGeNt", value: "Configured integration" },
    { name: "Authorization", value: "Configured credential" },
    { name: "x-FORWARDED-for", value: "192.0.2.40" },
    { name: "accept-LANGUAGE", value: "en" },
  ]);
});
