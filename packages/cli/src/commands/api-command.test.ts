import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { apiCommand } from "./api-command";

const query = vi.fn();
const mutation = vi.fn();
const createAuthTrpcClient = vi.fn(() => ({ query, mutation }));
const isFileExists = vi.fn();
const readFile = vi.fn();
const dependencies = {
  createAuthTrpcClient,
  isFileExists,
  readFile,
};

const expectJsonOutput = (command: string) => {
  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: true,
    data: { ok: true },
    meta: {
      command,
      projectId: "project-1",
      durationMs: expect.any(Number),
    },
  });
};

const mockConfig = ({
  origin = "https://example.com",
  token = "token-1",
  projectId = "project-1",
  useLegacyHost = false,
} = {}) => {
  isFileExists.mockResolvedValue(true);
  readFile
    .mockResolvedValueOnce(JSON.stringify({ projectId }))
    .mockResolvedValueOnce(
      JSON.stringify({
        [projectId]: useLegacyHost
          ? { host: origin, token }
          : { origin, token },
      })
    );
};

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue({ ok: true });
  mutation.mockReset();
  mutation.mockResolvedValue({ ok: true });
  createAuthTrpcClient.mockReset();
  createAuthTrpcClient.mockReturnValue({ query, mutation });
  isFileExists.mockReset();
  isFileExists.mockResolvedValue(false);
  readFile.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("requires json output flag", async () => {
  await expect(
    apiCommand(
      {
        command: "whoami",
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(query).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith(
    "whoami currently requires --json."
  );
});

test("calls auth introspection for whoami", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "whoami",
      json: true,
    },
    dependencies
  );

  expect(createAuthTrpcClient).toHaveBeenCalledWith(
    expect.objectContaining({
      origin: "https://example.com",
      authToken: "token-1",
    })
  );
  expect(query).toHaveBeenCalledWith("api.auth.me");
  expectJsonOutput("whoami");
});

test("calls project details for configured project", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "inspect",
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.projects.get", {
    projectId: "project-1",
  });
  expectJsonOutput("inspect");
});

test("calls build snapshot for configured project", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "snapshot",
      include: ["pages", "designTokens"],
      version: 3,
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.build.get", {
    projectId: "project-1",
    include: ["pages", "designTokens"],
    version: 3,
  });
  expectJsonOutput("snapshot");
});

test("applies build patch transactions for configured project", async () => {
  mockConfig();
  readFile.mockResolvedValueOnce(
    JSON.stringify([
      {
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [
              { op: "replace", path: ["meta", "siteName"], value: "Site" },
            ],
          },
        ],
      },
    ])
  );

  await apiCommand(
    {
      command: "apply-patch",
      baseVersion: 5,
      input: "patch.json",
      json: true,
    },
    dependencies
  );

  expect(query).not.toHaveBeenCalled();
  expect(mutation).toHaveBeenCalledWith("api.build.patch", {
    projectId: "project-1",
    baseVersion: 5,
    transactions: [
      {
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [
              { op: "replace", path: ["meta", "siteName"], value: "Site" },
            ],
          },
        ],
      },
    ],
  });
  expectJsonOutput("apply-patch");
});

test("maps trpc conflict errors to version conflict json", async () => {
  mockConfig();
  readFile.mockResolvedValueOnce(
    JSON.stringify([
      {
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [
              { op: "replace", path: ["meta", "siteName"], value: "Site" },
            ],
          },
        ],
      },
    ])
  );
  mutation.mockRejectedValue(
    Object.assign(new Error("Build version mismatch"), {
      data: { code: "CONFLICT" },
    })
  );

  await expect(
    apiCommand(
      {
        command: "apply-patch",
        baseVersion: 5,
        input: "patch.json",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "VERSION_CONFLICT",
      message: "Build version mismatch",
      retry:
        "Run webstudio inspect --json, read the latest build, regenerate the patch, then retry apply-patch.",
    },
    meta: {
      command: "apply-patch",
      projectId: "project-1",
      durationMs: expect.any(Number),
    },
  });
});

