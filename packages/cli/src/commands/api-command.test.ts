import { afterEach, beforeEach, expect, test, vi } from "vitest";
import makeCLI from "yargs";
import {
  getPublicApiOperation,
  publicApiContractVersion,
  publicApiOperations,
} from "@webstudio-is/protocol";
import { apiCompatibilityHeaders } from "./api";
import { apiCommand, auditCommandOptions } from "./api-command";
import type { CommonYargsArgv } from "./yargs-types";
import { apiCommandMetadata } from "./api-command-metadata";

const apiCalls = new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
  get(target, property: string) {
    target[property] ??= vi.fn().mockResolvedValue({ ok: true });
    return target[property];
  },
});
const isFileExists = vi.fn();
const readFile = vi.fn();
const getServerApiContract = vi.fn();
const apiClientByOperationId = new Map(
  publicApiOperations.map((operation) => [operation.id, operation.client])
);
const createSessionEnvelope = ({
  operationId,
  projectId,
  result,
  source,
}: {
  operationId: string;
  projectId: string;
  result: unknown;
  source: "local" | "remote" | "server";
}) => ({
  operationId,
  projectId,
  buildId: "build-1",
  version: 1,
  source,
  result,
  state: { committed: source !== "local", freshness: {} },
  namespaces: { read: [], write: [], invalidated: [], missing: [] },
  diagnostics: [],
});
const createCliProjectSession = vi.fn(({ connection }) => ({
  initialize: vi.fn(async () => ({ result: { loaded: true } })),
  refresh: vi.fn(async () => ({ result: { refreshedNamespaces: [] } })),
  executeServerOperation: vi.fn(
    async ({ id }: { id: string }, input: unknown) =>
      createSessionEnvelope({
        operationId: id,
        projectId: connection.projectId,
        source: "server",
        result: await apiCalls[apiClientByOperationId.get(id) ?? ""]({
          ...connection,
          ...(input as Record<string, unknown>),
        }),
      })
  ),
  read: vi.fn(async (operationId: string, input: unknown) =>
    createSessionEnvelope({
      operationId,
      projectId: connection.projectId,
      source: "local",
      result: await apiCalls[apiClientByOperationId.get(operationId) ?? ""]({
        ...connection,
        ...(input as Record<string, unknown>),
      }),
    })
  ),
  mutate: vi.fn(async (operationId: string, input: unknown) =>
    createSessionEnvelope({
      operationId,
      projectId: connection.projectId,
      source: "remote",
      result: await apiCalls[apiClientByOperationId.get(operationId) ?? ""]({
        ...connection,
        ...(input as Record<string, unknown>),
      }),
    })
  ),
}));
const dependencies = new Proxy(
  {
    isFileExists,
    readFile,
    createCliProjectSession,
    getServerApiContract,
  } as typeof apiCalls & {
    isFileExists: typeof isFileExists;
    readFile: typeof readFile;
    createCliProjectSession: typeof createCliProjectSession;
    getServerApiContract: typeof getServerApiContract;
  },
  {
    get(target, property: string) {
      if (property in target) {
        return target[property];
      }
      return apiCalls[property];
    },
  }
) as unknown as Parameters<typeof apiCommand>[1];

const expectJsonOutput = (command: string, data: unknown = { ok: true }) => {
  expect(getLastJsonOutput()).toEqual({
    ok: true,
    data,
    meta: {
      command,
      projectId: "project-1",
      durationMs: expect.any(Number),
      session: {
        operationId: expect.any(String),
        projectId: "project-1",
        buildId: "build-1",
        version: 1,
        source: expect.any(String),
        committed: expect.any(Boolean),
        namespaceCounts: { read: 0, write: 0, invalidated: 0, missing: 0 },
        diagnosticCount: 0,
      },
    },
  });
};

const getLastJsonOutput = () =>
  JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);

const expectJsonErrorOutput = ({
  command,
  code,
  message,
  projectId = "project-1",
  retry,
}: {
  command: string;
  code: string;
  message: string;
  projectId?: string | false;
  retry?: string;
}) => {
  expect(getLastJsonOutput()).toEqual({
    ok: false,
    error: { code, message, ...(retry === undefined ? {} : { retry }) },
    meta: {
      command,
      ...(projectId === false ? {} : { projectId }),
      durationMs: expect.any(Number),
    },
  });
};

const expectConnection = (extra = {}) =>
  expect.objectContaining({
    origin: "https://example.com",
    authToken: "token-1",
    projectId: "project-1",
    headers: apiCompatibilityHeaders,
    ...extra,
  });

const connectionFieldNames = new Set([
  "origin",
  "authToken",
  "projectId",
  "headers",
]);

const cliAdapterInputFieldsByCommand: Partial<
  Record<Parameters<typeof apiCommand>[0]["command"], readonly string[]>
> = {
  "upload-asset": ["readAssetData"],
  "upload-assets": ["readAssetData"],
};

const expectCallUsesDocumentedInputFields = (
  call: ReturnType<typeof vi.fn>,
  command: Parameters<typeof apiCommand>[0]["command"]
) => {
  const operation = getPublicApiOperation(command);
  const actual = call.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  const inputFields = Object.keys(actual).filter(
    (key) => connectionFieldNames.has(key) === false
  );
  const allowedFields = new Set([
    ...operation.inputFields,
    ...(cliAdapterInputFieldsByCommand[command] ?? []),
  ]);
  const unknownFields = inputFields.filter(
    (field) => !allowedFields.has(field)
  );
  expect(unknownFields).toEqual([]);
  for (const field of operation.requiredInputFields) {
    expect(inputFields).toContain(field);
  }
};

const expectCommandCall = async ({
  options,
  call,
  connection = {},
  inputJson,
  expectedData,
}: {
  options: Parameters<typeof apiCommand>[0];
  call: ReturnType<typeof vi.fn>;
  connection?: Record<string, unknown>;
  inputJson?: unknown;
  expectedData?: unknown;
}) => {
  mockConfig();
  if (inputJson !== undefined) {
    readFile.mockResolvedValueOnce(JSON.stringify(inputJson));
  }

  await apiCommand({ ...options, json: true }, dependencies);

  expect(call).toHaveBeenCalledWith(expectConnection(connection));
  expectCallUsesDocumentedInputFields(call, options.command);
  expectJsonOutput(options.command, expectedData);
};

