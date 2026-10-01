import { expect, test, vi } from "vitest";
import { submitFormActions } from "./form-actions";
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
