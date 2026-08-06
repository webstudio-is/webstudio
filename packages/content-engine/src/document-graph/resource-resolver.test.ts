import { describe, expect, test, vi } from "vitest";
import {
  createImmediateResource,
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
  test("uses immediate documents as dependencies without a separate value path", async () => {
    const result = await resolveResources({
      resources: [
        createImmediateResource<unknown>({ id: "answer", document: 21 }),
        resource("doubled", ["answer"], ({ documents }) =>
          Promise.resolve(Number(documents.get("answer")) * 2)
        ),
      ],
      rootIds: ["doubled"],
      concurrency: 1,
    });

    expect(result.roots).toEqual([42]);
    expect(result.documents).toEqual(
      new Map([
        ["answer", 21],
        ["doubled", 42],
      ])
    );
  });

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
});
