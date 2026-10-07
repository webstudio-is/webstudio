import { createServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { build } from "esbuild";
import { beforeEach, expect, test, vi } from "vitest";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import * as projectApi from "@webstudio-is/project/index.server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";
import { action } from "../routes/rest.preview-form";

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  authorizeProject: { hasProjectPermit: vi.fn() },
}));
vi.mock("@webstudio-is/project/index.server", () => ({ loadById: vi.fn() }));
vi.mock("@webstudio-is/project-build/server", () => ({
  loadDevBuildByProjectId: vi.fn(),
}));
vi.mock("@webstudio-is/sdk/protected-resource-fetch-node", () => ({
  createNodeProtectedResourceFetch: vi.fn(),
}));
vi.mock("~/shared/context.server", () => ({ createContext: vi.fn() }));
vi.mock("~/services/no-cross-origin-cookie", () => ({
  preventCrossOriginCookie: vi.fn(),
}));
vi.mock("~/services/csrf-session.server", () => ({ checkCsrf: vi.fn() }));
vi.mock("~/env/env.server", () => ({
  default: {
    PUBLISHER_HOST: "wstd.work",
    TRPC_SERVER_API_TOKEN: "server-only-test-token",
  },
}));

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const require = createRequire(import.meta.url);
const request = (file?: File, headers?: HeadersInit) => {
  const url = new URL(
    `https://p-${projectId}.localhost/rest/preview-form?path=%2Fcontact`
  );
  const formData = new FormData();
  formData.set("ws--managed-form-id", "form");
  formData.set("ws--managed-form-array-names", "[]");
  formData.set("ws--form-bot", Date.now().toString(16));
  formData.set("email", "ada@example.com");
  if (file) {
    formData.set("attachment", file);
  }
  return new Request(url, { method: "POST", body: formData, headers });
};

const draftBuild = {
  pages: {
    homePageId: "page",
    rootFolderId: "root",
    pages: new Map([
      [
        "page",
        { id: "page", path: "/contact", rootInstanceId: "root-instance" },
      ],
    ]),
    folders: new Map([["root", { id: "root", slug: "", children: ["page"] }]]),
  },
  instances: [
    {
      type: "instance",
      id: "root-instance",
      component: "Body",
      children: [{ type: "id", value: "form" }],
    },
    { type: "instance", id: "form", component: "NativeForm", children: [] },
  ],
  props: [
    {
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: [{ dataSourceId: "destination", enabled: true }],
    },
  ],
  dataSources: [
    {
      id: "destination",
      type: "resource",
      scopeInstanceId: "form",
      resourceId: "webhook",
      name: "webhook",
    },
    {
      id: "formData",
      type: "parameter",
      scopeInstanceId: "form",
      name: "formData",
    },
  ],
  resources: [
    {
      id: "webhook",
      name: "webhook",
      method: "post",
      url: '"https://example.com/contact"',
      headers: [],
      body: "({ email: $ws$dataSource$formData.email })",
    },
  ],
  projectSettings: { meta: { contactEmail: "team@example.com" } },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createContext).mockResolvedValue({
    authorization: { type: "user" },
  } as never);
  vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(true);
  vi.mocked(projectApi.loadById).mockResolvedValue({
    domain: "site",
    userId: null,
    latestBuildVirtual: null,
  } as never);
  const resourceFetch = Object.assign(
    vi.fn(async () => Response.json({ accepted: true }, { status: 201 })),
    { validateDestination: vi.fn() }
  );
  vi.mocked(createNodeProtectedResourceFetch).mockReturnValue(
    resourceFetch as never
  );
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue(draftBuild as never);
});

test("a user without project build permission cannot execute Preview actions", async () => {
  vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(false);
  await expect(action({ request: request() } as never)).rejects.toMatchObject({
    status: 403,
  });
  expect(loadDevBuildByProjectId).not.toHaveBeenCalled();
  expect(createNodeProtectedResourceFetch).not.toHaveBeenCalled();
});

test("an unauthenticated request cannot load the project draft", async () => {
  vi.mocked(createContext).mockResolvedValue({
    authorization: { type: "anonymous" },
  } as never);
  await expect(action({ request: request() } as never)).rejects.toMatchObject({
    status: 401,
  });
  expect(authorizeProject.hasProjectPermit).not.toHaveBeenCalled();
  expect(loadDevBuildByProjectId).not.toHaveBeenCalled();
});