test("maps trpc not found errors to not found json", async () => {
  mockConfig();
  query.mockRejectedValue(
    Object.assign(new Error("Page not found"), {
      data: { code: "NOT_FOUND" },
    })
  );

  await expect(
    apiCommand(
      {
        command: "get-page",
        page: "missing",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Page not found",
    },
    meta: {
      command: "get-page",
      projectId: "project-1",
      durationMs: expect.any(Number),
    },
  });
});

test("splits comma-separated include values", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "snapshot",
      include: ["pages,instances", "styles"],
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.build.get", {
    projectId: "project-1",
    include: ["pages", "instances", "styles"],
    version: undefined,
  });
});

test("calls page list for configured project", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "list-pages",
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.pages.list", {
    projectId: "project-1",
  });
  expectJsonOutput("list-pages");
});

test("calls page details with required page id", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "get-page",
      page: "page-1",
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.pages.get", {
    projectId: "project-1",
    pageId: "page-1",
  });
  expectJsonOutput("get-page");
});

test("requires page id for page details", async () => {
  mockConfig();

  await expect(
    apiCommand(
      {
        command: "get-page",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(query).not.toHaveBeenCalled();
  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "INVALID_ARGUMENT",
      message: "--page is required.",
    },
    meta: {
      command: "get-page",
      projectId: "project-1",
      durationMs: expect.any(Number),
    },
  });
});

test("calls instance list with filters", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "list-instances",
      page: "page-1",
      maxDepth: 2,
      topLevel: true,
      component: "Box",
      label: "Hero",
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.instances.list", {
    projectId: "project-1",
    pageId: "page-1",
    pagePath: undefined,
    rootInstanceId: undefined,
    maxDepth: 2,
    topLevelOnly: true,
    component: "Box",
    tag: undefined,
    labelContains: "Hero",
  });
  expectJsonOutput("list-instances");
});

test("calls asset list with pagination", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "list-assets",
      type: "image",
      sort: "createdAt",
      withUsage: true,
      cursor: "2",
      limit: 10,
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.assets.list", {
    projectId: "project-1",
    type: "image",
    sort: "createdAt",
    withUsage: true,
    cursor: "2",
    limit: 10,
  });
  expectJsonOutput("list-assets");
});

test("passes style token inclusion through to the api", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "get-styles",
      instance: "instance-1",
      includeTokens: true,
      json: true,
    },
    dependencies
  );

  expect(query).toHaveBeenCalledWith("api.styles.getDeclarations", {
    projectId: "project-1",
    instanceIds: ["instance-1"],
    pageId: undefined,
    pagePath: undefined,
    breakpoint: undefined,
    state: undefined,
    property: undefined,
    propertyFilter: undefined,
    includeTokens: true,
  });
});

test("supports legacy host field in global linked config", async () => {
  mockConfig({ origin: "https://legacy.example.com", useLegacyHost: true });

  await apiCommand(
    {
      command: "whoami",
      json: true,
    },
    dependencies
  );

  expect(createAuthTrpcClient).toHaveBeenCalledWith(
    expect.objectContaining({
      origin: "https://legacy.example.com",
      authToken: "token-1",
    })
  );
});

test("requires initialized local config", async () => {
  await expect(
    apiCommand(
      {
        command: "whoami",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(createAuthTrpcClient).not.toHaveBeenCalled();
  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "NOT_INITIALIZED",
      message:
        "Local config file is not found. Run webstudio init --link <api-share-link> from a Webstudio project.",
    },
    meta: {
      command: "whoami",
      durationMs: expect.any(Number),
    },
  });
});

test("requires global config for configured project", async () => {
  isFileExists.mockResolvedValue(true);
  readFile
    .mockResolvedValueOnce(JSON.stringify({ projectId: "project-1" }))
    .mockResolvedValueOnce(JSON.stringify({}));

  await expect(
    apiCommand(
      {
        command: "inspect",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(createAuthTrpcClient).not.toHaveBeenCalled();
  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "NOT_INITIALIZED",
      message:
        "Project config is not found. Run webstudio init --link <api-share-link>.",
    },
    meta: {
      command: "inspect",
      durationMs: expect.any(Number),
    },
  });
});
