import { expect, test, vi } from "vitest";
import { waitForPreviewReady } from "./readiness";
import { createDependencies } from "./test-utils";

test("waits for preview server readiness", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("not ready"))
    .mockResolvedValueOnce(new Response("", { status: 200 }));
  const sleep = vi.fn(async () => undefined);

  await waitForPreviewReady(
    "http://127.0.0.1:5173/",
    { timeoutMs: 1000, intervalMs: 5 },
    createDependencies({ fetch, sleep })
  );

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(5);
});

test("waits until the latest preview build asset is served", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response('<link rel="stylesheet" href="/assets/index-old.css" />', {
        status: 200,
      })
    )
    .mockResolvedValueOnce(
      new Response('<link rel="stylesheet" href="/assets/index-new.css" />', {
        status: 200,
      })
    );
  const sleep = vi.fn(async () => undefined);

  await waitForPreviewReady(
    "http://127.0.0.1:5173/",
    {
      timeoutMs: 1000,
      intervalMs: 5,
      requiredAssetNames: ["index-new.css"],
    },
    createDependencies({ fetch, sleep })
  );

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(5);
});

test("requires the exact generated project even when build assets match", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        '<html data-ws-project="other-project"><link rel="stylesheet" href="/assets/index-new.css" /></html>',
        { status: 200 }
      )
  );

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1,
        intervalMs: 5,
        requiredAssetNames: ["index-new.css"],
        requiredProject: { projectId: "expected-project" },
      },
      createDependencies({ fetch })
    )
  ).rejects.toThrow(
    "Preview server at http://127.0.0.1:5173/ did not serve the expected generated project."
  );
});

test("accepts the generated preview with the expected project marker", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        '<html data-ws-project="expected-project"><link rel="stylesheet" href="/assets/index-new.css" /></html>',
        { status: 200 }
      )
  );

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1000,
        requiredAssetNames: ["index-new.css"],
        requiredProject: { projectId: "expected-project" },
      },
      createDependencies({ fetch })
    )
  ).resolves.toBeUndefined();
});

test("uses the static identity marker when page authentication blocks readiness", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
    .mockResolvedValueOnce(Response.json({ projectId: "project", version: 5 }));

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1000,
        requiredProject: { projectId: "project", version: 5 },
      },
      createDependencies({ fetch })
    )
  ).resolves.toBeUndefined();
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    new URL("http://127.0.0.1:5173/__webstudio/preview.json"),
    expect.objectContaining({ method: "GET" })
  );
});

test("waits for the exact generated session version", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        '<html data-ws-project="project" data-ws-version="4"></html>'
      )
    )
    .mockResolvedValueOnce(
      new Response(
        '<html data-ws-project="project" data-ws-version="5"></html>'
      )
    );

  await waitForPreviewReady(
    "http://127.0.0.1:5173/",
    {
      timeoutMs: 1000,
      intervalMs: 5,
      requiredProject: { projectId: "project", version: 5 },
    },
    createDependencies({ fetch })
  );

  expect(fetch).toHaveBeenCalledTimes(2);
});

test("rejects stale preview servers that serve a previous build", async () => {
  const fetch = vi.fn(
    async () =>
      new Response('<link rel="stylesheet" href="/assets/index-old.css" />', {
        status: 200,
      })
  );

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1,
        intervalMs: 5,
        requiredAssetNames: ["index-new.css"],
      },
      createDependencies({ fetch })
    )
  ).rejects.toThrow(
    "Preview server at http://127.0.0.1:5173/ did not serve the latest build assets."
  );
});