test("a cross-origin request cannot reach project authorization or actions", async () => {
  const { preventCrossOriginCookie } =
    await import("~/services/no-cross-origin-cookie");
  vi.mocked(preventCrossOriginCookie).mockImplementationOnce(() => {
    throw new Response("Cross-origin request", { status: 403 });
  });
  await expect(action({ request: request() } as never)).rejects.toMatchObject({
    status: 403,
  });
  expect(createContext).not.toHaveBeenCalled();
  expect(createNodeProtectedResourceFetch).not.toHaveBeenCalled();
});

test("an unpublished project's current draft executes its HTTP Resource", async () => {
  const response = await action({ request: request() } as never);
  const result = (await response.json()) as {
    success: boolean;
    results: Array<{ status: number; body: unknown }>;
  };
  expect(result).toMatchObject({
    success: true,
    results: [{ status: 201, body: { accepted: true } }],
  });
  const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value;
  expect(resourceFetch).toHaveBeenCalledWith(expect.any(Request));
  const outgoing = resourceFetch.mock.calls[0][0] as Request;
  expect(outgoing.url).toContain("https://example.com/contact");
  expect(outgoing.method).toBe("POST");
  expect(loadDevBuildByProjectId).toHaveBeenCalledWith(
    expect.anything(),
    projectId
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
});

test.each([false, true])(
  "a Preview Form reaches the Builder action over local HTTP after pending saves: %s",
  async (delayedSave) => {
    const appSource = new URL("../", import.meta.url).pathname;
    const componentSource = new URL(
      "../../../../packages/sdk-components-react/src",
      import.meta.url
    ).pathname;
    const sharedBuildOptions = {
      bundle: true,
      write: false,
      format: "iife" as const,
      platform: "browser" as const,
      target: "es2022",
      conditions: ["webstudio", "browser"],
      define: {
        "process.env.NODE_ENV": '"development"',
        "import.meta.env": '{"GITHUB_SHA":"local"}',
      },
    };
    const [parentBundle, canvasBundle] = await Promise.all([
      build({
        ...sharedBuildOptions,
        stdin: {
          contents: `
          import { createElement, useEffect } from "react";
          import { createRoot } from "react-dom/client";
          import { usePublish } from "~/shared/pubsub";
          import { updateCsrfToken } from "~/shared/csrf.client";
          import { $authToken } from "~/shared/nano-states/misc";
          import { subscribePreviewFormRequests } from "~/shared/preview-form-parent";

          import { draftPersistence } from "~/shared/sync/draft-persistence";
          import { parseBuilderUrl } from "@webstudio-is/protocol";
          const projectId = parseBuilderUrl(window.location.href).projectId;
          draftPersistence.reset(projectId);
          if (${delayedSave}) draftPersistence.begin(projectId, "draft-edit");
          window.finishDraftSave = () => draftPersistence.complete(projectId, "draft-edit", true);
          updateCsrfToken("local-test-csrf");
          $authToken.set("local-test-auth");
          const App = () => {
            const [publish, iframeRef] = usePublish();
            useEffect(() => subscribePreviewFormRequests(publish), [publish]);
            return createElement("iframe", { ref: iframeRef, src: "/canvas", title: "Canvas" });
          };
          createRoot(document.getElementById("root")).render(createElement(App));
        `,
          resolveDir: appSource,
          sourcefile: "preview-parent-entry.tsx",
          loader: "tsx",
        },
        alias: { "~": appSource },
      }),
      build({
        ...sharedBuildOptions,
        stdin: {
          contents: `
          import { createElement } from "react";
          import { createRoot } from "react-dom/client";
          import { NativeForm } from "./native-form";
          import { submitPreviewForm } from "~/shared/preview-form-bridge";

          createRoot(document.getElementById("root")).render(
            createElement(NativeForm, {
              "data-ws-managed-form-id": "form",
              action: [{ dataSourceId: "destination", enabled: true }],
              onManagedSubmit: (values, signal) => submitPreviewForm({
                values,
                managedFormId: "form",
                path: "/contact",
                signal,
              }),
            },
              createElement("input", { name: "email", defaultValue: "ada@example.com" }),
              createElement("button", { type: "submit" }, "Submit Preview")
            )
          );
        `,
          resolveDir: componentSource,
          sourcefile: "preview-canvas-entry.tsx",
          loader: "tsx",
        },
        alias: { "~": appSource },
      }),
    ]);
    const getScript = (result: Awaited<ReturnType<typeof build>>) => {
      const script = result.outputFiles?.[0]?.text;
      if (script === undefined) {
        throw new Error("Preview test bundle was not generated");
      }
      return script;
    };
    const parentScript = getScript(parentBundle);
    const canvasScript = getScript(canvasBundle);
    const send = vi.fn(async () => Response.json({ id: "sent" }));
    if (delayedSave) {
      vi.stubGlobal("fetch", send);
    }
    const requests: string[] = [];
    let receivedHeaders: { auth?: string; csrf?: string } | undefined;
    let submittedFormData: FormData | undefined;
    let routeError: unknown;
    const server = createServer(async (request, response) => {
      if (request.url?.startsWith("/rest/preview-form?")) {
        try {
          requests.push(request.method ?? "");
          receivedHeaders = {
            auth: String(request.headers["x-auth-token"] ?? ""),
            csrf: String(request.headers["x-csrf-token"] ?? ""),
          };
          const chunks: Buffer[] = [];
          for await (const chunk of request) {
            chunks.push(Buffer.from(chunk));
          }
          const incoming = new Request(
            `http://${request.headers.host}${request.url}`,
            {
              method: request.method,
              headers: request.headers as HeadersInit,
              body: Buffer.concat(chunks),
            }
          );
          submittedFormData = await incoming.clone().formData();
          const routeResponse = await action({ request: incoming } as never);
          response.writeHead(routeResponse.status, {
            "content-type":
              routeResponse.headers.get("content-type") ?? "application/json",
            "cache-control":
              routeResponse.headers.get("cache-control") ?? "no-store",
          });
          response.end(Buffer.from(await routeResponse.arrayBuffer()));
        } catch (error) {
          routeError = error;
          response.writeHead(500, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              success: false,
              status: 500,
              results: [],
              errors: [
                { status: 500, body: null, message: "Local route failed" },
              ],
            })
          );
        }
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        request.url === "/canvas"
          ? `<div id="root"></div><script>${canvasScript}</script>`
          : `<div id="root"></div><script>${parentScript}</script>`
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = server.address() as AddressInfo;
    const url = `http://p-${projectId}.localhost:${port}`;
    const { chromium } = require("playwright") as typeof import("playwright");
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      const pageErrors: Error[] = [];
      page.on("pageerror", (error) => pageErrors.push(error));
      await page.goto(url);
      const canvas = page.frameLocator('iframe[title="Canvas"]');
      await canvas.getByRole("button", { name: "Submit Preview" }).click();
      if (delayedSave) {
        await canvas.locator('form[aria-busy="true"]').waitFor();
        expect(requests).toEqual([]);
        expect(loadDevBuildByProjectId).not.toHaveBeenCalled();
        // Model the database commit before the durable acknowledgment reaches Builder.
        vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
          ...draftBuild,
          props: [
            {
              ...draftBuild.props[0],
              value: [{ dataSourceId: "new-email", enabled: true }],
            },
          ],
          dataSources: [
            {
              id: "new-email",
              type: "resource",
              scopeInstanceId: "form",
              resourceId: "email",
              name: "Updated email",
            },
          ],
          resources: [
            {
              id: "email",
              name: "Updated email",
              control: "email",
              method: "post",
              url: '""',
              headers: [],
              email: { body: '"Updated draft body"' },
            },
          ],
          projectSettings: { meta: { contactEmail: "updated@example.com" } },
        } as never);
        await page.evaluate("window.finishDraftSave()");
      }
      await canvas
        .locator('form[data-state="success"], form[data-state="error"]')
        .waitFor();

      expect(requests).toEqual(["POST"]);
      expect(receivedHeaders).toEqual({
        auth: "local-test-auth",
        csrf: "local-test-csrf",
      });
      expect(pageErrors).toEqual([]);
      expect(routeError).toBeUndefined();
      expect(await canvas.locator("form").getAttribute("data-state")).toBe(
        "success"
      );
      expect(submittedFormData?.get("email")).toBe("ada@example.com");
      expect(submittedFormData?.get("ws--managed-form-id")).toBe("form");
      expect(createContext).toHaveBeenCalledOnce();
      expect(loadDevBuildByProjectId).toHaveBeenCalledWith(
        expect.anything(),
        projectId
      );
      const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
        .results[0].value;
      if (delayedSave) {
        expect(resourceFetch).not.toHaveBeenCalled();
        expect(send).toHaveBeenCalledOnce();
        const message = JSON.parse(
          String(
            (send.mock.calls[0] as unknown as [unknown, RequestInit])[1].body
          )
        );
        expect(message.to).toEqual([{ address: "updated@example.com" }]);
        expect(message.text).toContain("Updated draft body");
      } else {
        expect(resourceFetch).toHaveBeenCalledWith(expect.any(Request));
        expect((resourceFetch.mock.calls[0][0] as Request).url).toContain(
          "https://example.com/contact"
        );
      }
    } finally {
      vi.unstubAllGlobals();
      await browser?.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
  30_000
);

test("Preview returns JSON when Remix's Response has no static json method", async () => {
  vi.mocked(createNodeProtectedResourceFetch).mockReturnValue(
    Object.assign(
      vi.fn(async () => new Response('{"accepted":true}', { status: 201 })),
      { validateDestination: vi.fn() }
    ) as never
  );
  const originalResponse = globalThis.Response;
  vi.stubGlobal(
    "Response",
    new Proxy(originalResponse, {
      get: (target, property, receiver) =>
        property === "json"
          ? undefined
          : Reflect.get(target, property, receiver),
    })
  );
  try {
    const success = await action({ request: request() } as never);
    expect(success.status).toBe(200);
    expect(success.headers.get("content-type")).toContain("application/json");
    expect(success.headers.get("cache-control")).toContain("no-store");
    expect(await success.json()).toMatchObject({ success: true, errors: [] });

    const invalid = request();
    const formData = await invalid.formData();
    formData.delete("ws--form-bot");
    const failure = await action({
      request: new Request(invalid.url, { method: "POST", body: formData }),
    } as never);
    expect(failure.status).toBe(400);
    expect(await failure.json()).toMatchObject({
      success: false,
      errors: [{ message: "Form bot field not found" }],
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

const expiredBotValue = (Date.now() - 6 * 60 * 1000).toString(16);

test.each([
  [undefined, "Form bot field not found"],
  ["jsdom", "Form bot value invalid jsdom"],
  [expiredBotValue, `Form bot value invalid ${expiredBotValue}`],
])(
  "Preview rejects invalid bot field %s before Resource egress",
  async (value, message) => {
    const validRequest = request();
    const formData = await validRequest.formData();
    formData.delete("ws--form-bot");
    if (value !== undefined) {
      formData.set("ws--form-bot", value);
    }
    const response = await action({
      request: new Request(validRequest.url, {
        method: "POST",
        body: formData,
      }),
    } as never);
    expect(await response.json()).toMatchObject({
      success: false,
      status: 400,
      errors: [{ message }],
    });
    expect(
      vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
    ).not.toHaveBeenCalled();
  }
);

test("Preview uses changed draft Resource settings without republishing", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [
      { ...draftBuild.resources[0], url: '"https://new.example/updated"' },
    ],
  } as never);
  const response = await action({ request: request() } as never);
  expect(((await response.json()) as { success: boolean }).success).toBe(true);
  const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value;
  expect(resourceFetch).toHaveBeenCalledWith(expect.any(Request));
  expect((resourceFetch.mock.calls[0][0] as Request).url).toContain(
    "https://new.example/updated"
  );
});

test("Preview executes draft Resource bindings with existing expression methods", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [
      {
        ...draftBuild.resources[0],
        url: '`https://example.com/${$ws$dataSource$formData.email.split("@")[0].toUpperCase()}`',
        body: "({ email: $ws$dataSource$formData.email.toUpperCase() })",
      },
    ],
  } as never);
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({ success: true });
  const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value;
  expect(resourceFetch).toHaveBeenCalledWith(expect.any(Request));
  expect((resourceFetch.mock.calls[0][0] as Request).url).toContain(
    "https://example.com/ADA"
  );
});

