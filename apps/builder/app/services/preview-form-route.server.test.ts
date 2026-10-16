import { createServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { build } from "esbuild";
import { beforeEach, expect, test, vi } from "vitest";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import * as projectApi from "@webstudio-is/project/index.server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import {
  prepareManagedFormDraft,
  simulateManagedFormDraftSubmission,
} from "@webstudio-is/project-build/runtime";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";
import { action } from "../routes/rest.preview-form";
import { simulateFormSubmission } from "./simulate-form.server";
import type { PreviewFormExchange } from "~/shared/preview-form-inspection";

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
    EMAIL_SERVICE_URL: "https://webstudio-email-service.wstd.workers.dev",
  },
}));

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
type EmailServiceEnvelope = {
  to: { address: string; name?: string }[];
  subject: string;
  text: string;
  replyTo?: { address: string; name?: string };
  fromName?: string;
  attachments?: {
    filename: string;
    contentType: string;
    contentBase64: string;
  }[];
};
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
    { type: "instance", id: "form", component: "Form", children: [] },
  ],
  props: [
    {
      id: "action",
      instanceId: "form",
      name: "action",
      type: "json",
      value: [{ dataSourceId: "destination" }],
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
  expect(resourceFetch).toHaveBeenCalledWith(
    "https://example.com/contact",
    expect.objectContaining({ method: "post" })
  );
  const [input, init] = resourceFetch.mock.calls[0];
  const outgoing = new Request(input, init);
  expect(outgoing.method).toBe("POST");
  expect(loadDevBuildByProjectId).toHaveBeenCalledWith(
    expect.anything(),
    projectId
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
});

test("server MCP simulation executes the saved draft with the Preview engine", async () => {
  const result = await simulateFormSubmission({
    context: { authorization: { type: "user" } } as never,
    projectId,
    formId: "form",
    path: "/contact",
    siteOrigin: "https://site.wstd.work",
    values: [{ name: "email", value: "ada@example.com" }],
    arrayNames: [],
  });
  expect(result).toMatchObject({
    success: true,
    results: [{ status: 201, body: { accepted: true } }],
  });
  expect(loadDevBuildByProjectId).toHaveBeenCalledOnce();
  const [input, init] = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value.mock.calls[0];
  const outgoing = new Request(input, init);
  expect(outgoing.url).toBe("https://example.com/contact");
  expect(await outgoing.json()).toEqual({ email: "ada@example.com" });
});

test("server MCP simulation rejects a path that URL parsing would move to another origin", async () => {
  await expect(
    simulateFormSubmission({
      context: { authorization: { type: "user" } } as never,
      projectId,
      formId: "form",
      path: "/\n/example.com/contact",
      values: [],
      arrayNames: [],
    })
  ).rejects.toThrow("local page path");
  expect(loadDevBuildByProjectId).not.toHaveBeenCalled();
});

test("server MCP simulation sends Email with Builder-held credentials", async () => {
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
    projectSettings: { meta: { contactEmail: "testing@webstudio.is" } },
  } as never);
  const send = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const outgoing =
      input instanceof Request ? input : new Request(input, init);
    expect(outgoing.headers.get("authorization")).toBe(
      "Bearer server-only-test-token"
    );
    const body = (await outgoing.json()) as EmailServiceEnvelope;
    expect(body.to).toEqual([{ address: "testing@webstudio.is" }]);
    return Response.json({ result: { data: { id: "sent" } } });
  });
  vi.stubGlobal("fetch", send);
  const result = await simulateFormSubmission({
    context: { authorization: { type: "token" } } as never,
    projectId,
    formId: "form",
    path: "/contact",
    values: [{ name: "email", value: "ada@example.com" }],
    arrayNames: [],
  });
  expect(result.success).toBe(true);
  expect(send).toHaveBeenCalledOnce();
});

