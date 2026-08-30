import { describe, expect, test, vi } from "vitest";
import {
  ResourceResolutionError,
  resolveResources,
  type Resource,
} from "./resource-resolver";

const resource = (
  id: string,
  dependencies: readonly string[],
  resolve: Resource<unknown>["resolve"]
): Resource<unknown> => ({ id, dependencies, resolve });

describe("resource resolver", () => {
  test("resolves only the requested closure and shares dependency documents", async () => {
    const calls: string[] = [];
    let active = 0;
    let maximumActive = 0;
    const resources = [
      resource("source", [], async () => {
        calls.push("source");
        return "source document";
      }),
      resource("first", ["source"], async ({ documents }) => {
        calls.push("first");
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
        return `${documents.get("source")}:first`;
      }),
      resource("second", ["source"], async ({ documents }) => {
        calls.push("second");
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
        return `${documents.get("source")}:second`;
      }),
      resource("unused", [], async () => {
        calls.push("unused");
        return "unused document";
      }),
    ];

    const result = await resolveResources({
      resources,
      rootIds: ["first", "second"],
      concurrency: 2,
    });

    expect(result.roots).toEqual([
      "source document:first",
      "source document:second",
    ]);
    expect(result.documents).toEqual(
      new Map([
        ["source", "source document"],
        ["first", "source document:first"],
        ["second", "source document:second"],
      ])
    );
    expect(calls.filter((id) => id === "source")).toHaveLength(1);
    expect(calls).not.toContain("unused");
    expect(maximumActive).toBe(2);
  });

  test("rejects a reachable missing dependency", async () => {
    await expect(
      resolveResources({
        resources: [resource("root", ["missing"], async () => "root")],
        rootIds: ["root"],
        concurrency: 1,
      })
    ).rejects.toMatchObject({
      code: "DEPENDENCY_NOT_FOUND",
      resourceIds: ["root", "missing"],
    } satisfies Partial<ResourceResolutionError>);
  });

  test("rejects dependency cycles before resolving resources", async () => {
    const resolve = vi.fn(async () => "document");

    await expect(
      resolveResources({
        resources: [
          resource("first", ["second"], resolve),
          resource("second", ["first"], resolve),
        ],
        rootIds: ["first"],
        concurrency: 1,
      })
    ).rejects.toMatchObject({
      code: "CYCLE",
      resourceIds: ["first", "second", "first"],
    } satisfies Partial<ResourceResolutionError>);
    expect(resolve).not.toHaveBeenCalled();
  });

  test("wraps resolution failures with resource context", async () => {
    await expect(
      resolveResources({
        resources: [
          resource("root", [], async () => {
            throw new Error("offline");
          }),
        ],
        rootIds: ["root"],
        concurrency: 1,
      })
    ).rejects.toMatchObject({
      code: "RESOLUTION_FAILED",
      resourceIds: ["root"],
    } satisfies Partial<ResourceResolutionError>);
  });

  test("reports the dependency path and original cause", async () => {
    const failure = new Error("offline");
    const resolution = resolveResources({
      resources: [
        resource("root", ["middle"], async () => "root"),
        resource("middle", ["leaf"], async () => "middle"),
        resource("leaf", [], async () => {
          throw failure;
        }),
      ],
      rootIds: ["root"],
      concurrency: 1,
    });

    await expect(resolution).rejects.toMatchObject({
      code: "RESOLUTION_FAILED",
      resourceIds: ["root", "middle", "leaf"],
      cause: failure,
    } satisfies Partial<ResourceResolutionError>);
  });

  test("passes cancellation to resource resolution", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const resolve = vi.fn(async () => "document");

    await expect(
      resolveResources({
        resources: [resource("root", [], resolve)],
        rootIds: ["root"],
        concurrency: 1,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({
      code: "REQUEST_CANCELLED",
      resourceIds: [],
    } satisfies Partial<ResourceResolutionError>);
    expect(resolve).not.toHaveBeenCalled();
  });

  test("rejects when cancelled while a resource is resolving", async () => {
    const controller = new AbortController();
    let finish = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const resolution = resolveResources({
      resources: [
        resource(
          "root",
          [],
          () =>
            new Promise<string>((resolve) => {
              finish = () => resolve("document");
              markStarted();
            })
        ),
      ],
      rootIds: ["root"],
      concurrency: 1,
      signal: controller.signal,
    });

    await started;
    controller.abort(new Error("cancelled"));
    finish();

    await expect(resolution).rejects.toMatchObject({
      code: "REQUEST_CANCELLED",
    } satisfies Partial<ResourceResolutionError>);
  });

  test("cancels without waiting for a resource implementation to settle", async () => {
    const controller = new AbortController();
    let finish = () => {};
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const resolution = resolveResources({
      resources: [
        resource(
          "root",
          [],
          () =>
            new Promise<string>((resolve) => {
              finish = () => resolve("document");
              markStarted();
            })
        ),
      ],
      rootIds: ["root"],
      concurrency: 1,
      signal: controller.signal,
    });
    const outcome = resolution.then(
      () => "resolved",
      (error) => error
    );

    await started;
    controller.abort(new Error("cancelled"));

    await expect(
      Promise.race([
        outcome,
        new Promise((resolve) =>
          setTimeout(() => resolve("still pending"), 20)
        ),
      ])
    ).resolves.toMatchObject({
      code: "REQUEST_CANCELLED",
    } satisfies Partial<ResourceResolutionError>);
    finish();
    await outcome;
  });
});