test("draft expression failures do not execute a Resource", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [
      {
        ...draftBuild.resources[0],
        body: "(() => { throw new Error('bad expression'); })()",
      },
    ],
  } as never);
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({
    success: false,
    status: 400,
    errors: [{ message: expect.any(String) }],
  });
  expect(
    vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
  ).not.toHaveBeenCalled();
});

test("a webhook-only Form is independent of Email Service availability", async () => {
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({ success: true });
  expect(
    vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
  ).toHaveBeenCalledOnce();
});

test("Preview email uses the private Email Service credential and forwards uploaded files", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    dataSources: [
      ...draftBuild.dataSources,
      {
        id: "browserInfo",
        type: "parameter",
        scopeInstanceId: "form",
        name: "browserInfo",
      },
    ],
    resources: [
      {
        id: "webhook",
        name: "Email",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
      },
    ],
  } as never);
  const send = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get("authorization")).toBe(
      "Bearer server-only-test-token"
    );
    expect((init?.headers as Headers).get("x-webstudio-project-id")).toBe(
      projectId
    );
    const body = JSON.parse(String(init?.body));
    expect(body.to).toEqual([{ address: "team@example.com" }]);
    expect(body.text).toContain("ada@example.com");
    expect(body.text).not.toContain("203.0.113.77");
    expect(body.attachments).toMatchObject([{ filename: "hello.txt" }]);
    return Response.json({ id: "sent" });
  });
  vi.stubGlobal("fetch", send);
  try {
    const response = await action({
      request: request(new File(["hello"], "hello.txt"), {
        "x-forwarded-for": "203.0.113.77",
        "accept-language": "en",
        referer: `https://p-${projectId}.localhost/?authToken=local-test-share-token&mode=design`,
      }),
    } as never);
    expect(((await response.json()) as { success: boolean }).success).toBe(
      true
    );
    expect(send).toHaveBeenCalledOnce();
    const sentBody = JSON.parse(String(send.mock.calls[0][1]?.body));
    expect(sentBody.text).not.toContain("local-test-share-token");
    expect(sentBody.text).not.toContain("authToken");
    expect(sentBody.text).not.toContain("referrer");
    expect(String(send.mock.calls[0][0])).toBe(
      "https://apps.webstudio.is/v1/preview-send"
    );
    expect(send.mock.calls[0][1]).toMatchObject({ method: "POST" });
  } finally {
    vi.unstubAllGlobals();
  }
});