test("server MCP simulation and Builder Preview use the same saved Form setup and SDK outcome", async () => {
  const browserResponse = await action({ request: request() } as never);
  const browserResult = (await browserResponse.json()) as {
    success: boolean;
    status: number;
    results: { status: number; resourceId: string; body: unknown }[];
  };
  const instances = new Map(
    draftBuild.instances.map((item) => [item.id, item])
  );
  const props = new Map(draftBuild.props.map((item) => [item.id, item]));
  const dataSources = new Map(
    draftBuild.dataSources.map((item) => [item.id, item])
  );
  const resources = new Map(
    draftBuild.resources.map((item) => [item.id, item])
  );
  const pageUrl = new URL("https://site.wstd.work/contact");
  const prepared = prepareManagedFormDraft({
    formId: "form",
    pageUrl,
    pages: draftBuild.pages as never,
    instances: instances as never,
    props: props as never,
    dataSources: dataSources as never,
    resources: resources as never,
    projectMeta: draftBuild.projectSettings.meta,
  });
  const simulated = await simulateManagedFormDraftSubmission({
    prepared,
    formId: "form",
    pageUrl,
    values: [{ name: "email", value: "ada@example.com" }],
    resourceFetch: vi.mocked(createNodeProtectedResourceFetch).mock.results[0]
      .value,
  });
  expect(simulated).toMatchObject({
    success: browserResult.success,
    status: browserResult.status,
    results: browserResult.results,
  });
});

test("Builder Preview executes a legacy Action with an enabled key", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    props: [
      {
        ...draftBuild.props[0],
        value: [{ dataSourceId: "destination", enabled: false }],
      },
    ],
  } as never);
  const response = await action({ request: request() } as never);
  expect((await response.json()).success).toBe(true);
  expect(
    vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
  ).toHaveBeenCalledWith(
    "https://example.com/contact",
    expect.objectContaining({
      method: "post",
      body: '{"email":"ada@example.com"}',
    })
  );
});

test.each([
  [[], []],
  [["news"], ["news"]],
  [
    ["news", "events"],
    ["news", "events"],
  ],
])(
  "server simulation preserves saved checkbox array semantics for %j",
  async (selected, expected) => {
    const pageUrl = new URL("https://site.wstd.work/contact");
    const instances = new Map(
      [
        ...draftBuild.instances,
        {
          type: "instance",
          id: "choices",
          component: "Checkbox",
          children: [],
        },
      ].map((item) => [item.id, item])
    );
    instances.set("form", {
      ...instances.get("form")!,
      children: [{ type: "id", value: "choices" }],
    });
    const props = new Map(
      [
        ...draftBuild.props,
        {
          id: "choices-name",
          instanceId: "choices",
          name: "name",
          type: "string",
          value: "interests",
        },
      ].map((item) => [item.id, item])
    );
    const resources = new Map([
      [
        "webhook",
        {
          ...draftBuild.resources[0],
          body: "({ interests: $ws$dataSource$formData.interests })",
        },
      ],
    ]);
    const prepared = prepareManagedFormDraft({
      formId: "form",
      pageUrl,
      pages: draftBuild.pages as never,
      instances: instances as never,
      props: props as never,
      dataSources: new Map(
        draftBuild.dataSources.map((item) => [item.id, item])
      ) as never,
      resources: resources as never,
      projectMeta: draftBuild.projectSettings.meta,
    });
    expect(prepared.arrayNames.has("interests")).toBe(true);
    const sent: unknown[] = [];
    const resourceFetch = Object.assign(
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        sent.push(await new Request(input, init).json());
        return Response.json({ accepted: true }, { status: 201 });
      }),
      { validateDestination: vi.fn() }
    );
    const response = await simulateManagedFormDraftSubmission({
      prepared,
      formId: "form",
      pageUrl,
      values: selected.map((value) => ({ name: "interests", value })),
      resourceFetch,
    });
    expect(response.success).toBe(true);
    expect(sent).toEqual([{ interests: expected }]);
  }
);

test("Preview uses the final effective Form action when props are duplicated", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    props: [
      { ...draftBuild.props[0], id: "earlier-action", value: [] },
      ...draftBuild.props,
    ],
  } as never);
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({ success: true });
  const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value;
  expect(resourceFetch).toHaveBeenCalledOnce();
});

