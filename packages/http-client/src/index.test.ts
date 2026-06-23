import { afterEach, expect, test, vi } from "vitest";
import {
  loadProjectBundleByProjectId,
  parseBuilderUrl,
  uploadAsset,
} from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("parseBuilderUrl wstd.dev", async () => {
  expect(
    parseBuilderUrl("https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.wstd.dev")
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://wstd.dev",
    }
  `);
});

test("parseBuilderUrl localhost", async () => {
  expect(
    parseBuilderUrl("https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.localhost")
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://localhost",
    }
  `);
});

test("parseBuilderUrl localhost", async () => {
  expect(parseBuilderUrl("https://p-eee.localhost")).toMatchInlineSnapshot(`
    {
      "projectId": undefined,
      "sourceOrigin": "https://p-eee.localhost",
    }
  `);
});

test("parseBuilderUrl development.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.development.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://development.webstudio.is",
    }
  `);
});

test("parseBuilderUrl main.development.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb-dot-main.development.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://main.development.webstudio.is",
    }
  `);
});

test("parseBuilderUrl branch.development.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb-dot-branch.development.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
{
  "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
  "sourceOrigin": "https://branch.development.webstudio.is",
}
`);
});

test("parseBuilderUrl apps.webstudio.is", async () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is"
    )
  ).toMatchInlineSnapshot(`
    {
      "projectId": "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      "sourceOrigin": "https://apps.webstudio.is",
    }
  `);
});

test("parseBuilderUrl apps.webstudio.is", async () => {
  expect(parseBuilderUrl("https://apps.webstudio.is")).toMatchInlineSnapshot(`
    {
      "projectId": undefined,
      "sourceOrigin": "https://apps.webstudio.is",
    }
  `);
});

test("reports non-json api responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<html>\n<h1>Request Entity Too Large</h1>", {
        status: 413,
        statusText: "Payload Too Large",
        headers: {
          "content-type": "text/html",
        },
      })
    )
  );

  let message;
  try {
    await loadProjectBundleByProjectId({
      authToken: "token",
      origin:
        "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
      projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  expect(message).toContain(
    "API returned text/html instead of JSON from https://apps.webstudio.is/trpc"
  );
  expect(message).toContain("HTTP status: 413 Payload Too Large.");
  expect(message).toContain(
    "Response preview: <html> <h1>Request Entity Too Large</h1>"
  );
  expect(message).toContain("The request may be too large for the API.");
});

test("uploads assets as binary requests", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
      },
    })
  );
  vi.stubGlobal("fetch", fetch);

  const file = new Uint8Array([1, 2, 3]);
  await uploadAsset({
    authToken: "token",
    origin: "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
    projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
    upload: {
      asset: {
        id: "asset-id",
        projectId: "source-project",
        type: "image",
        name: "image.png",
        filename: "image.png",
        format: "png",
        size: 3,
        meta: { width: 10, height: 20 },
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      data: file,
    },
  });

  expect(fetch).toHaveBeenCalledOnce();
  const [url, init] = fetch.mock.calls[0] as [URL, RequestInit];
  expect(url.href).toBe(
    "https://apps.webstudio.is/rest/assets/image.png?projectId=090e6e14-ae50-4b2e-bd22-71733cec05bb&type=image&width=10&height=20&format=png"
  );
  expect(init.method).toBe("POST");
  expect(init.body).toBe(file);
  expect(init.headers).toBeInstanceOf(Headers);
  expect((init.headers as Headers).get("x-auth-token")).toBe("token");
  expect((init.headers as Headers).get("content-type")).toBe(
    "application/octet-stream"
  );
});

test("reports asset upload errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: "Upload failed" }), {
        headers: {
          "content-type": "application/json",
        },
      })
    )
  );

  await expect(
    uploadAsset({
      authToken: "token",
      origin:
        "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
      projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      upload: {
        asset: {
          id: "asset-id",
          projectId: "source-project",
          type: "file",
          name: "document.pdf",
          format: "pdf",
          size: 3,
          meta: {},
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        data: new Uint8Array([1, 2, 3]),
      },
    })
  ).rejects.toThrow("Upload failed");
});