test("an unavailable Email Service fails before any action is sent", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [
      {
        id: "webhook",
        name: "Email",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
      },
    ],
  } as never);
  const token = env.TRPC_SERVER_API_TOKEN;
  env.TRPC_SERVER_API_TOKEN = undefined;
  try {
    const response = await action({ request: request() } as never);
    expect(await response.json()).toMatchObject({ success: false });
    expect(response.status).toBe(400);
    const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
      .results[0].value;
    expect(resourceFetch).not.toHaveBeenCalled();
  } finally {
    env.TRPC_SERVER_API_TOKEN = token;
  }
});

test("Email Service per-site limit fails the email action without HTTP egress", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [
      {
        id: "webhook",
        name: "Email",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
      },
    ],
  } as never);
  const send = vi.fn(async () =>
    Response.json(
      {
        error: {
          code: "email_rate_limited",
          message: "Email sending limit reached",
        },
      },
      { status: 429 }
    )
  );
  vi.stubGlobal("fetch", send);
  try {
    const response = await action({ request: request() } as never);
    expect(await response.json()).toMatchObject({
      success: false,
      errors: [
        {
          resourceId: "webhook",
          status: 429,
          message: "Email sending limit reached",
        },
      ],
    });
    expect(send).toHaveBeenCalledOnce(); // a quota rejection is not retried
    expect(
      vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
    ).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

test("authenticated Preview returns bounded actual exchange metadata privately without replay", async () => {
  const response = await action({ request: request() } as never);
  const body = (await response.json()) as unknown as {
    previewExchanges: import("~/shared/preview-form-inspection").PreviewFormExchange[];
  };
  const fetch = vi.mocked(createNodeProtectedResourceFetch).mock.results[0]
    .value;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(body.previewExchanges).toHaveLength(1);
  expect(body.previewExchanges[0]).toMatchObject({
    resourceId: "webhook",
    request: {
      method: "POST",
      url: "https://example.com/contact",
      body: { email: "ada@example.com" },
    },
    response: { status: 201, body: { accepted: true } },
  });
  expect(JSON.stringify(body.previewExchanges)).not.toContain(
    "server-only-test-token"
  );
  expect(JSON.stringify(body.previewExchanges)).not.toContain(
    "localhost/rest/preview-form"
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
});

test("a parent-scope Action with no Body sends entered Form values in the actual outgoing request", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    dataSources: draftBuild.dataSources.map((source) =>
      source.type === "resource"
        ? { ...source, scopeInstanceId: "root-instance" }
        : source
    ),
    resources: draftBuild.resources.map(({ body: _body, ...resource }) => ({
      ...resource,
      method: "get",
    })),
  } as never);
  const response = await action({ request: request() } as never);
  expect(response.status).toBe(200);
  const fetch = vi.mocked(createNodeProtectedResourceFetch).mock.results[0]
    .value;
  expect(fetch).toHaveBeenCalledTimes(1);
  const outgoing = vi.mocked(fetch).mock.calls[0][0] as Request;
  expect(outgoing.method).toBe("POST");
  expect(outgoing.headers.get("content-type")).toBe("application/json");
  expect(await outgoing.clone().json()).toEqual({ email: "ada@example.com" });
  const body = (await response.json()) as unknown as {
    previewExchanges: import("~/shared/preview-form-inspection").PreviewFormExchange[];
  };
  expect(body.previewExchanges[0].request.body).toEqual({
    email: "ada@example.com",
  });
});