test("Preview Actions resolve the matched page's legacy System binding", async () => {
  const originBuild = {
    ...draftBuild,
    pages: {
      ...draftBuild.pages,
      pages: new Map([
        [
          "page",
          {
            ...draftBuild.pages.pages.get("page")!,
            systemDataSourceId: "pageSystem",
          },
        ],
      ]),
    },
    dataSources: [
      ...draftBuild.dataSources,
      {
        id: "pageSystem",
        type: "parameter",
        scopeInstanceId: "root-instance",
        name: "system",
      },
    ],
    resources: [
      {
        ...draftBuild.resources[0],
        body: "({ pathname: $ws$dataSource$pageSystem.pathname, origin: $ws$dataSource$pageSystem.origin })",
      },
    ],
  };
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue(originBuild as never);
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({ success: true });
  const fetch = vi.mocked(createNodeProtectedResourceFetch).mock.results[0]
    .value;
  expect(fetch).toHaveBeenCalledOnce();
  const [input, init] = fetch.mock.calls[0];
  const outgoing = new Request(input, init);
  expect(await outgoing.json()).toEqual({
    pathname: "/contact",
    origin: "https://site.wstd.work",
  });
  const pageUrl = new URL("https://site.wstd.work/contact");
  const prepared = prepareManagedFormDraft({
    formId: "form",
    pageUrl,
    pages: originBuild.pages as never,
    instances: new Map(
      originBuild.instances.map((item) => [item.id, item])
    ) as never,
    props: new Map(originBuild.props.map((item) => [item.id, item])) as never,
    dataSources: new Map(
      originBuild.dataSources.map((item) => [item.id, item])
    ) as never,
    resources: new Map(
      originBuild.resources.map((item) => [item.id, item])
    ) as never,
    projectMeta: originBuild.projectSettings.meta,
  });
  const simulated = await simulateManagedFormDraftSubmission({
    prepared,
    formId: "form",
    pageUrl,
    values: [{ name: "email", value: "ada@example.com" }],
    resourceFetch: fetch,
  });
  expect(simulated.success).toBe(true);
  const [simulatedInput, simulatedInit] = fetch.mock.calls[1];
  expect(await new Request(simulatedInput, simulatedInit).json()).toEqual({
    pathname: "/contact",
    origin: "https://site.wstd.work",
  });
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
          import { Form } from "./resource-form";
          import { submitPreviewForm } from "~/shared/preview-form-bridge";

          createRoot(document.getElementById("root")).render(
            createElement(Form, {
              "data-ws-managed-form-id": "form",
              action: [{ dataSourceId: "destination" }],
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
    const send = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ result: { data: { id: "sent" } } })
    );
    if (delayedSave) {
      vi.stubGlobal("fetch", send);
    }
    const requests: string[] = [];
    let receivedHeaders: { auth?: string; csrf?: string } | undefined;
    let submittedFormData: FormData | undefined;
    let routeResult:
      | { success: boolean; previewExchanges?: PreviewFormExchange[] }
      | undefined;
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
          routeResult = await routeResponse.clone().json();
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
              value: [{ dataSourceId: "new-email" }],
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
        const [input, init] = send.mock.calls[0];
        const messageRequest =
          input instanceof Request ? input : new Request(input, init);
        const message = (await messageRequest
          .clone()
          .json()) as EmailServiceEnvelope;
        expect(message.to).toEqual([{ address: "updated@example.com" }]);
        expect(message.text).toContain("Updated draft body");
        expect(routeResult).toMatchObject({
          success: true,
          previewExchanges: [
            {
              resourceId: "email",
              resourceName: "Updated email",
              kind: "email",
              request: {
                method: "POST",
                url: `${env.EMAIL_SERVICE_URL}/trpc/email.send`,
                body: {
                  to: [{ address: "updated@example.com" }],
                  text: expect.stringContaining("Updated draft body"),
                },
              },
              response: {
                status: 200,
                body: { result: { data: { id: "sent" } } },
              },
            },
          ],
        });
        const exchange = routeResult?.previewExchanges?.[0];
        expect(exchange?.request.headers).toContainEqual({
          name: "authorization",
          value: "[redacted]",
        });
        expect(JSON.stringify(exchange)).not.toContain(
          "server-only-test-token"
        );
      } else {
        expect(resourceFetch).toHaveBeenCalledWith(
          "https://example.com/contact",
          expect.objectContaining({ method: "post" })
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
  expect(resourceFetch).toHaveBeenCalledWith(
    "https://new.example/updated",
    expect.objectContaining({
      method: "post",
      body: '{"email":"ada@example.com"}',
    })
  );
});

test("Preview binds trusted server browser info without forwarding Referer credentials", async () => {
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
        ...draftBuild.resources[0],
        body: "({ ip: $ws$dataSource$browserInfo.ip, referrer: $ws$dataSource$browserInfo.referrer })",
      },
    ],
  } as never);
  const response = await action({
    request: request(undefined, {
      "cf-connecting-ip": "203.0.113.77",
      "x-forwarded-for": "192.0.2.44",
      "user-agent": "Preview test browser",
      "accept-language": "en-GB",
      referer: `https://p-${projectId}.localhost/?authToken=local-test-token&mode=design#sensitive-fragment`,
    }),
  } as never);
  const responseBody = (await response.json()) as unknown as {
    success: boolean;
    previewBrowserInfo: Record<string, unknown>;
  };
  expect(responseBody).toMatchObject({
    success: true,
    previewBrowserInfo: {
      ip: "203.0.113.77",
      userAgent: "Preview test browser",
      language: "en-GB",
      referrer: `https://p-${projectId}.localhost/`,
    },
  });
  expect(JSON.stringify(responseBody)).not.toContain("local-test-token");
  const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value;
  expect(resourceFetch).toHaveBeenCalledWith(
    "https://example.com/contact",
    expect.objectContaining({ method: "post" })
  );
  const [input, init] = resourceFetch.mock.calls[0];
  const outgoing = new Request(input, init);
  expect(await outgoing.json()).toEqual({
    ip: "203.0.113.77",
    referrer: `https://p-${projectId}.localhost/`,
  });
});

