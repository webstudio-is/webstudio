import { describe, expect, test, vi } from "vitest";
import {
  AssetContentAuthorizationError,
  AssetRevisionConflictError,
} from "@webstudio-is/asset-uploader/content-repository";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import {
  createHttpAssetContentRepository,
  getMdxContentPersistencePlan,
} from "./mdx-content-repository";

const asset = {
  id: "asset-1",
  projectId: "project-1",
  name: "article_revision.mdx",
  type: "file" as const,
  format: "mdx",
  size: 7,
  createdAt: "2026-08-15T00:00:00.000Z",
};

const collect = async (data: AsyncIterable<Uint8Array>) => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of data) {
    chunks.push(chunk);
  }
  return new Uint8Array(chunks.flatMap((chunk) => Array.from(chunk.values())));
};

describe("HTTP MDX content repository", () => {
  test("returns content and exact revision identity from one response", async () => {
    const request = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        new Response("# Hello", {
          headers: {
            "content-length": "7",
            [assetContentDescriptorHeader]:
              serializeAssetContentDescriptor(asset),
          },
        })
      )
    );
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      authToken: () => "token",
      request,
    });

    const content = await repository.readContent({ assetId: asset.id });

    expect(content.asset).toEqual(asset);
    expect(content.contentLength).toBe(7);
    expect(new TextDecoder().decode(await collect(content.data))).toBe(
      "# Hello"
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(
      new Headers(request.mock.calls[0]?.[1]?.headers).get("x-auth-token")
    ).toBe("token");
  });

  test("rejects content without the identity of the streamed revision", async () => {
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request: async () => new Response("# Hello"),
    });

    await expect(repository.readContent({ assetId: asset.id })).rejects.toThrow(
      "missing its revision identity"
    );
  });

  test.each([
    [{ ...asset, id: "other" }, "requested Asset"],
    [{ ...asset, projectId: "other" }, "requested Asset"],
  ])("rejects substituted content identity %#", async (descriptor, message) => {
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request: async () =>
        new Response("# Hello", {
          headers: {
            [assetContentDescriptorHeader]:
              serializeAssetContentDescriptor(descriptor),
          },
        }),
    });

    await expect(repository.readContent({ assetId: asset.id })).rejects.toThrow(
      message
    );
  });

  test("requires a partial response for a ranged read", async () => {
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request: async () =>
        new Response("Hell", {
          headers: {
            [assetContentDescriptorHeader]:
              serializeAssetContentDescriptor(asset),
          },
        }),
    });

    await expect(
      repository.readContent({
        assetId: asset.id,
        range: { offset: 2, length: 4 },
      })
    ).rejects.toThrow("unexpected status 200");
  });

  test("rejects an oversized full-file descriptor before exposing its body", async () => {
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request: async () =>
        new Response("body", {
          headers: {
            [assetContentDescriptorHeader]: serializeAssetContentDescriptor({
              ...asset,
              size: contentEngineLimits.hydratedFileBytes + 1,
            }),
          },
        }),
    });

    await expect(repository.readContent({ assetId: asset.id })).rejects.toThrow(
      "exceeds the MDX editing limit"
    );
  });

  test.each([
    [403, AssetContentAuthorizationError],
    [409, AssetRevisionConflictError],
  ])(
    "maps HTTP %s to the shared repository error",
    async (status, ErrorType) => {
      const repository = createHttpAssetContentRepository({
        projectId: asset.projectId,
        origin: "https://webstudio.is",
        request: async () =>
          new Response(JSON.stringify({ errors: "Denied" }), {
            status,
            headers: { "content-type": "application/json" },
          }),
      });

      await expect(
        repository.readContent({ assetId: asset.id })
      ).rejects.toThrow(ErrorType);
    }
  );

  test("updates with the pinned storage name and returns the next identity", async () => {
    const next = { ...asset, name: "article_next.mdx", size: 4 };
    const request = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.method).toBe("PUT");
      expect(await new Response(init?.body).text()).toBe("next");
      return new Response(JSON.stringify({ asset: next }), {
        headers: { "content-type": "application/json" },
      });
    });
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request,
    });

    await expect(
      repository.updateContent({
        assetId: asset.id,
        expectedName: asset.name,
        data: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("next"));
            controller.close();
          },
        }),
      })
    ).resolves.toEqual(next);

    const url = request.mock.calls[0]?.[0];
    expect(new URL(String(url)).searchParams.get("expectedName")).toBe(
      asset.name
    );
  });

  test("bounds update buffering before making a request", async () => {
    const request = vi.fn<typeof fetch>();
    let cancelled = false;
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request,
    });

    await expect(
      repository.updateContent({
        assetId: asset.id,
        expectedName: asset.name,
        data: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new Uint8Array(contentEngineLimits.hydratedFileBytes + 1)
            );
          },
          cancel() {
            cancelled = true;
          },
        }),
      })
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    expect(cancelled).toBe(true);
  });

  test("rejects a substituted identity after update", async () => {
    const repository = createHttpAssetContentRepository({
      projectId: asset.projectId,
      origin: "https://webstudio.is",
      request: async () =>
        new Response(JSON.stringify({ asset: { ...asset, id: "other" } }), {
          headers: { "content-type": "application/json" },
        }),
    });

    await expect(
      repository.updateContent({
        assetId: asset.id,
        expectedName: asset.name,
        data: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("next"));
            controller.close();
          },
        }),
      })
    ).rejects.toThrow("requested Asset");
  });
});

describe("MDX content persistence capability", () => {
  const prepared = (projectChanges: number, storageWrites: number) =>
    ({
      status: "prepared",
      projectPayload: Array.from({ length: projectChanges }, () => ({})),
      storageWrites: Array.from({ length: storageWrites }, () => ({})),
    }) as never;

  test.each([
    [0, 0, { status: "ready", mode: "noop" }],
    [1, 0, { status: "ready", mode: "project" }],
    [0, 1, { status: "ready", mode: "single-asset" }],
    [
      1,
      1,
      {
        status: "blocked",
        reason: "atomic-project-and-asset-unavailable",
      },
    ],
    [0, 2, { status: "blocked", reason: "atomic-multiple-assets-unavailable" }],
  ] as const)(
    "plans %s project and %s storage changes without overstating atomicity",
    (projectChanges, storageWrites, expected) => {
      expect(
        getMdxContentPersistencePlan(prepared(projectChanges, storageWrites))
      ).toEqual(expected);
    }
  );
});
