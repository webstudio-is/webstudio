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
    FORM_PREVIEW_EMAIL_SERVICE_URL:
      "https://forms.webstudio.is/v1/preview-send",
    FORM_PREVIEW_EMAIL_SERVICE_TOKEN: "server-only-test-token",
  },
}));

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const request = (file?: File, headers?: HeadersInit) => {
  const url = new URL(
    `https://p-${projectId}.localhost/rest/preview-form?path=%2Fcontact`
  );
  const formData = new FormData();
  formData.set("ws--managed-form-id", "form");
  formData.set("ws--managed-form-array-names", "[]");
  formData.set("ws--form-bot", Date.now().toString(16));
  formData.set("email", "ada@example.com");
  if (file) formData.set("attachment", file);
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
      id: "submission",
      instanceId: "form",
      name: "submission",
      type: "json",
      value: { destinations: ["destination"] },
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
    expect.stringContaining("https://example.com/contact"),
    expect.anything()
  );
  expect(loadDevBuildByProjectId).toHaveBeenCalledWith(
    expect.anything(),
    projectId
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
});

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
    expect.stringContaining("https://new.example/updated"),
    expect.anything()
  );
});

test("Preview executes draft Resource bindings with existing expression methods", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [{
      ...draftBuild.resources[0],
      url: '`https://example.com/${$ws$dataSource$formData.email.split("@")[0].toUpperCase()}`',
      body: '({ email: $ws$dataSource$formData.email.toUpperCase() })',
    }],
  } as never);
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({ success: true });
  const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
    .results[0].value;
  expect(resourceFetch).toHaveBeenCalledWith(
    "https://example.com/ADA",
    expect.anything()
  );
});

test("draft expression failures do not execute a Resource", async () => {
  vi.mocked(loadDevBuildByProjectId).mockResolvedValue({
    ...draftBuild,
    resources: [{
      ...draftBuild.resources[0],
      body: "(() => { throw new Error('bad expression'); })()",
    }],
  } as never);
  const response = await action({ request: request() } as never);
  expect(await response.json()).toMatchObject({
    success: false,
    status: 400,
    errors: [{ message: expect.any(String) }],
  });
  expect(vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value)
    .not.toHaveBeenCalled();
});

test("a webhook-only Form is independent of Email Service availability", async () => {
  const url = env.FORM_PREVIEW_EMAIL_SERVICE_URL;
  env.FORM_PREVIEW_EMAIL_SERVICE_URL = undefined;
  try {
    const response = await action({ request: request() } as never);
    expect(await response.json()).toMatchObject({ success: true });
    expect(
      vi.mocked(createNodeProtectedResourceFetch).mock.results[0].value
    ).toHaveBeenCalledOnce();
  } finally {
    env.FORM_PREVIEW_EMAIL_SERVICE_URL = url;
  }
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
      }),
    } as never);
    expect(((await response.json()) as { success: boolean }).success).toBe(
      true
    );
    expect(send).toHaveBeenCalledWith(
      "https://forms.webstudio.is/v1/preview-send",
      expect.objectContaining({ method: "POST" })
    );
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
  const url = env.FORM_PREVIEW_EMAIL_SERVICE_URL;
  env.FORM_PREVIEW_EMAIL_SERVICE_URL = undefined;
  try {
    const response = await action({ request: request() } as never);
    expect(await response.json()).toMatchObject({ success: false });
    expect(response.status).toBe(400);
    const resourceFetch = vi.mocked(createNodeProtectedResourceFetch).mock
      .results[0].value;
    expect(resourceFetch).not.toHaveBeenCalled();
  } finally {
    env.FORM_PREVIEW_EMAIL_SERVICE_URL = url;
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