test("Preview binds each page's submitted values and browser context to its own Form", async () => {
  const pages = [
    {
      id: "contact-page",
      path: "/contact",
      formId: "contact-form",
      email: "contact@example.com",
      ip: "203.0.113.11",
      userAgent: "Contact browser",
      language: "en-GB",
    },
    {
      id: "support-page",
      path: "/support",
      formId: "support-form",
      email: "support@example.com",
      ip: "203.0.113.22",
      userAgent: "Support browser",
      language: "fr-FR",
    },
  ];
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    pages: {
      ...draftBuild.pages,
      pages: new Map(
        pages.map(({ id, path }) => [
          id,
          { id, path, rootInstanceId: `${id}-root` },
        ])
      ),
      folders: new Map([
        ["root", { id: "root", slug: "", children: pages.map(({ id }) => id) }],
      ]),
      homePageId: pages[0].id,
    },
    instances: pages.flatMap(({ id, formId }) => [
      {
        type: "instance",
        id: `${id}-root`,
        component: "Body",
        children: [{ type: "id", value: formId }],
      },
      { type: "instance", id: formId, component: "Form", children: [] },
    ]),
    props: pages.map(({ formId }) => ({
      id: `${formId}-action`,
      instanceId: formId,
      name: "action",
      type: "json",
      value: [{ dataSourceId: `${formId}-destination` }],
    })),
    dataSources: pages.flatMap(({ formId }) => [
      {
        id: `${formId}-destination`,
        type: "resource",
        scopeInstanceId: formId,
        resourceId: `${formId}-resource`,
        name: "webhook",
      },
      {
        id: `${formId}-data`,
        type: "parameter",
        scopeInstanceId: formId,
        name: "formData",
      },
      {
        id: `${formId}-browser`,
        type: "parameter",
        scopeInstanceId: formId,
        name: "browserInfo",
      },
    ]),
    resources: pages.map(({ formId }) => ({
      id: `${formId}-resource`,
      name: "webhook",
      method: "post",
      url: `"https://example.com/${formId}"`,
      headers: [],
      body: `({ email: ${encodeDataSourceVariable(`${formId}-data`)}.email, pageUrl: ${encodeDataSourceVariable(`${formId}-browser`)}.pageUrl, ip: ${encodeDataSourceVariable(`${formId}-browser`)}.ip, userAgent: ${encodeDataSourceVariable(`${formId}-browser`)}.userAgent, language: ${encodeDataSourceVariable(`${formId}-browser`)}.language })`,
    })),
  } as never);

  for (const [index, page] of pages.entries()) {
    const path = `${page.path}?topic=${page.id}`;
    const formData = new FormData();
    formData.set("ws--managed-form-id", page.formId);
    formData.set("ws--managed-form-array-names", "[]");
    formData.set("ws--form-bot", Date.now().toString(16));
    formData.set("email", page.email);
    const response = await action({
      request: new Request(
        `https://p-${projectId}.localhost/rest/preview-form?path=${encodeURIComponent(path)}`,
        {
          method: "POST",
          body: formData,
          headers: {
            "cf-connecting-ip": page.ip,
            "x-forwarded-for": "192.0.2.99",
            "user-agent": page.userAgent,
            "accept-language": page.language,
          },
        }
      ),
    } as never);
    expect(await response.json()).toMatchObject({
      success: true,
      previewBrowserInfo: {
        pageUrl: `https://site.wstd.work${path}`,
        ip: page.ip,
        userAgent: page.userAgent,
        language: page.language,
      },
    });
    const resourceFetch = vi
      .mocked(createNodeProtectedResourceFetch)
      .mock.results.at(-1)?.value;
    expect(resourceFetch).toHaveBeenCalledTimes(index + 1);
    const [input, init] = resourceFetch.mock.calls[index];
    const outgoing = new Request(input, init);
    expect(outgoing.url).toBe(`https://example.com/${page.formId}`);
    expect(await outgoing.json()).toEqual({
      email: page.email,
      pageUrl: `https://site.wstd.work${path}`,
      ip: page.ip,
      userAgent: page.userAgent,
      language: page.language,
    });
  }
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
  const token = env.TRPC_SERVER_API_TOKEN;
  env.TRPC_SERVER_API_TOKEN = undefined;
  try {
    const response = await action({ request: request() } as never);
    expect(await response.json()).toMatchObject({ success: true });
    expect(
      vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
    ).toHaveBeenCalledOnce();
  } finally {
    env.TRPC_SERVER_API_TOKEN = token;
  }
});

