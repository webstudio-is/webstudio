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

test("reports when a listening preview keeps returning server errors", async () => {
  const fetch = vi.fn(async () => new Response("failed", { status: 500 }));

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      { timeoutMs: 1, intervalMs: 5 },
      createDependencies({ fetch })
    )
  ).rejects.toMatchObject({
    code: "PREVIEW_HTTP_ERROR",
    issues: [
      {
        code: "preview_http_error",
        path: [],
        constraint: "http_status:500",
      },
    ],
  });
});

test.each([
  [
    "ECONNREFUSED",
    "preview_connection_refused",
    "preview_accepts_http_connections",
  ],
  [
    "EPERM",
    "preview_connection_permission_denied",
    "runtime_allows_local_tcp_connect",
  ],
  [
    "UND_ERR_CONNECT_TIMEOUT",
    "preview_connection_timeout",
    "preview_http_request_completes",
  ],
  ["EHOSTUNREACH", "preview_request_failed", "preview_http_request_succeeds"],
])(
  "reports the preview readiness request failure for %s",
  async (causeCode, issueCode, constraint) => {
    const fetchError = Object.assign(new TypeError("fetch failed: secret"), {
      cause: Object.assign(new Error("connect failed: secret"), {
        code: causeCode,
      }),
    });
    const fetch = vi.fn(async () => {
      throw fetchError;
    });

    let readinessError: unknown;
    try {
      await waitForPreviewReady(
        "http://127.0.0.1:5173/",
        { timeoutMs: 1, intervalMs: 5 },
        createDependencies({ fetch })
      );
    } catch (error) {
      readinessError = error;
    }

    expect(readinessError).toMatchObject({
      code: "PREVIEW_READINESS_FAILED",
      issues: [{ code: issueCode, path: [], constraint }],
    });
    expect(readinessError).toBeInstanceOf(Error);
    expect((readinessError as Error).message).not.toContain("secret");
  }
);

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