const patchTransactions = [
  {
    id: "tx-1",
    payload: [
      {
        namespace: "pages",
        patches: [{ op: "replace", path: ["meta", "siteName"], value: "Site" }],
      },
    ],
  },
];

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
  for (const call of Object.values(apiCalls)) {
    call.mockReset();
    call.mockResolvedValue({ ok: true });
  }
  isFileExists.mockReset();
  isFileExists.mockResolvedValue(false);
  readFile.mockReset();
  createCliProjectSession.mockClear();
  getServerApiContract.mockReset();
  getServerApiContract.mockResolvedValue({
    clientVersion: publicApiContractVersion,
    serverVersion: publicApiContractVersion,
    supportedOperationIds: new Set(
      publicApiOperations.map((operation) => operation.id)
    ),
    missingServerOperationIds: [],
    negotiated: true,
  });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
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

  expect(apiCalls.getApiTokenInfo).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith(
    "whoami currently requires --json."
  );
});

test("explains mcp-only editing commands should use shortcut or single-op-call", async () => {
  mockConfig();

  await expect(
    apiCommand(
      {
        command: "insert-fragment",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expectJsonErrorOutput({
    command: "insert-fragment",
    code: "API_COMMAND_FAILED",
    message:
      "insert-fragment is an MCP project-editing tool, not a high-level CLI API command. Use the MCP shortcut, for example: webstudio insert-fragment '{...}', or the explicit form: webstudio mcp single-op-call insert-fragment '{...}'.",
  });
});

test("documents every executable api command", () => {
  expect(apiCommandMetadata.map(({ command }) => command)).toEqual(
    publicApiOperations.map(({ command }) => command)
  );
});

test("has a public operation descriptor for every executable api command", () => {
  expect(
    apiCommandMetadata.map(({ command, method, permit }) => ({
      command,
      method,
      permit,
    }))
  ).toEqual(
    publicApiOperations.map(({ command }) => ({
      command,
      method: getPublicApiOperation(command).method,
      permit: getPublicApiOperation(command).permit,
    }))
  );
});

const simpleCommandCases = [
  ["auth introspection", { command: "whoami" }, "getApiTokenInfo", {}],
  ["project details", { command: "inspect" }, "getProjectInfo", {}],
  [
    "project permissions",
    { command: "permissions" },
    "getProjectPermissions",
    {},
  ],
  [
    "page list",
    {
      command: "list-pages",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    "listPages",
    { cursor: "10", limit: 5, verbose: true },
  ],
  [
    "folder list",
    {
      command: "list-folders",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    "listFolders",
    { cursor: "10", limit: 5, verbose: true },
  ],
  [
    "folder delete",
    { command: "delete-folder", folder: "folder-1" },
    "deleteFolder",
    { folderId: "folder-1" },
  ],
  [
    "page details by id",
    { command: "get-page", page: "page-1" },
    "getPage",
    { pageId: "page-1" },
  ],
  [
    "page details by path",
    { command: "get-page-by-path", path: "/pricing" },
    "getPageByPath",
    { path: "/pricing" },
  ],
  [
    "asset details",
    { command: "get-asset", asset: "asset-1" },
    "getAsset",
    { assetId: "asset-1" },
  ],
] satisfies Array<
  readonly [
    string,
    Parameters<typeof apiCommand>[0],
    string,
    Record<string, unknown>?,
  ]
>;

test.each(simpleCommandCases)(
  "calls %s",
  async (_name, options, callName, connection) => {
    await expectCommandCall({
      options,
      call: apiCalls[callName],
      connection: connection ?? {},
    });
  }
);

test("routes local-capable commands through project session runtime", async () => {
  mockConfig();

  await apiCommand({ command: "list-pages", json: true }, dependencies);

  const session = createCliProjectSession.mock.results[0]?.value;
  expect(session.read).toHaveBeenCalledWith(
    "pages.list",
    {
      projectId: "project-1",
    },
    {
      permit: "view",
    }
  );
});

test("routes server-only commands through project session transport", async () => {
  mockConfig();

  await apiCommand({ command: "whoami", json: true }, dependencies);

  const session = createCliProjectSession.mock.results[0]?.value;
  expect(session.executeServerOperation).toHaveBeenCalledWith(
    {
      id: "auth.me",
      invalidatesNamespaces: [],
      refetchInvalidatedNamespaces: false,
    },
    {}
  );
});

test("passes refresh to local-capable command session", async () => {
  mockConfig();

  await apiCommand(
    { command: "list-pages", refresh: true, json: true },
    dependencies
  );

  const session = createCliProjectSession.mock.results[0]?.value;
  expect(session.refresh).toHaveBeenCalledWith(["pages"]);
  expect(session.read).toHaveBeenCalledWith(
    "pages.list",
    { projectId: "project-1" },
    { permit: "view" }
  );
});

test("passes dry-run to local-capable mutations", async () => {
  mockConfig();

  await apiCommand(
    {
      command: "create-folder",
      name: "Draft",
      slug: "draft",
      dryRun: true,
      json: true,
    },
    dependencies
  );

  const session = createCliProjectSession.mock.results[0]?.value;
  expect(session.mutate).toHaveBeenCalledWith(
    "folders.create",
    {
      projectId: "project-1",
      name: "Draft",
      slug: "draft",
      parentFolderId: undefined,
    },
    { permit: "build", dryRun: true }
  );
});

test("calls build snapshot for configured project", async () => {
  await expectCommandCall({
    options: {
      command: "snapshot",
      include: ["pages", "designTokens"],
      version: 3,
    },
    call: apiCalls.getBuildSnapshot,
    connection: { include: ["pages", "designTokens"], version: 3 },
  });
});

test("runs a focused project audit", async () => {
  await expectCommandCall({
    options: {
      command: "audit",
      scopes: ["accessibility", "seo"],
      severities: ["error", "warning"],
      pagePath: "/pricing",
      limit: 25,
      cursor: "cursor-1",
      verbose: true,
    },
    call: apiCalls.audit,
    connection: {
      scopes: ["accessibility", "seo"],
      severities: ["error", "warning"],
      pageId: undefined,
      pagePath: "/pricing",
      limit: 25,
      cursor: "cursor-1",
      verbose: true,
    },
  });
});

test("parses the documented repeated audit scope options", async () => {
  const parsed = await auditCommandOptions(
    makeCLI([]).exitProcess(false) as unknown as CommonYargsArgv
  ).parseAsync([
    "--scopes",
    "accessibility",
    "--scopes",
    "seo",
    "--page-path",
    "/pricing",
  ]);

  expect(parsed).toMatchObject({
    scopes: ["accessibility", "seo"],
    pagePath: "/pricing",
  });
});

test("accepts the opt-in Craft audit scope", async () => {
  const parsed = await auditCommandOptions(
    makeCLI([]).exitProcess(false) as unknown as CommonYargsArgv
  ).parseAsync(["--scopes", "craft"]);

  expect(parsed).toMatchObject({ scopes: ["craft"] });
});

test("prints a compact project audit without --json", async () => {
  mockConfig();
  apiCalls.audit.mockResolvedValueOnce({
    summary: {
      total: 1,
      selectedTotal: 1,
      bySeverity: { error: 1, warning: 0, info: 0 },
    },
    findings: [
      {
        severity: "error",
        scope: "accessibility",
        ruleId: "missing-alt",
        message: "Image has no alt prop.",
        location: { instanceId: "image-1" },
      },
    ],
    skippedCheckCount: 0,
    manualCheckCount: 3,
    nextCursor: null,
  });

  await apiCommand({ command: "audit" }, dependencies);

  expect(console.info).toHaveBeenCalledWith(
    "Audit: 1 findings (1 errors, 0 warnings, 0 info)"
  );
  expect(console.info).toHaveBeenCalledWith(
    "[ERROR] accessibility/missing-alt: Image has no alt prop. (image-1)"
  );
  expect(console.info).toHaveBeenCalledWith("3 manual checks recommended.");
});

test("labels filtered audit totals without implying hidden findings are returned", async () => {
  mockConfig();
  apiCalls.audit.mockResolvedValueOnce({
    summary: {
      total: 5,
      selectedTotal: 1,
      bySeverity: { error: 1, warning: 3, info: 1 },
    },
    findings: [],
    skippedCheckCount: 0,
    manualCheckCount: 0,
    nextCursor: "next",
  });

  await apiCommand({ command: "audit" }, dependencies);

  expect(console.info).toHaveBeenCalledWith(
    "Audit: 1 selected findings (5 across all severities) (1 errors, 3 warnings, 1 info)"
  );
});

test("applies build patch transactions for configured project", async () => {
  await expectCommandCall({
    options: {
      command: "apply-patch",
      baseVersion: 5,
      input: "patch.json",
    },
    call: apiCalls.applyBuildPatch,
    inputJson: patchTransactions,
    connection: { baseVersion: 5, transactions: patchTransactions },
  });
});

test("maps api conflict errors to version conflict json", async () => {
  mockConfig();
  readFile.mockResolvedValueOnce(JSON.stringify(patchTransactions));
  apiCalls.applyBuildPatch.mockRejectedValue(
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

  expectJsonErrorOutput({
    command: "apply-patch",
    code: "VERSION_CONFLICT",
    message: "Build version mismatch",
    retry:
      "Use MCP tool snapshot, read the latest build version, regenerate the patch, then retry MCP tool apply-patch.",
  });
});

test("maps api not found errors to not found json", async () => {
  mockConfig();
  apiCalls.getPage.mockRejectedValue(
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

  expectJsonErrorOutput({
    command: "get-page",
    code: "NOT_FOUND",
    message: "Page not found",
  });
});

test("prints actionable validation issues in CLI JSON", async () => {
  mockConfig();
  const issue = {
    code: "invalid_expression",
    path: ["values", "title"],
    message: "Invalid Webstudio expression",
    constraint: "valid_webstudio_expression",
    example: 'pageTitle ?? "Pricing"',
    detail: "Unexpected token at 1:4",
  };
  apiCalls.getPage.mockRejectedValue(
    Object.assign(new Error("Page input is invalid."), {
      code: "INVALID_INPUT",
      issues: [issue],
    })
  );

  await expect(
    apiCommand(
      { command: "get-page", page: "page-1", json: true },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(getLastJsonOutput()).toEqual({
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message: "Page input is invalid.",
      issues: [issue],
    },
    meta: {
      command: "get-page",
      projectId: "project-1",
      durationMs: expect.any(Number),
    },
  });
});

test("explains missing Builder API access instead of leaking token ownership errors", async () => {
  mockConfig();
  createCliProjectSession.mockImplementationOnce(() => ({
    initialize: vi.fn(async () => {
      throw Object.assign(
        new Error("Project owner can't be found for token token-1"),
        { data: { code: "INTERNAL_SERVER_ERROR" } }
      );
    }),
    refresh: vi.fn(),
    executeServerOperation: vi.fn(),
    read: vi.fn(),
    mutate: vi.fn(),
    snapshot: undefined,
    markStale: vi.fn(),
  }));

  await expect(
    apiCommand(
      {
        command: "list-pages",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expectJsonErrorOutput({
    command: "list-pages",
    code: "UNAUTHORIZED",
    message:
      "This project cannot be accessed through the Builder API with the current share link/token. Enable API access in the share-link settings, then relink the project with `webstudio init --link <share-link> --json`.",
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

  expect(apiCalls.getBuildSnapshot).toHaveBeenCalledWith(
    expectConnection({
      include: ["pages", "instances", "styles"],
      version: undefined,
    })
  );
});

test("creates folder with settings", async () => {
  await expectCommandCall({
    options: {
      command: "create-folder",
      name: "Blog",
      slug: "blog",
      parentFolder: "root-folder",
    },
    call: apiCalls.createFolder,
    connection: {
      name: "Blog",
      slug: "blog",
      parentFolderId: "root-folder",
    },
  });
});

test("updates folder settings", async () => {
  await expectCommandCall({
    options: {
      command: "update-folder",
      folder: "folder-1",
      name: "Blog",
      slug: "blog",
      parentFolder: "root-folder",
    },
    call: apiCalls.updateFolder,
    connection: {
      folderId: "folder-1",
      values: {
        name: "Blog",
        slug: "blog",
        parentFolderId: "root-folder",
      },
    },
  });
});

test("creates page with settings", async () => {
  await expectCommandCall({
    options: {
      command: "create-page",
      name: "Pricing",
      path: "/pricing",
      title: "Pricing",
      parentFolder: "folder-1",
      description: "Plans",
    },
    call: apiCalls.createPage,
    connection: {
      name: "Pricing",
      path: "/pricing",
      title: "Pricing",
      parentFolderId: "folder-1",
      meta: {
        description: "Plans",
        language: undefined,
        redirect: undefined,
        socialImageUrl: undefined,
        socialImageAssetId: undefined,
        excludePageFromSearch: undefined,
        documentType: undefined,
        content: undefined,
        status: undefined,
        auth: undefined,
      },
    },
  });
});

test("updates page metadata", async () => {
  await expectCommandCall({
    options: {
      command: "update-page",
      page: "page-1",
      title: "Pricing",
      excludePageFromSearch: true,
      status: "200",
      authLogin: "user",
      authPassword: "pass",
    },
    call: apiCalls.updatePage,
    connection: {
      pageId: "page-1",
      values: {
        name: undefined,
        path: undefined,
        title: "Pricing",
        parentFolderId: undefined,
        meta: {
          description: undefined,
          language: undefined,
          redirect: undefined,
          socialImageUrl: undefined,
          socialImageAssetId: undefined,
          excludePageFromSearch: true,
          documentType: undefined,
          content: undefined,
          status: "200",
          auth: { method: "basic", login: "user", password: "pass" },
        },
      },
    },
  });
});

test("updates project settings from input file", async () => {
  const input = {
    meta: { siteName: "Acme", faviconAssetId: null },
    compiler: { atomicStyles: true },
  };
  await expectCommandCall({
    options: {
      command: "update-project-settings",
      input: "project-settings.json",
    },
    inputJson: input,
    call: apiCalls.updateProjectSettings,
    connection: input,
  });
});

test("gets marketplace product", async () => {
  await expectCommandCall({
    options: { command: "get-marketplace-product" },
    call: apiCalls.getMarketplaceProduct,
    connection: {},
  });
});

test("updates marketplace product from input file", async () => {
  const input = {
    category: "pageTemplates",
    name: "Acme Template",
    thumbnailAssetId: "asset-id",
    author: "Acme Studio",
    email: "hello@example.com",
    website: "https://example.com",
    issues: "",
    description: "Reusable template project for Acme landing pages.",
  };
  await expectCommandCall({
    options: {
      command: "update-marketplace-product",
      input: "marketplace-product.json",
    },
    inputJson: input,
    call: apiCalls.updateMarketplaceProduct,
    connection: input,
  });
});

test("lists redirects with shared output detail options", async () => {
  await expectCommandCall({
    options: {
      command: "list-redirects",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listRedirects,
    connection: { cursor: "10", limit: 5, verbose: true },
  });
});

test("creates redirect", async () => {
  await expectCommandCall({
    options: {
      command: "create-redirect",
      old: "/old",
      new: "/new",
      status: "301",
    },
    call: apiCalls.createRedirect,
    connection: { old: "/old", new: "/new", status: "301" },
  });
});

test("updates redirect and can clear status", async () => {
  await expectCommandCall({
    options: {
      command: "update-redirect",
      old: "/old",
      newOld: "/older",
      new: "/newer",
      clearStatus: true,
    },
    call: apiCalls.updateRedirect,
    connection: {
      old: "/old",
      values: { old: "/older", new: "/newer", status: null },
    },
  });
});

test("rejects redirect status and clear-status together", async () => {
  mockConfig();
  await expect(
    apiCommand(
      {
        command: "update-redirect",
        old: "/old",
        status: "301",
        clearStatus: true,
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expectJsonErrorOutput({
    command: "update-redirect",
    code: "API_COMMAND_FAILED",
    message: "--clear-status cannot be used with --status.",
  });
  expect(apiCalls.updateRedirect).not.toHaveBeenCalled();
});

test("deletes redirect", async () => {
  await expectCommandCall({
    options: { command: "delete-redirect", old: "/old" },
    call: apiCalls.deleteRedirect,
    connection: { old: "/old" },
  });
});

test("sets redirects from input file", async () => {
  const input = {
    redirects: [{ old: "/old", new: "/new", status: "301" }],
  };
  await expectCommandCall({
    options: { command: "set-redirects", input: "redirects.json" },
    inputJson: input,
    call: apiCalls.setRedirects,
    connection: input,
  });
});

test("lists breakpoints with shared output detail options", async () => {
  await expectCommandCall({
    options: {
      command: "list-breakpoints",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listBreakpoints,
    connection: { cursor: "10", limit: 5, verbose: true },
  });
});

test("creates breakpoint", async () => {
  await expectCommandCall({
    options: {
      command: "create-breakpoint",
      label: "Tablet",
      maxWidth: 991,
    },
    call: apiCalls.createBreakpoint,
    connection: {
      label: "Tablet",
      minWidth: undefined,
      maxWidth: 991,
      condition: undefined,
    },
  });
});

test("updates breakpoint", async () => {
  await expectCommandCall({
    options: {
      command: "update-breakpoint",
      breakpoint: "tablet",
      label: "Tablet",
      maxWidth: 1023,
    },
    call: apiCalls.updateBreakpoint,
    connection: {
      breakpointId: "tablet",
      values: {
        label: "Tablet",
        minWidth: undefined,
        maxWidth: 1023,
        condition: undefined,
      },
    },
  });
});

test("updates breakpoint and can clear media fields", async () => {
  await expectCommandCall({
    options: {
      command: "update-breakpoint",
      breakpoint: "tablet",
      clearMinWidth: true,
      maxWidth: 1023,
      clearCondition: true,
    },
    call: apiCalls.updateBreakpoint,
    connection: {
      breakpointId: "tablet",
      values: {
        label: undefined,
        minWidth: null,
        maxWidth: 1023,
        condition: null,
      },
    },
  });
});

test("rejects breakpoint clear and value options together", async () => {
  mockConfig();
  await expect(
    apiCommand(
      {
        command: "update-breakpoint",
        breakpoint: "tablet",
        minWidth: 768,
        clearMinWidth: true,
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expectJsonErrorOutput({
    command: "update-breakpoint",
    code: "API_COMMAND_FAILED",
    message: "--clear-min-width cannot be used with --min-width.",
  });
  expect(apiCalls.updateBreakpoint).not.toHaveBeenCalled();
});

test("deletes breakpoint with confirmation", async () => {
  await expectCommandCall({
    options: {
      command: "delete-breakpoint",
      breakpoint: "tablet",
      confirm: true,
    },
    call: apiCalls.deleteBreakpoint,
    connection: { breakpointId: "tablet" },
  });
});

test("deletes page", async () => {
  await expectCommandCall({
    options: { command: "delete-page", page: "page-1" },
    call: apiCalls.deletePage,
    connection: { pageId: "page-1" },
  });
});

test("duplicates page", async () => {
  await expectCommandCall({
    options: {
      command: "duplicate-page",
      page: "page-1",
      name: "Pricing Copy",
      path: "/pricing-copy",
      parentFolder: "folder-1",
      substitutions: JSON.stringify({
        text: { London: "Paris" },
        variables: { city: { type: "string", value: "Paris" } },
      }),
    },
    call: apiCalls.duplicatePage,
    connection: {
      pageId: "page-1",
      name: "Pricing Copy",
      path: "/pricing-copy",
      parentFolderId: "folder-1",
      substitutions: {
        text: { London: "Paris" },
        variables: { city: { type: "string", value: "Paris" } },
      },
    },
  });
});

test("lists page templates", async () => {
  await expectCommandCall({
    options: {
      command: "list-page-templates",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listPageTemplates,
    connection: { cursor: "10", limit: 5, verbose: true },
  });
});

test("creates page template", async () => {
  await expectCommandCall({
    options: {
      command: "create-page-template",
      name: "Landing Template",
      title: '"Landing"',
      description: '"Reusable landing layout"',
    },
    call: apiCalls.createPageTemplate,
    connection: {
      name: "Landing Template",
      title: '"Landing"',
      meta: { description: '"Reusable landing layout"' },
    },
  });
});

test("updates page template", async () => {
  await expectCommandCall({
    options: {
      command: "update-page-template",
      template: "template-1",
      name: "Article Template",
      description: '"Reusable article layout"',
    },
    call: apiCalls.updatePageTemplate,
    connection: {
      templateId: "template-1",
      values: {
        name: "Article Template",
        title: undefined,
        meta: { description: '"Reusable article layout"' },
      },
    },
  });
});

test("deletes page template", async () => {
  await expectCommandCall({
    options: {
      command: "delete-page-template",
      template: "template-1",
      confirm: true,
    },
    call: apiCalls.deletePageTemplate,
    connection: { templateId: "template-1" },
  });
});

test("duplicates page template", async () => {
  await expectCommandCall({
    options: {
      command: "duplicate-page-template",
      template: "template-1",
    },
    call: apiCalls.duplicatePageTemplate,
    connection: {
      projectId: "project-1",
      templateId: "template-1",
    },
  });
});

test("reorders page template", async () => {
  await expectCommandCall({
    options: {
      command: "reorder-page-template",
      sourceTemplate: "template-1",
      targetTemplate: "template-2",
      position: "before",
    },
    call: apiCalls.reorderPageTemplate,
    connection: {
      sourceTemplateId: "template-1",
      targetTemplateId: "template-2",
      position: "before",
    },
  });
});

test("creates page from template", async () => {
  await expectCommandCall({
    options: {
      command: "create-page-from-template",
      template: "template-1",
      name: "Landing",
      path: "/landing",
      parentFolder: "folder-1",
    },
    call: apiCalls.createPageFromTemplate,
    connection: {
      projectId: "project-1",
      templateId: "template-1",
      name: "Landing",
      path: "/landing",
      parentFolderId: "folder-1",
    },
  });
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

  expect(apiCalls.getPage).not.toHaveBeenCalled();
  expectJsonErrorOutput({
    command: "get-page",
    code: "INVALID_ARGUMENT",
    message: "--page is required.",
  });
});

test("calls instance list with filters", async () => {
  await expectCommandCall({
    options: {
      command: "list-instances",
      page: "page-1",
      maxDepth: 2,
      topLevel: true,
      component: "Box",
      label: "Hero",
    },
    call: apiCalls.listInstances,
    connection: {
      pageId: "page-1",
      pagePath: undefined,
      rootInstanceId: undefined,
      maxDepth: 2,
      topLevelOnly: true,
      component: "Box",
      tag: undefined,
      labelContains: "Hero",
    },
  });
});

test("inspects instance details", async () => {
  await expectCommandCall({
    options: {
      command: "inspect-instance",
      instance: "instance-1",
      include: ["props,styles,children"],
      childDepth: 2,
    },
    call: apiCalls.inspectInstance,
    connection: {
      instanceId: "instance-1",
      include: ["props", "styles", "children"],
      childDepth: 2,
    },
  });
});

test("inserts component with registered template", async () => {
  await expectCommandCall({
    options: {
      command: "insert-component",
      parent: "parent-id",
      component: "@webstudio-is/sdk-components-react-radix:Switch",
      mode: "prepend",
      insertIndex: 1,
    },
    call: apiCalls.insertComponent,
    connection: {
      parentInstanceId: "parent-id",
      component: "@webstudio-is/sdk-components-react-radix:Switch",
      mode: "prepend",
      insertIndex: 1,
    },
  });
});

test("moves instances from input file", async () => {
  await expectCommandCall({
    options: { command: "move-instance", input: "moves.json" },
    call: apiCalls.moveInstance,
    inputJson: [{ instanceId: "instance-id", parentInstanceId: "parent-id" }],
    connection: {
      moves: [{ instanceId: "instance-id", parentInstanceId: "parent-id" }],
    },
  });
});

test("clones instance", async () => {
  await expectCommandCall({
    options: {
      command: "clone-instance",
      source: "source-id",
      parent: "parent-id",
      insertIndex: 1,
    },
    call: apiCalls.cloneInstance,
    connection: {
      sourceInstanceId: "source-id",
      targetParentInstanceId: "parent-id",
      insertIndex: 1,
    },
  });
});

test("deletes instances", async () => {
  await expectCommandCall({
    options: {
      command: "delete-instance",
      instance: ["instance-1,instance-2"],
    },
    call: apiCalls.deleteInstance,
    connection: { instanceIds: ["instance-1", "instance-2"] },
  });
});

test("rejects empty required list options", async () => {
  mockConfig();

  await expect(
    apiCommand(
      {
        command: "delete-instance",
        instance: [","],
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(apiCalls.deleteInstance).not.toHaveBeenCalled();
  expectJsonErrorOutput({
    command: "delete-instance",
    code: "INVALID_ARGUMENT",
    message: "--instance is required.",
  });
});

test("updates props from input file", async () => {
  const updates = [
    {
      instanceId: "instance-id",
      name: "title",
      type: "string",
      value: "Hello",
    },
  ];
  await expectCommandCall({
    options: { command: "update-props", input: "props.json" },
    call: apiCalls.updateProps,
    inputJson: updates,
    connection: { updates },
  });
});

test("deletes props from input file", async () => {
  await expectCommandCall({
    options: { command: "delete-props", input: "props.json" },
    call: apiCalls.deleteProps,
    inputJson: [{ instanceId: "instance-id", name: "title" }],
    connection: {
      deletions: [{ instanceId: "instance-id", name: "title" }],
    },
  });
});

test("binds props from input file", async () => {
  const bindings = [
    {
      instanceId: "instance-id",
      name: "title",
      binding: { type: "expression", value: "title" },
    },
  ];
  await expectCommandCall({
    options: { command: "bind-props", input: "bindings.json" },
    call: apiCalls.bindProps,
    inputJson: bindings,
    connection: { bindings },
  });
});

test("updates text child", async () => {
  await expectCommandCall({
    options: {
      command: "update-text",
      instance: "instance-1",
      childIndex: 2,
      text: "Launch faster",
      mode: "text",
    },
    call: apiCalls.updateText,
    connection: {
      instanceId: "instance-1",
      childIndex: 2,
      text: "Launch faster",
      mode: "text",
    },
  });
});

test("lists text children with filters", async () => {
  await expectCommandCall({
    options: {
      command: "list-texts",
      page: "page-1",
      instance: "instance-1",
      mode: "expression",
      contains: "headline",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listTexts,
    connection: {
      pageId: "page-1",
      pagePath: undefined,
      instanceId: "instance-1",
      mode: "expression",
      contains: "headline",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
  });
});

test("allows clearing text child", async () => {
  await expectCommandCall({
    options: {
      command: "update-text",
      instance: "instance-1",
      childIndex: 2,
      text: "",
    },
    call: apiCalls.updateText,
    connection: {
      instanceId: "instance-1",
      childIndex: 2,
      text: "",
      mode: undefined,
    },
  });
});

test("creates variable with parsed value", async () => {
  await expectCommandCall({
    options: {
      command: "create-variable",
      scopeInstance: "body-id",
      name: "items",
      valueType: "string[]",
      value: '["a","b"]',
    },
    call: apiCalls.createVariable,
    connection: {
      scopeInstanceId: "body-id",
      name: "items",
      value: { type: "string[]", value: ["a", "b"] },
    },
  });
});

test("lists variables with scope filter", async () => {
  await expectCommandCall({
    options: {
      command: "list-variables",
      scopeInstance: "body-id",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listVariables,
    connection: {
      scopeInstanceId: "body-id",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
  });
});

test("updates variable", async () => {
  await expectCommandCall({
    options: {
      command: "update-variable",
      variable: "variable-id",
      name: "count",
      valueType: "number",
      value: "2",
    },
    call: apiCalls.updateVariable,
    connection: {
      dataSourceId: "variable-id",
      values: {
        scopeInstanceId: undefined,
        name: "count",
        value: { type: "number", value: 2 },
      },
    },
  });
});

test("deletes variable", async () => {
  await expectCommandCall({
    options: { command: "delete-variable", variable: "variable-id" },
    call: apiCalls.deleteVariable,
    connection: { dataSourceId: "variable-id" },
  });
});

test("creates resource from options and exposes data source", async () => {
  await expectCommandCall({
    options: {
      command: "create-resource",
      name: "Posts",
      method: "get",
      url: '"https://api.example.com/posts"',
      scopeInstance: "body-id",
      dataSourceName: "posts",
    },
    call: apiCalls.createResource,
    connection: {
      resource: {
        name: "Posts",
        method: "get",
        url: '"https://api.example.com/posts"',
        body: undefined,
        headers: [],
      },
      scopeInstanceId: "body-id",
      dataSourceName: "posts",
    },
  });
});

test("lists resources with scope filter", async () => {
  await expectCommandCall({
    options: {
      command: "list-resources",
      scopeInstance: "body-id",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listResources,
    connection: {
      scopeInstanceId: "body-id",
      cursor: "10",
      limit: 5,
      verbose: true,
    },
  });
});

test("updates resource from input file", async () => {
  await expectCommandCall({
    options: {
      command: "update-resource",
      resource: "resource-id",
      input: "resource.json",
      name: "Posts",
    },
    call: apiCalls.updateResource,
    inputJson: { headers: [{ name: "Authorization", value: "token" }] },
    connection: {
      resourceId: "resource-id",
      values: {
        name: "Posts",
        method: undefined,
        url: undefined,
        body: undefined,
        headers: [{ name: "Authorization", value: "token" }],
      },
      dataSourceName: undefined,
      scopeInstanceId: undefined,
    },
  });
});

test("deletes resource with force", async () => {
  await expectCommandCall({
    options: {
      command: "delete-resource",
      resource: "resource-id",
      force: true,
    },
    call: apiCalls.deleteResource,
    connection: { resourceId: "resource-id", force: true },
  });
});

test("publishes project", async () => {
  await expectCommandCall({
    options: {
      command: "publish",
      target: "production",
      domain: ["example.com,www.example.com"],
      message: "Ship",
      idempotencyKey: "publish-key",
    },
    call: apiCalls.publish,
    connection: {
      target: "production",
      domains: ["example.com", "www.example.com"],
      message: "Ship",
      idempotencyKey: "publish-key",
    },
  });
});

test("lists publishes", async () => {
  await expectCommandCall({
    options: { command: "list-publishes" },
    call: apiCalls.listPublishes,
  });
});

test("gets publish job", async () => {
  await expectCommandCall({
    options: { command: "get-publish-job", job: "job-id" },
    call: apiCalls.getPublishJob,
    connection: { jobId: "job-id" },
  });
});

test("unpublishes project with confirmation", async () => {
  await expectCommandCall({
    options: {
      command: "unpublish",
      target: "production",
      domain: ["example.com"],
      confirm: true,
    },
    call: apiCalls.unpublish,
    connection: {
      target: "production",
      domains: ["example.com"],
      message: undefined,
      idempotencyKey: undefined,
    },
  });
});

test("lists domains", async () => {
  await expectCommandCall({
    options: { command: "list-domains" },
    call: apiCalls.listDomains,
  });
});

test("creates domain", async () => {
  await expectCommandCall({
    options: { command: "create-domain", domain: "example.com" },
    call: apiCalls.createDomain,
    connection: { domain: "example.com" },
  });
});

test("updates domain", async () => {
  await expectCommandCall({
    options: {
      command: "update-domain",
      domainId: "domain-id",
      domain: "www.example.com",
    },
    call: apiCalls.updateDomain,
    connection: {
      domainId: "domain-id",
      updates: { domain: "www.example.com" },
    },
  });
});

test("deletes domain with confirmation", async () => {
  await expectCommandCall({
    options: { command: "delete-domain", domainId: "domain-id", confirm: true },
    call: apiCalls.deleteDomain,
    connection: { domainId: "domain-id" },
  });
});

test("verifies domain", async () => {
  await expectCommandCall({
    options: { command: "verify-domain", domainId: "domain-id" },
    call: apiCalls.verifyDomain,
    connection: { domainId: "domain-id" },
  });
});

test("calls asset list with pagination", async () => {
  await expectCommandCall({
    options: {
      command: "list-assets",
      type: "image",
      sort: "createdAt",
      withUsage: true,
      cursor: "2",
      limit: 10,
    },
    call: apiCalls.listAssets,
    connection: {
      type: "image",
      sort: "createdAt",
      withUsage: true,
      cursor: "2",
      limit: 10,
    },
  });
});

test("lists fonts with optional system stacks", async () => {
  await expectCommandCall({
    options: {
      command: "list-fonts",
      includeSystem: false,
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listFonts,
    connection: {
      includeSystem: false,
      cursor: "10",
      limit: 5,
      verbose: true,
    },
  });
});

test("uploads asset descriptor with local file reader", async () => {
  mockConfig();
  readFile.mockResolvedValueOnce(
    JSON.stringify({
      name: "image.png",
      type: "image",
      format: "png",
      meta: { width: 10, height: 20 },
    })
  );
  readFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

  await apiCommand(
    {
      command: "upload-asset",
      input: "asset.json",
      assetsDir: "assets",
      json: true,
    },
    dependencies
  );

  expect(apiCalls.uploadProjectAsset).toHaveBeenCalledWith(
    expectConnection({
      asset: {
        name: "image.png",
        type: "image",
        format: "png",
        meta: { width: 10, height: 20 },
      },
      readAssetData: expect.any(Function),
    })
  );
  const call = apiCalls.uploadProjectAsset.mock.calls.at(-1)?.[0];
  await call.readAssetData({ name: "image.png" });
  expect(readFile).toHaveBeenLastCalledWith(
    expect.stringMatching(/assets[/\\]image\.png$/)
  );
  expectJsonOutput("upload-asset");
});

test("uploads asset descriptors with local file reader", async () => {
  await expectCommandCall({
    options: {
      command: "upload-assets",
      input: "assets.json",
    },
    call: apiCalls.uploadProjectAssets,
    inputJson: [
      {
        name: "image.png",
        type: "image",
        format: "png",
        meta: { width: 10, height: 20 },
      },
    ],
    connection: {
      assets: [
        {
          name: "image.png",
          type: "image",
          format: "png",
          meta: { width: 10, height: 20 },
        },
      ],
      readAssetData: expect.any(Function),
    },
  });
});

test("finds asset usage", async () => {
  await expectCommandCall({
    options: {
      command: "find-asset-usage",
      asset: "asset-id",
    },
    call: apiCalls.findAssetUsage,
    connection: { assetId: "asset-id" },
  });
});

test("replaces asset with confirmation", async () => {
  await expectCommandCall({
    options: {
      command: "replace-asset",
      from: "old-asset-id",
      to: "new-asset-id",
      confirm: true,
    },
    call: apiCalls.replaceAsset,
    connection: {
      fromAssetId: "old-asset-id",
      toAssetId: "new-asset-id",
    },
  });
});

test("deletes assets with confirmation", async () => {
  await expectCommandCall({
    options: {
      command: "delete-asset",
      asset: ["asset-id,asset-prefix"],
      confirm: true,
      force: true,
    },
    call: apiCalls.deleteAssets,
    connection: {
      assetIdsOrPrefixes: ["asset-id", "asset-prefix"],
      force: true,
    },
  });
});

test("passes style token inclusion through to the api", async () => {
  await expectCommandCall({
    options: {
      command: "get-styles",
      instance: "instance-1",
      includeTokens: true,
    },
    call: apiCalls.getStyleDeclarations,
    connection: {
      instanceIds: ["instance-1"],
      pageId: undefined,
      pagePath: undefined,
      breakpoint: undefined,
      state: undefined,
      property: undefined,
      propertyFilter: undefined,
      includeTokens: true,
      cursor: undefined,
      limit: undefined,
      verbose: undefined,
    },
  });
});

test("lists design tokens with filters", async () => {
  await expectCommandCall({
    options: {
      command: "list-design-tokens",
      filter: "brand",
      verbose: true,
      withUsage: true,
      sort: "usage",
    },
    call: apiCalls.listDesignTokens,
    connection: {
      filter: "brand",
      withUsage: true,
      sort: "usage",
      cursor: undefined,
      limit: undefined,
      verbose: true,
    },
  });
});

test("updates styles from input file", async () => {
  const updates = [
    {
      instanceId: "instance-id",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ];
  await expectCommandCall({
    options: { command: "update-styles", input: "styles.json" },
    call: apiCalls.updateStyleDeclarations,
    inputJson: updates,
    connection: { updates },
  });
});

test("deletes styles from input file", async () => {
  await expectCommandCall({
    options: { command: "delete-styles", input: "styles.json" },
    call: apiCalls.deleteStyleDeclarations,
    inputJson: [{ instanceId: "instance-id", property: "color" }],
    connection: {
      deletions: [{ instanceId: "instance-id", property: "color" }],
    },
  });
});

test("replaces styles from input file", async () => {
  const inputJson = {
    property: "color",
    fromValue: { type: "keyword", value: "red" },
    toValue: { type: "keyword", value: "blue" },
  };
  await expectCommandCall({
    options: { command: "replace-styles", input: "replace.json" },
    call: apiCalls.replaceStyleValues,
    inputJson,
    connection: inputJson,
  });
});

test("creates design tokens from input file", async () => {
  const tokens = [
    {
      name: "Primary",
      styles: { color: { type: "keyword", value: "red" } },
    },
  ];
  await expectCommandCall({
    options: { command: "create-design-token", input: "tokens.json" },
    call: apiCalls.createDesignTokens,
    inputJson: tokens,
    connection: { tokens },
  });
});

test("imports design tokens from input file", async () => {
  const inputJson = {
    source: {
      format: "dtcg",
      document: {
        color: {
          brand: { $type: "color", $value: "#0066ff" },
        },
      },
    },
    mapping: {
      color: { target: "design-token", property: "color" },
    },
  };
  await expectCommandCall({
    options: { command: "import-design-tokens", input: "tokens.json" },
    call: apiCalls.importDesignTokens,
    inputJson,
    connection: inputJson,
  });
});

test("updates design token styles from input file", async () => {
  const updates = [
    { property: "color", value: { type: "keyword", value: "blue" } },
  ];
  await expectCommandCall({
    options: {
      command: "update-design-token-styles",
      designToken: "token-id",
      input: "styles.json",
    },
    call: apiCalls.updateDesignTokenStyles,
    inputJson: updates,
    connection: { designTokenId: "token-id", updates },
  });
});

test("deletes design token styles from input file", async () => {
  await expectCommandCall({
    options: {
      command: "delete-design-token-styles",
      designToken: "token-id",
      input: "styles.json",
    },
    call: apiCalls.deleteDesignTokenStyles,
    inputJson: [{ property: "color" }],
    connection: {
      designTokenId: "token-id",
      deletions: [{ property: "color" }],
    },
  });
});

test("attaches design token from input file", async () => {
  await expectCommandCall({
    options: {
      command: "attach-design-token",
      designToken: "token-id",
      input: "instances.json",
      position: "before-local",
    },
    call: apiCalls.attachDesignToken,
    inputJson: ["instance-id"],
    connection: {
      designTokenId: "token-id",
      instanceIds: ["instance-id"],
      position: "before-local",
    },
  });
});

test("detaches design token from input file", async () => {
  await expectCommandCall({
    options: {
      command: "detach-design-token",
      designToken: "token-id",
      input: "instances.json",
    },
    call: apiCalls.detachDesignToken,
    inputJson: ["instance-id"],
    connection: { designTokenId: "token-id", instanceIds: ["instance-id"] },
  });
});

test("extracts design token from input file", async () => {
  const inputJson = {
    instanceIds: ["instance-id"],
    name: "Extracted",
    removeLocalProps: ["color"],
  };
  await expectCommandCall({
    options: { command: "extract-design-token", input: "token.json" },
    call: apiCalls.extractDesignToken,
    inputJson,
    connection: inputJson,
  });
});

test("lists css variables", async () => {
  await expectCommandCall({
    options: {
      command: "list-css-variables",
      withUsage: true,
      cursor: "10",
      limit: 5,
      verbose: true,
    },
    call: apiCalls.listCssVariables,
    connection: {
      filter: undefined,
      withUsage: true,
      cursor: "10",
      limit: 5,
      verbose: true,
    },
  });
});

test("defines css variables from input file", async () => {
  await expectCommandCall({
    options: {
      command: "define-css-variable",
      input: "vars.json",
      overwrite: true,
    },
    call: apiCalls.defineCssVariables,
    inputJson: { "--brand-color": "red" },
    connection: { vars: { "--brand-color": "red" }, overwrite: true },
  });
});

test("deletes css variables from input file", async () => {
  await expectCommandCall({
    options: {
      command: "delete-css-variable",
      input: "names.json",
      confirm: true,
      force: true,
    },
    call: apiCalls.deleteCssVariables,
    inputJson: ["--brand-color"],
    connection: { names: ["--brand-color"], force: true },
  });
});

test("rewrites css variable refs from input file", async () => {
  await expectCommandCall({
    options: {
      command: "rewrite-css-variable-refs",
      input: "variables.json",
      scopeRegex: "body",
    },
    call: apiCalls.rewriteCssVariableRefs,
    inputJson: { "--brand-color": "--accent-color" },
    connection: {
      map: { "--brand-color": "--accent-color" },
      scopeRegex: "body",
    },
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

  expect(apiCalls.getApiTokenInfo).toHaveBeenCalledWith(
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

  expect(apiCalls.getApiTokenInfo).not.toHaveBeenCalled();
  expectJsonErrorOutput({
    command: "whoami",
    code: "NOT_INITIALIZED",
    message:
      "Local config file is not found. Run webstudio init --link <api-share-link> from a Webstudio project.",
    projectId: false,
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

  expect(apiCalls.getProjectInfo).not.toHaveBeenCalled();
  expectJsonErrorOutput({
    command: "inspect",
    code: "NOT_INITIALIZED",
    message:
      "Project config is not found. Run webstudio init --link <api-share-link>.",
    projectId: false,
  });
});