test.each([
  ["production", "https://webstudio-email-service.wstd.workers.dev"],
  ["preview", "https://webstudio-email-service.wstd.workers.dev"],
  ["development", "https://webstudio-email-service.wstd.workers.dev"],
  [undefined, "https://webstudio-email-service.wstd.workers.dev"],
  ["preview", "https://a1b2c3d4-webstudio-email-service.wstd.workers.dev"],
] as const)(
  "Preview email in %s uses the configured endpoint and server credential",
  async (environment, endpoint) => {
    const previousEnvironment = env.DEPLOYMENT_ENVIRONMENT;
    const previousEmailServiceUrl = env.EMAIL_SERVICE_URL;
    env.DEPLOYMENT_ENVIRONMENT = environment;
    env.EMAIL_SERVICE_URL = endpoint;
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
      projectSettings: {
        meta: {
          contactEmail: "team@example.com",
          emailSender: "Site Owner <owner@example.com>",
        },
      },
    } as never);
    const send = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      expect(request.headers.get("authorization")).toBe(
        "Bearer server-only-test-token"
      );
      expect(request.headers.get("x-webstudio-project-id")).toBe(projectId);
      const body = (await request.clone().json()) as EmailServiceEnvelope;
      expect(body.to).toEqual([{ address: "team@example.com" }]);
      expect(body.text).toContain("ada@example.com");
      expect(body.text).not.toContain("203.0.113.77");
      expect(body.attachments).toMatchObject([{ filename: "hello.txt" }]);
      return Response.json(
        { result: { data: { id: "sent" } } },
        { headers: { "cache-control": "private, no-store" } }
      );
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
      const result = (await response.json()) as unknown as {
        success: boolean;
        previewExchanges: PreviewFormExchange[];
      };
      expect(result.success).toBe(true);
      expect(result.previewExchanges).toHaveLength(1);
      expect(result.previewExchanges[0]).toMatchObject({
        resourceId: "webhook",
        kind: "email",
        request: {
          method: "POST",
          url: `${endpoint}/trpc/email.send`,
          body: {
            to: [{ address: "team@example.com" }],
            replyTo: { address: "owner@example.com", name: "Site Owner" },
            fromName: "Site Owner",
            subject: expect.any(String),
            text: expect.stringContaining("ada@example.com"),
            attachments: [
              {
                filename: "hello.txt",
                contentType: "application/octet-stream",
                contentBase64: "[redacted]",
              },
            ],
          },
        },
        response: {
          status: 200,
          headers: [
            { name: "cache-control", value: "private, no-store" },
            { name: "content-type", value: "application/json" },
          ],
          body: { result: { data: { id: "sent" } } },
        },
      });
      expect(JSON.stringify(result.previewExchanges)).not.toContain(
        "server-only-test-token"
      );
      expect(result.previewExchanges[0].request.headers).toContainEqual({
        name: "authorization",
        value: "[redacted]",
      });
      expect(JSON.stringify(result.previewExchanges)).not.toContain(
        "local-test-share-token"
      );
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(send).toHaveBeenCalledOnce();
      const [sentInput, sentInit] = send.mock.calls[0];
      const sentRequest =
        sentInput instanceof Request
          ? sentInput
          : new Request(sentInput, sentInit);
      const sentBody = (await sentRequest
        .clone()
        .json()) as EmailServiceEnvelope;
      expect(sentBody.text).not.toContain("local-test-share-token");
      expect(sentBody.text).not.toContain("authToken");
      expect(sentBody.text).toContain(`https://p-${projectId}.localhost/`);
      expect(sentBody.text).not.toContain("mode=design");
      expect(sentRequest.url).toBe(`${endpoint}/trpc/email.send`);
      expect(sentRequest.method).toBe("POST");
    } finally {
      env.DEPLOYMENT_ENVIRONMENT = previousEnvironment;
      env.EMAIL_SERVICE_URL = previousEmailServiceUrl;
      vi.unstubAllGlobals();
    }
  }
);

