import { createServer, type IncomingMessage } from "node:http";
import { afterEach, expect, test, vi } from "vitest";
import { stagedUploadPath } from "@webstudio-is/protocol";
import {
  importProjectBundle,
  loadProjectBundleByProjectId,
  parseBuilderUrl,
  uploadAsset,
  type PublishedProjectBundle,
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

const readRequestBody = async (request: IncomingMessage) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

test("imports project bundle through staged upload", async () => {
  const uploadChunks: Buffer[] = [];
  let trpcBody: unknown;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "POST" && url.pathname === stagedUploadPath) {
      response.writeHead(201, {
        Location: `http://${request.headers.host}${stagedUploadPath}/upload-id`,
        "Tus-Resumable": "1.0.0",
      });
      response.end();
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `${stagedUploadPath}/upload-id`
    ) {
      uploadChunks.push(await readRequestBody(request));
      response.writeHead(204, {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(
          uploadChunks.reduce((size, chunk) => size + chunk.byteLength, 0)
        ),
      });
      response.end();
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/trpc/build.importProjectBundle"
    ) {
      trpcBody = JSON.parse((await readRequestBody(request)).toString("utf8"));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([{ result: { data: { version: 2 } } }]));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server address is unavailable");
    }

    await expect(
      importProjectBundle({
        authToken: "token",
        origin: `http://127.0.0.1:${address.port}`,
        projectId: "project-id",
        data: {
          largeContent: "x".repeat(3 * 1024 * 1024 + 1),
        } as unknown as PublishedProjectBundle,
      })
    ).resolves.toEqual({ version: 2 });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  expect(uploadChunks).toHaveLength(2);
  expect(JSON.stringify(trpcBody)).toContain('"uploadId":"upload-id"');
  expect(JSON.stringify(trpcBody)).not.toContain("largeContent");
});

test("rejects project bundles over the import size limit", async () => {
  let requestCount = 0;
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(500);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server address is unavailable");
    }

    await expect(
      importProjectBundle({
        authToken: "token",
        origin: `http://127.0.0.1:${address.port}`,
        projectId: "project-id",
        data: {
          largeContent: "x".repeat(20 * 1024 * 1024),
        } as unknown as PublishedProjectBundle,
      })
    ).rejects.toThrow(
      "Project bundle is too large to import. Maximum size is 20 MiB."
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  expect(requestCount).toBe(0);
});