test("an unset Preview credential fails before any action is sent", async () => {
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
    expect(await response.json()).toMatchObject({
      success: false,
      errors: [{ message: "Email service is unavailable for Form Preview" }],
    });
    expect(response.status).toBe(503);
    expect(createNodeProtectedResourceFetch).not.toHaveBeenCalled();
  } finally {
    env.TRPC_SERVER_API_TOKEN = token;
  }
});

test("two Email actions identify each credential failure in local Preview", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    props: [
      {
        ...draftBuild.props[0],
        value: [
          { dataSourceId: "destination" },
          { dataSourceId: "visitorDestination" },
        ],
      },
    ],
    dataSources: [
      { ...draftBuild.dataSources[0], name: "Email to owner" },
      ...draftBuild.dataSources.slice(1),
      {
        id: "visitorDestination",
        type: "resource",
        scopeInstanceId: "form",
        resourceId: "visitorEmail",
        name: "Email to visitor",
      },
    ],
    resources: [
      {
        id: "webhook",
        name: "Email to owner",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
      },
      {
        id: "visitorEmail",
        name: "Email to visitor",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
      },
    ],
    projectSettings: {
      meta: { contactEmail: "team@example.com" },
    },
  } as never);
  const send = vi.fn(async () =>
    Response.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    )
  );
  vi.stubGlobal("fetch", send);
  try {
    const response = await action({ request: request() } as never);
    const result = (await response.json()) as unknown as {
      errors: Array<{ resourceName: string; message: string }>;
    };
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.errors).toHaveLength(2);
    expect(
      result.errors.map(({ resourceName, message }) => ({
        resourceName,
        message,
      }))
    ).toEqual([
      {
        resourceName: "Email to owner",
        message: expect.stringContaining(
          "Email to owner: the email service rejected"
        ),
      },
      {
        resourceName: "Email to visitor",
        message: expect.stringContaining(
          "Email to visitor: the email service rejected"
        ),
      },
    ]);
  } finally {
    vi.unstubAllGlobals();
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
    resourceName: "webhook",
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
  const [input, init] = vi.mocked(fetch).mock.calls[0];
  const outgoing = new Request(input, init);
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

test("Email Preview inspection retains user-authored Resource subject and body", async () => {
  const subject = "Configured Email subject";
  const body =
    "Configured Email body server-only-test-token public-example-token";
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
        email: {
          subject: JSON.stringify(subject),
          body: JSON.stringify(body),
        },
      },
    ],
    projectSettings: {
      meta: {
        contactEmail: "team@example.com",
      },
    },
  } as never);
  const send = vi.fn(async () =>
    Response.json({ result: { data: { id: "sent" } } })
  );
  vi.stubGlobal("fetch", send);
  try {
    const response = await action({ request: request() } as never);
    const result = (await response.json()) as unknown as {
      success: boolean;
      previewExchanges: PreviewFormExchange[];
    };
    expect(result.success).toBe(true);
    expect(result.previewExchanges[0].request.body).toMatchObject({
      to: [{ address: "team@example.com" }],
      subject: "Configured Email subject",
      headers: { "X-Message-ID": expect.stringMatching(/^[a-f0-9]{16}$/) },
      text: "Configured Email body [redacted] public-example-token",
    });
    expect(result.previewExchanges[0].response.body).toEqual({
      result: { data: { id: "sent" } },
    });
    expect(JSON.stringify(result.previewExchanges)).not.toContain(
      "server-only-test-token"
    );
    expect(send).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
});
