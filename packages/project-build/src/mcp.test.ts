import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { builderPatchTransactionSchema } from "./contracts/patch";
import { runtimeOperationContracts } from "./contracts/builder-runtime";
import { getInputSchemaMetadata } from "./contracts/input-schema";
import { pageExpressionFieldHint, pageStatusFieldHint } from "./runtime/pages";
import { imageDescriptionsSetInput } from "./runtime/assets";
import { BuilderRuntimeError } from "./runtime/errors";
import {
  createProjectSessionMcpCore,
  createProjectSessionMcpServer,
  hiddenMcpOperationCommands,
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
  type PublicMcpOperation,
  type ProjectSessionMcpGuidance,
} from "./mcp";
import { getComponentTemplates } from "./runtime/component-templates";
import { createEmptyWebstudioFragment } from "./runtime/component-template";
import {
  projectSessionBusyMessage,
  type ProjectSessionEnvelope,
} from "./project-session";
import { diffPngFiles } from "./visual/screenshot-diff";
import { createPng, paintRect, writePng } from "./visual/screenshot.test-utils";

type CreateProjectSession = NonNullable<
  Parameters<typeof createProjectSessionMcpCore>[0]["createProjectSession"]
>;

type ExecuteOperation = NonNullable<
  Parameters<typeof createProjectSessionMcpCore>[0]["executeOperation"]
>;

type TestSession = ReturnType<CreateProjectSession>;

type TestPublicMcpOperation = Pick<
  PublicMcpOperation,
  "command" | "id" | "description"
> &
  Partial<PublicMcpOperation>;

const runtimeContractById = new Map<
  string,
  (typeof runtimeOperationContracts)[number]
>(runtimeOperationContracts.map((contract) => [contract.id, contract]));

const publicOperation = (
  operation: TestPublicMcpOperation
): PublicMcpOperation => {
  const { inputSchema = getTestInputSchema(z.object({})), ...operationFields } =
    operation;
  const merged: Omit<PublicMcpOperation, "inputSchema"> = {
    method: "query",
    permit: "view",
    localCapable: true,
    serverOnly: false,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
    requiresConfirm: false,
    outputSchema: runtimeContractById.get(operation.id)?.outputSchema,
    ...operationFields,
  };
  return { ...merged, inputSchema };
};

const getTestInputSchema = (inputSchema: z.ZodTypeAny) =>
  getInputSchemaMetadata(inputSchema).inputJsonSchema;

const getSchemaProperties = (schema: unknown) =>
  (schema as { properties?: Record<string, unknown> }).properties ?? {};

const expectPageStatusInputSchema = (schema: unknown) => {
  expect(schema).toMatchObject({
    description: pageStatusFieldHint,
    anyOf: expect.arrayContaining([
      expect.objectContaining({ type: "number" }),
      expect.objectContaining({ type: "string" }),
    ]),
  });
};

const getSuccessfulOutputDataSchema = (schema: unknown) => {
  const variants = (schema as { oneOf?: unknown[] }).oneOf ?? [];
  const success = variants.find(
    (variant) =>
      getSchemaProperties(variant).ok !== undefined &&
      (getSchemaProperties(variant).ok as { const?: unknown }).const === true
  );
  return getSchemaProperties(success).data;
};

const getUnresolvedLocalSchemaRefs = (
  schema: unknown,
  root = schema,
  path: readonly string[] = []
): string[] => {
  if (schema === null || typeof schema !== "object") {
    return [];
  }
  const object = schema as Record<string, unknown>;
  const ref = object.$ref;
  const unresolved =
    typeof ref === "string" && ref.startsWith("#/")
      ? ref
          .slice(2)
          .split("/")
          .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
          .reduce<unknown>(
            (value, segment) =>
              value !== null && typeof value === "object"
                ? (value as Record<string, unknown>)[segment]
                : undefined,
            root
          ) === undefined
        ? [`${path.join(".")}: ${ref}`]
        : []
      : [];
  return [
    ...unresolved,
    ...Object.entries(object).flatMap(([key, value]) =>
      getUnresolvedLocalSchemaRefs(value, root, [...path, key])
    ),
  ];
};

const optionalArrayFieldInputSchema = (field: string) =>
  getTestInputSchema(
    z.object({
      [field]: z.array(z.unknown()).optional(),
    })
  );

const styleOperation = (
  operation: TestPublicMcpOperation & {
    readNamespaces: PublicMcpOperation["readNamespaces"];
  }
): PublicMcpOperation =>
  publicOperation({
    method: "mutation",
    permit: "edit",
    writeNamespaces: ["styles"],
    invalidatesNamespaces: ["styles"],
    retryOnConflict: true,
    ...operation,
  });

const publicMcpOperations: readonly PublicMcpOperation[] = [
  publicOperation({
    command: "list-pages",
    id: "pages.list",
    description: "List pages",
    inputSchema: getTestInputSchema(
      z.object({ includeFolders: z.boolean().optional() })
    ),
    readNamespaces: ["pages"],
  }),
  publicOperation({
    command: "get-page-by-path",
    id: "pages.getByPath",
    description: "Get page by path",
    inputSchema: getTestInputSchema(z.object({ path: z.string() })),
    readNamespaces: ["pages"],
  }),
  publicOperation({
    command: "audit",
    id: "project.audit",
    description: "Audit project quality",
    inputSchema: getTestInputSchema(
      z.object({
        scopes: z
          .array(
            z.enum([
              "accessibility",
              "security",
              "seo",
              "assets",
              "styles",
              "performance",
            ])
          )
          .optional(),
        severities: z.array(z.enum(["error", "warning", "info"])).optional(),
        pageId: z.string().optional(),
        pagePath: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().optional(),
        verbose: z.boolean().optional(),
      })
    ),
    outputSchema: getTestInputSchema(
      z.discriminatedUnion("verbose", [
        z.object({
          contractVersion: z.literal(2),
          projectVersion: z.number(),
          verbose: z.literal(false),
          findings: z.array(z.unknown()),
          renderedCheckCount: z.number(),
          renderedIssueCount: z.number(),
          renderedFailureCount: z.number(),
        }),
        z.object({
          contractVersion: z.literal(2),
          projectVersion: z.number(),
          verbose: z.literal(true),
          findings: z.array(z.unknown()),
          renderedCheckCount: z.number(),
          renderedIssueCount: z.number(),
          renderedFailureCount: z.number(),
          renderedChecks: z.array(z.unknown()),
          renderedFailures: z.array(z.unknown()),
        }),
      ])
    ),
    readNamespaces: [
      "pages",
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
      "resources",
      "dataSources",
      "assets",
      "breakpoints",
    ],
  }),
  publicOperation({
    command: "verify-bindings",
    id: "project.verifyBindings",
    description: "Verify persisted bindings",
    inputSchema: getTestInputSchema(
      z.object({
        pagePath: z.string().optional(),
        instanceId: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    ),
    readNamespaces: ["pages", "instances", "props", "resources", "dataSources"],
  }),
  publicOperation({
    command: "list-breakpoints",
    id: "breakpoints.list",
    description: "List breakpoints",
    readNamespaces: ["breakpoints"],
  }),
  publicOperation({
    command: "list-design-tokens",
    id: "designTokens.list",
    description: "List design tokens",
    readNamespaces: ["styleSources", "styles"],
  }),
  publicOperation({
    command: "whoami",
    id: "auth.me",
    description: "Identify token",
    localCapable: false,
    serverOnly: true,
  }),
  publicOperation({
    command: "list-instances",
    id: "instances.list",
    description: "List instances",
    inputSchema: getTestInputSchema(
      z.object({
        rootInstanceId: z.string().optional(),
        maxDepth: z.number().int().nonnegative().optional(),
      })
    ),
    readNamespaces: ["pages", "instances", "props"],
  }),
  publicOperation({
    command: "insert-fragment",
    id: "instances.insertFragment",
    method: "mutation",
    permit: "build",
    description: "Insert fragment",
    inputSchema: getTestInputSchema(
      z.object({
        parentInstanceId: z.string(),
        fragment: z.unknown(),
        mode: z.enum(["append", "prepend", "replace"]).optional(),
        insertIndex: z.number().optional(),
      })
    ),
    readNamespaces: ["pages", "instances"],
    writeNamespaces: ["instances", "props", "styles"],
    invalidatesNamespaces: ["instances", "props", "styles"],
  }),
  publicOperation({
    command: "insert-collection",
    id: "instances.insertCollection",
    method: "mutation",
    permit: "build",
    description: "Insert a semantic Collection",
    readNamespaces: ["pages", "instances", "dataSources"],
    writeNamespaces: ["instances", "props", "dataSources"],
    invalidatesNamespaces: ["instances", "props", "dataSources"],
  }),
  publicOperation({
    command: "list-texts",
    id: "texts.list",
    description: "List text children",
    inputSchema: getTestInputSchema(
      z.object({
        pagePath: z.string().optional(),
      })
    ),
    readNamespaces: ["pages", "instances"],
  }),
  publicOperation({
    command: "update-text",
    id: "texts.update",
    method: "mutation",
    permit: "edit",
    description: "Update text child",
    inputSchema: getTestInputSchema(
      z.object({
        instanceId: z.string(),
        childIndex: z.number(),
        text: z.string(),
      })
    ),
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
    invalidatesNamespaces: ["instances"],
  }),
  publicOperation({
    command: "publish",
    id: "build.publish",
    method: "mutation",
    permit: "build",
    description: "Publish project",
    inputSchema: getTestInputSchema(
      z.object({
        target: z.string().optional(),
        domains: z.array(z.string()).optional(),
      })
    ),
    localCapable: false,
    serverOnly: true,
  }),
  publicOperation({
    command: "delete-instance",
    id: "instances.delete",
    method: "mutation",
    permit: "edit",
    description: "Delete instances",
    inputSchema: getTestInputSchema(
      z.object({
        instanceIds: z.array(z.string()),
      })
    ),
    writeNamespaces: ["instances"],
    invalidatesNamespaces: ["instances"],
    requiresConfirm: true,
  }),
  publicOperation({
    command: "move-instance",
    id: "instances.move",
    method: "mutation",
    permit: "edit",
    description: "Move instances",
    inputSchema: getTestInputSchema(
      z.object({
        moves: z.array(z.unknown()),
      })
    ),
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
    invalidatesNamespaces: ["instances"],
  }),
  publicOperation({
    command: "clone-instance",
    id: "instances.clone",
    method: "mutation",
    permit: "edit",
    description: "Clone instance subtree",
    inputSchema: getTestInputSchema(
      z.object({
        sourceInstanceId: z.string(),
        targetParentInstanceId: z.string(),
      })
    ),
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
    invalidatesNamespaces: ["instances"],
  }),
  publicOperation({
    command: "update-page",
    id: "pages.update",
    method: "mutation",
    permit: "edit",
    description: "Update page",
    inputSchema: getTestInputSchema(
      z.object({
        pageId: z.string(),
        values: z.object({
          title: z.string().optional(),
          meta: z
            .object({
              description: z.string().optional(),
            })
            .optional(),
          custom: z.record(z.string(), z.unknown()).optional(),
        }),
      })
    ),
    writeNamespaces: ["pages"],
    invalidatesNamespaces: ["pages"],
  }),
  styleOperation({
    command: "update-styles",
    id: "styles.updateDeclarations",
    description: "Update styles",
    readNamespaces: ["styles"],
    inputSchema: getTestInputSchema(
      z.object({
        updates: z.array(
          z.object({
            instanceId: z.string(),
            property: z.string(),
            value: z.unknown(),
          })
        ),
      })
    ),
  }),
  styleOperation({
    command: "attach-design-token",
    id: "designTokens.attach",
    description: "Attach a reusable style token",
    readNamespaces: ["styleSources", "styleSourceSelections"],
    writeNamespaces: ["styleSourceSelections"],
    invalidatesNamespaces: ["styleSourceSelections"],
    inputSchema: getTestInputSchema(
      z.object({
        designTokenId: z.string(),
        instanceIds: z.array(z.string()).min(1),
        position: z.enum(["before-local", "after-local"]).optional(),
      })
    ),
  }),
  publicOperation({
    command: "apply-patch",
    id: "build.applyPatch",
    method: "mutation",
    permit: "build",
    description: "Apply patch",
    inputSchema: getTestInputSchema(
      z.object({
        transactions: z.array(builderPatchTransactionSchema),
      })
    ),
    localCapable: false,
    serverOnly: true,
  }),
  publicOperation({
    command: "set-image-descriptions",
    id: "assets.setImageDescriptions",
    method: "mutation",
    permit: "edit",
    description: "Save agent-generated image descriptions",
    inputSchema: getTestInputSchema(imageDescriptionsSetInput),
    readNamespaces: ["assets"],
    writeNamespaces: ["assets"],
    invalidatesNamespaces: ["assets"],
  }),
  publicOperation({
    command: "replace-asset",
    id: "assets.replace",
    method: "mutation",
    permit: "edit",
    description: "Replace asset references",
    inputSchema: getTestInputSchema(
      z.object({
        fromAssetId: z.string(),
        toAssetId: z.string(),
      })
    ),
    readNamespaces: ["assets"],
    writeNamespaces: ["assets", "props", "styles"],
    invalidatesNamespaces: ["assets", "props", "styles"],
  }),
  styleOperation({
    command: "delete-styles",
    id: "styles.deleteDeclarations",
    description: "Delete styles",
    inputSchema: optionalArrayFieldInputSchema("deletions"),
    readNamespaces: ["styles"],
  }),
  styleOperation({
    command: "update-design-token-styles",
    id: "designTokens.updateStyles",
    description: "Update design token styles",
    inputSchema: getTestInputSchema(
      z.object({
        designTokenId: z.string().optional(),
        updates: z.array(z.unknown()).optional(),
      })
    ),
    readNamespaces: ["styleSources", "styles"],
  }),
  styleOperation({
    command: "delete-design-token-styles",
    id: "designTokens.deleteStyles",
    description: "Delete design token styles",
    inputSchema: getTestInputSchema(
      z.object({
        designTokenId: z.string().optional(),
        deletions: z.array(z.unknown()).optional(),
      })
    ),
    readNamespaces: ["styleSources", "styles"],
  }),
];

const testMcpGuidance: ProjectSessionMcpGuidance = {
  visualVerificationRule:
    "Verify rendered visual/design work before finishing.",
  getVisionVerificationLoop: ({ includeDiff }) =>
    [
      "Make focused changes.",
      "Start preview.",
      "Install dependencies if missing.",
      'Call screenshot with { path: "/" } or the changed page path.',
      includeDiff ? "Use screenshot.diff when a baseline exists." : undefined,
      "Inspect the PNG with vision.",
    ].filter((step): step is string => step !== undefined),
  getVisionWorkflowSummary: ({ includeDiff }) =>
    includeDiff
      ? "Visual workflow with screenshot diff."
      : "Visual workflow without screenshot diff.",
};

const tesseractInstallUrl =
  "https://tesseract-ocr.github.io/tessdoc/Installation.html";

const createEnvelope = (
  overrides: Partial<ProjectSessionEnvelope> & {
    operationId: string;
    result: unknown;
  }
): ProjectSessionEnvelope => ({
  projectId: "project-1",
  buildId: "build-1",
  version: 1,
  source: "local",
  state: { committed: false, freshness: {} },
  namespaces: {
    read: [],
    write: [],
    invalidated: [],
    missing: [],
  },
  diagnostics: [],
  ...overrides,
});

const createSession = (overrides: Partial<TestSession> = {}): TestSession => ({
  initialize: vi.fn(async () =>
    createEnvelope({
      operationId: "project-session.status",
      result: { loaded: true },
    })
  ),
  refresh: vi.fn(async () =>
    createEnvelope({
      operationId: "project-session.refresh",
      result: { refreshedNamespaces: [] },
    })
  ),
  reset: vi.fn(async () =>
    createEnvelope({
      operationId: "project-session.reset",
      result: { loaded: false },
    })
  ),
  ...overrides,
});

const createSessionFactory = (session = createSession()) =>
  vi.fn(() => session) as CreateProjectSession;

const createExecuteOperation = (
  implementation: ExecuteOperation = async () =>
    createEnvelope({
      operationId: "test.operation",
      result: undefined,
    })
): ExecuteOperation => vi.fn(implementation);

const createTestMcpCore = ({
  operationId,
  result,
  session,
}: {
  operationId: string;
  result: unknown;
  session?: TestSession;
}) => {
  const executeOperation = createExecuteOperation(async () =>
    createEnvelope({ operationId, result })
  );
  const adapter = createProjectSessionMcpCore({
    operations: publicMcpOperations,
    createProjectSession: createSessionFactory(session),
    executeOperation,
  });
  return { adapter, executeOperation };
};

const createConnectedClient = async (
  server: Awaited<ReturnType<typeof createProjectSessionMcpServer>>
) => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
};

describe("project session mcp adapter", () => {
  test("lists restore-point tools only when the host supports them", () => {
    const restorePointToolNames = new Set([
      "create-restore-point",
      "list-restore-points",
      "delete-restore-point",
      "revert-to-restore-point",
    ]);
    expect(
      listProjectSessionMcpTools(publicMcpOperations).some((tool) =>
        restorePointToolNames.has(tool.name)
      )
    ).toBe(false);
    expect(
      listProjectSessionMcpTools(publicMcpOperations, {
        includeRestorePoints: true,
      })
        .filter((tool) => restorePointToolNames.has(tool.name))
        .map((tool) => tool.name)
    ).toEqual([
      "create-restore-point",
      "list-restore-points",
      "delete-restore-point",
      "revert-to-restore-point",
    ]);
  });

  test("requires explicit confirmation before deleting a restore point", async () => {
    const deleteRestorePoint = vi.fn(async () => ({ deleted: true }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      restorePoints: {
        create: vi.fn(),
        list: vi.fn(),
        delete: deleteRestorePoint,
        revert: vi.fn(),
      },
    });

    await expect(
      adapter.callTool({
        name: "delete-restore-point",
        input: { id: "point-1" },
      })
    ).rejects.toThrow();

    const result = await adapter.callTool({
      name: "delete-restore-point",
      input: { id: "point-1", confirm: true },
    });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: { deleted: true },
    });
    expect(deleteRestorePoint).toHaveBeenCalledWith({ id: "point-1" });
  });

  test("requires a matching confirmation token before reverting", async () => {
    const revert = vi.fn(
      async (_input: { id: string }, options: { dryRun: boolean }) =>
        createEnvelope({
          operationId: "project-session.restore-point.revert",
          result: { restoredNamespaces: ["pages"] },
          source: options.dryRun ? "dry-run" : "local",
          state: { committed: options.dryRun === false, freshness: {} },
          transaction: {
            id: "restore",
            payload: [
              {
                namespace: "pages",
                patches: [{ op: "replace", path: [], value: {} }],
              },
            ],
          },
        })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      restorePoints: {
        create: vi.fn(),
        list: vi.fn(),
        delete: vi.fn(),
        revert,
      },
    });

    const planned = await adapter.callTool({
      name: "revert-to-restore-point",
      input: { id: "point-1", dryRun: true },
    });
    const confirmation = planned.structuredContent.meta.confirmation as {
      token: string;
    };
    expect(confirmation.token).toBeTypeOf("string");
    const committed = await adapter.callTool({
      name: "revert-to-restore-point",
      input: {
        id: "point-1",
        confirmDestructive: true,
        confirmationToken: confirmation.token,
      },
    });

    expect(committed.structuredContent.ok).toBe(true);
    expect(revert).toHaveBeenLastCalledWith(
      { id: "point-1" },
      { dryRun: false }
    );
  });

  test("lists tools from the public operation catalog", () => {
    const tools = listProjectSessionMcpTools(publicMcpOperations);
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).toEqual([
      ...publicMcpOperations
        .map((operation) => operation.command)
        .filter((command) => hiddenMcpOperationCommands.has(command) === false),
      "meta.index",
      "meta.guide",
      "workflow.next",
      "meta.get_more_tools",
      "checkpoint.ack",
      "components.summary",
      "components.list",
      "components.coverage-plan",
      "components.coverage-status",
      "components.coverage-insert-next",
      "components.find",
      "components.search",
      "components.get",
      "templates.list",
      "templates.get",
      "status",
      "refresh",
      "reset-session",
    ]);
    expect(toolNames).toContain("insert-fragment");
    const assetOperationTools = listProjectSessionMcpTools(
      runtimeOperationContracts
        .filter(
          ({ id }) =>
            id.startsWith("assetFolders.") ||
            id === "assets.get" ||
            id === "assets.duplicate"
        )
        .map((contract) =>
          publicOperation({
            command: contract.command,
            id: contract.id,
            method: contract.kind === "read" ? "query" : "mutation",
            permit: contract.kind === "read" ? "view" : "build",
            description:
              contract.id === "assetFolders.duplicate"
                ? "Recursively duplicate an asset folder"
                : contract.command,
            inputSchema: contract.inputSchema,
            readNamespaces: contract.readNamespaces,
            writeNamespaces: contract.writeNamespaces,
            invalidatesNamespaces: contract.invalidatesNamespaces,
            retryOnConflict: contract.retryOnConflict,
          })
        )
    );
    const assetOperationToolNames = assetOperationTools.map(({ name }) => name);
    expect(assetOperationToolNames).toEqual(
      expect.arrayContaining([
        "list-asset-folders",
        "create-asset-folder",
        "update-asset-folder",
        "duplicate-asset-folder",
        "delete-asset-folder",
        "get-asset",
        "duplicate-asset",
      ])
    );
    expect(toolNames).not.toContain("copy-page");
    expect(
      assetOperationTools.find(({ name }) => name === "duplicate-asset-folder")
    ).toMatchObject({
      description: expect.stringContaining("Recursively duplicate"),
      inputSchema: expect.objectContaining({ required: ["folderId"] }),
    });
    expect(
      JSON.stringify(
        assetOperationTools.find(({ name }) => name === "update-asset-folder")
          ?.inputSchema
      )
    ).toContain('"type":"null"');
    for (const operation of publicMcpOperations) {
      if (
        hiddenMcpOperationCommands.has(operation.command) ||
        runtimeContractById.has(operation.id) === false
      ) {
        continue;
      }
      expect(
        tools.find((tool) => tool.name === operation.command)?.outputSchema,
        `Missing MCP output schema for ${operation.command}`
      ).toBeDefined();
    }
    const imageDescriptionsTool = tools.find(
      (tool) => tool.name === "set-image-descriptions"
    );
    expect(imageDescriptionsTool).toMatchObject({
      description: expect.stringContaining(
        "agent-generated image descriptions"
      ),
      inputSchema: expect.objectContaining({
        required: ["updates"],
      }),
    });
    expect(JSON.stringify(imageDescriptionsTool?.inputSchema)).toContain(
      "decorative"
    );
    expect(
      getSchemaProperties(
        tools.find((tool) => tool.name === "audit")?.inputSchema
      )
    ).not.toHaveProperty("rendered");
    const visualTools = listProjectSessionMcpTools(publicMcpOperations, {
      includeScreenshot: true,
      includePreview: true,
    });
    const completeTools = listProjectSessionMcpTools(publicMcpOperations, {
      includeImport: true,
      includeDownloadAsset: true,
      includeScreenshot: true,
      includeScreenshotDiff: true,
      includeInstallOcr: true,
      includePreview: true,
    });
    expect(completeTools.map(({ name }) => name)).toContain("download-asset");
    for (const tool of completeTools) {
      expect(
        tool.inputSchema.additionalProperties,
        `MCP input schema accepts unknown root fields for ${tool.name}`
      ).not.toBe(true);
      expect(
        getUnresolvedLocalSchemaRefs(tool.inputSchema),
        `MCP input schema has unresolved local references for ${tool.name}`
      ).toEqual([]);
      if (tool.outputSchema !== undefined) {
        expect(
          tool.outputSchema.type,
          `MCP output schema must be object-typed for ${tool.name}`
        ).toBe("object");
        expect(
          getUnresolvedLocalSchemaRefs(tool.outputSchema),
          `MCP output schema has unresolved local references for ${tool.name}`
        ).toEqual([]);
      }
    }
    expect(
      getSchemaProperties(
        visualTools.find((tool) => tool.name === "audit")?.inputSchema
      )
    ).toHaveProperty("rendered", expect.objectContaining({ type: "boolean" }));
    expect(JSON.stringify(imageDescriptionsTool?.inputSchema)).toContain(
      "rendered image in context"
    );
    expect(
      JSON.stringify(
        tools.find(({ name }) => name === "update-styles")?.inputSchema
      )
    ).toContain("JSON-compatible value.");
    expect(
      getSuccessfulOutputDataSchema(
        tools.find((tool) => tool.name === "refresh")?.outputSchema
      )
    ).toMatchObject({
      type: "object",
      required: ["refreshedNamespaces"],
      properties: {
        refreshedNamespaces: {
          type: "array",
          items: { type: "string", enum: expect.any(Array) },
        },
      },
    });
    const auditOutputSchema = tools.find(
      (tool) => tool.name === "audit"
    )?.outputSchema;
    expect(auditOutputSchema).toEqual(
      expect.objectContaining({
        oneOf: [
          expect.objectContaining({
            required: ["ok", "data", "meta"],
            properties: expect.objectContaining({
              ok: { type: "boolean", const: true },
              data: expect.objectContaining({ oneOf: expect.any(Array) }),
            }),
          }),
          expect.objectContaining({
            required: ["ok", "error", "meta"],
            properties: expect.objectContaining({
              ok: { type: "boolean", const: false },
              data: expect.objectContaining({ oneOf: expect.any(Array) }),
              error: expect.objectContaining({
                required: ["code", "message"],
                properties: expect.objectContaining({
                  issues: expect.objectContaining({ type: "array" }),
                }),
              }),
            }),
          }),
        ],
      })
    );
    expect(() =>
      ListToolsResultSchema.parse({
        tools: tools.map(
          ({ name, description, inputSchema, outputSchema }) => ({
            name,
            description,
            inputSchema,
            ...(outputSchema === undefined ? {} : { outputSchema }),
          })
        ),
      })
    ).not.toThrow();
    for (const command of ["preview.start", "preview.status", "preview.stop"]) {
      expect(
        getSuccessfulOutputDataSchema(
          visualTools.find((tool) => tool.name === command)?.outputSchema
        ),
        `Missing MCP output schema for ${command}`
      ).toMatchObject({
        type: "object",
        required: ["url", "running"],
        properties: {
          url: { type: "string" },
          pid: { type: "integer" },
          running: { type: "boolean" },
        },
      });
    }
    for (const command of hiddenMcpOperationCommands) {
      expect(toolNames).not.toContain(command);
    }
    const insertFragmentTool = tools.find(
      (tool) => tool.name === "insert-fragment"
    );
    expect(insertFragmentTool?.inputSchema.required).toEqual([
      "parentInstanceId",
      "fragment",
    ]);
    expect(
      Object.keys(insertFragmentTool?.inputSchema.properties ?? {})
    ).toEqual([
      "parentInstanceId",
      "fragment",
      "mode",
      "insertIndex",
      "dryRun",
    ]);
    const fragmentSchema = insertFragmentTool?.inputSchema.properties?.fragment;
    expect(fragmentSchema).toEqual(expect.objectContaining({ type: "string" }));
    const jsxDescription =
      typeof fragmentSchema === "object" &&
      "description" in fragmentSchema &&
      typeof fragmentSchema.description === "string"
        ? fragmentSchema.description
        : undefined;
    expect(jsxDescription).toContain("not React aliases className or htmlFor");
    expect(jsxDescription).toContain("Use ws:style");
    expect(jsxDescription).toContain("style={{ padding: 24 }}");
    expect(jsxDescription).toContain("include required child/part components");
    expect(jsxDescription).toContain("same parent structure");
    expect(jsxDescription).toContain("use insert-component");
    expect(insertFragmentTool?.inputSchema.properties).not.toHaveProperty(
      "source"
    );
    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "list-pages",
          inputSchema: expect.objectContaining({
            required: [],
            properties: {
              includeFolders: { type: "boolean" },
            },
          }),
          annotations: expect.objectContaining({
            operationId: "pages.list",
            inputFields: ["includeFolders"],
            requiredInputFields: [],
            localCapable: true,
            serverOnly: false,
            readNamespaces: ["pages"],
          }),
        }),
        expect.objectContaining({
          name: "whoami",
          annotations: expect.objectContaining({
            operationId: "auth.me",
            localCapable: false,
            serverOnly: true,
          }),
        }),
        expect.objectContaining({
          name: "meta.index",
          inputSchema: expect.objectContaining({
            additionalProperties: false,
            properties: {},
            required: [],
          }),
          annotations: expect.objectContaining({
            operationId: "meta.index",
            localCapable: true,
          }),
        }),
        expect.objectContaining({
          name: "refresh",
          inputSchema: expect.objectContaining({
            properties: expect.objectContaining({
              namespaces: expect.objectContaining({
                type: "array",
              }),
            }),
          }),
          annotations: expect.objectContaining({
            operationId: "project-session.refresh",
            requiredInputFields: [],
            localCapable: true,
          }),
        }),
        expect.objectContaining({
          name: "reset-session",
          annotations: expect.objectContaining({
            operationId: "project-session.reset",
          }),
        }),
      ])
    );

    for (const [name, field] of [
      ["delete-instance", "instanceIds"],
      ["update-styles", "updates"],
      ["delete-styles", "deletions"],
      ["update-design-token-styles", "updates"],
      ["delete-design-token-styles", "deletions"],
    ]) {
      expect(
        tools.find((tool) => tool.name === name)?.inputSchema.properties?.[
          field
        ]
      ).toMatchObject({ type: "array" });
    }

    expect(
      tools.find((tool) => tool.name === "update-page")?.inputSchema.properties
        ?.values
    ).toMatchObject({
      type: "object",
      properties: expect.objectContaining({
        meta: expect.objectContaining({ type: "object" }),
      }),
    });
    expect(
      tools.find((tool) => tool.name === "update-styles")?.inputSchema
        .properties?.updates
    ).toMatchObject({
      type: "array",
      items: expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          instanceId: { type: "string" },
          property: { type: "string" },
        }),
      }),
    });

    expect(
      tools.find((tool) => tool.name === "delete-instance")?.inputSchema
        .required
    ).toEqual(["instanceIds"]);
    expect(
      tools.find((tool) => tool.name === "delete-instance")?.annotations
        .requiredInputFields
    ).toEqual(["instanceIds"]);
    expect(
      tools.find((tool) => tool.name === "delete-instance")?.inputSchema
        .properties
    ).toEqual(
      expect.objectContaining({
        dryRun: expect.objectContaining({ type: "boolean" }),
        confirmDestructive: expect.objectContaining({ type: "boolean" }),
        confirmationToken: expect.objectContaining({ type: "string" }),
      })
    );
  });

  test("defers oversized input schemas until focused discovery", async () => {
    const description = "x".repeat(25_000);
    const operation = publicOperation({
      command: "large-input",
      id: "test.largeInput",
      description: "Accept a large structured input",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          targetId: { type: "string" },
          payload: { type: "object", description },
        },
        required: ["targetId", "payload"],
      },
    });
    const [tool] = listProjectSessionMcpTools([operation]);

    expect(JSON.stringify(tool?.inputSchema).length).toBeLessThan(1_000);
    expect(tool?.inputSchema.required).toEqual(["targetId", "payload"]);

    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });
    const details = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { tools: ["large-input"] },
    });
    expect(JSON.stringify(details.structuredContent.data)).toContain(
      description
    );
  });

  test("downloads assets through the MCP host", async () => {
    const downloadAsset = vi.fn(async ({ assetId }: { assetId: string }) => ({
      assetId,
      path: `/workspace/.webstudio/assets/${assetId}.png`,
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      downloadAsset,
    });

    const result = await adapter.callTool({
      name: "download-asset",
      input: { assetId: "hero" },
    });

    expect(downloadAsset).toHaveBeenCalledWith({ assetId: "hero" });
    expect(result.structuredContent).toMatchObject({
      data: {
        assetId: "hero",
        path: "/workspace/.webstudio/assets/hero.png",
      },
    });
  });

  test("exposes page expression input descriptions to MCP clients", async () => {
    const createPageContract = runtimeOperationContracts.find(
      (contract) => contract.id === "pages.create"
    );
    if (createPageContract === undefined) {
      throw Error("Expected pages.create contract");
    }
    const createPageOperation = publicOperation({
      command: createPageContract.command,
      id: createPageContract.id,
      method: "mutation",
      permit: "build",
      description: "Create page",
      inputSchema: createPageContract.inputSchema,
      readNamespaces: createPageContract.readNamespaces,
      writeNamespaces: createPageContract.writeNamespaces,
      invalidatesNamespaces: createPageContract.invalidatesNamespaces,
      retryOnConflict: createPageContract.retryOnConflict,
    });
    const [tool] = listProjectSessionMcpTools([createPageOperation]);
    const toolProperties = getSchemaProperties(tool?.inputSchema);
    const toolMetaProperties = getSchemaProperties(toolProperties.meta);

    expect(toolProperties.title).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expect(toolMetaProperties.description).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expectPageStatusInputSchema(toolMetaProperties.status);

    const adapter = createProjectSessionMcpCore({
      operations: [createPageOperation],
      createProjectSession: createSessionFactory(createSession()),
      executeOperation: createExecuteOperation(),
    });
    const details = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { tools: ["create-page"] },
    });
    const [toolDetails] = (
      details.structuredContent.data as {
        tools: { inputSchema: PublicMcpOperation["inputSchema"] }[];
      }
    ).tools;
    const toolDetailsProperties = getSchemaProperties(toolDetails?.inputSchema);
    const toolDetailsMetaProperties = getSchemaProperties(
      toolDetailsProperties.meta
    );

    expect(toolDetailsProperties.title).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expect(toolDetailsMetaProperties.description).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expectPageStatusInputSchema(toolDetailsMetaProperties.status);
  });

  test("lists OCR installer only when host provides installer", () => {
    expect(
      listProjectSessionMcpTools(publicMcpOperations).map((tool) => tool.name)
    ).not.toContain("vision.install-ocr");
    expect(
      listProjectSessionMcpTools(publicMcpOperations, {
        includeInstallOcr: true,
      }).map((tool) => tool.name)
    ).toContain("vision.install-ocr");
  });

  test("lists import only when host provides importer", () => {
    expect(
      listProjectSessionMcpTools(publicMcpOperations).map((tool) => tool.name)
    ).not.toContain("import");
    const tools = listProjectSessionMcpTools(publicMcpOperations, {
      includeImport: true,
    });
    const importTool = tools.find((tool) => tool.name === "import");
    expect(importTool).toBeDefined();
    expect(importTool?.annotations.invalidatesNamespaces).toEqual([]);
    expect(tools.map((tool) => tool.name)).toContain("import");
  });

  test("keeps MCP input schemas and required annotations aligned", () => {
    const tools = listProjectSessionMcpTools(publicMcpOperations, {
      includeImport: true,
      includeScreenshot: true,
      includeScreenshotDiff: true,
      includeInstallOcr: true,
      includePreview: true,
    });

    for (const tool of tools) {
      expect(tool.inputSchema.required ?? [], tool.name).toEqual(
        tool.annotations.requiredInputFields
      );
    }

    expect(tools.find((tool) => tool.name === "meta.guide")).toMatchObject({
      inputSchema: expect.objectContaining({ required: ["brief"] }),
      annotations: expect.objectContaining({ requiredInputFields: ["brief"] }),
    });
    expect(
      tools.find((tool) => tool.name === "meta.get_more_tools")
    ).toMatchObject({
      inputSchema: expect.objectContaining({
        required: [],
        properties: expect.objectContaining({
          brief: expect.objectContaining({ type: "string" }),
          tools: expect.objectContaining({ type: "array" }),
        }),
      }),
      annotations: expect.objectContaining({ requiredInputFields: [] }),
    });
    expect(tools.find((tool) => tool.name === "screenshot.diff")).toMatchObject(
      {
        inputSchema: expect.objectContaining({
          required: ["baselinePath", "currentPath"],
        }),
        annotations: expect.objectContaining({
          requiredInputFields: ["baselinePath", "currentPath"],
        }),
      }
    );
  });

  test("derives MCP required fields from branched input schemas", () => {
    const operation = publicOperation({
      command: "update-branched-settings",
      id: "settings.updateBranched",
      method: "mutation",
      permit: "edit",
      description: "Update branched settings",
      inputSchema: {
        allOf: [
          {
            properties: {
              settings: { type: "object" },
            },
            required: ["settings"],
          },
        ],
      },
    });

    const [tool] = listProjectSessionMcpTools([operation]);

    expect(tool?.inputSchema.required).toEqual(["settings"]);
    expect(tool?.annotations).toMatchObject({
      inputFields: ["dryRun", "settings"],
      requiredInputFields: ["settings"],
    });
  });

  test("does not expose CLI-only required options as MCP tool schemas", () => {
    const operationWithCliOptions = {
      ...publicMcpOperations[0]!,
      requiredOptions: ["page", "base-version", "json"],
    };

    expect(listProjectSessionMcpTools([operationWithCliOptions])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "list-pages",
          inputSchema: {
            type: "object",
            description:
              "Pass this MCP tool's JSON arguments. Use meta.get_more_tools for examples and required fields. For authored content with styles, prefer insert-fragment so the CLI converts JSX into Webstudio data.",
            additionalProperties: false,
            required: [],
            properties: {
              includeFolders: { type: "boolean" },
            },
          },
        }),
      ])
    );
  });

  test("lists MCP resources for project status, tools, components, and accessibility review", () => {
    expect(listProjectSessionMcpResources()).toEqual([
      expect.objectContaining({ uri: "webstudio://project/status" }),
      expect.objectContaining({ uri: "webstudio://project/tools-overview" }),
      expect.objectContaining({ uri: "webstudio://project/tools" }),
      expect.objectContaining({
        uri: "webstudio://project/components-overview",
      }),
      expect.objectContaining({ uri: "webstudio://project/components" }),
      expect.objectContaining({ uri: "webstudio://project/guide" }),
      expect.objectContaining({
        uri: "webstudio://project/expressions",
        mimeType: "text/markdown",
      }),
      expect.objectContaining({
        uri: "webstudio://project/accessibility-review",
        mimeType: "text/markdown",
      }),
    ]);
  });

  test("calls tools through project session operation executor", async () => {
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "pages.list",
        result: [{ id: "home" }],
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "list-pages",
      input: { includeFolders: true },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "list-pages",
      input: { includeFolders: true },
      dryRun: false,
    });
    expect(result.structuredContent).toEqual({
      ok: true,
      data: [{ id: "home" }],
      meta: {
        session: expect.objectContaining({
          operationId: "pages.list",
          source: "local",
          namespaceCounts: {
            read: 1,
            write: 0,
            invalidated: 0,
            missing: 0,
          },
          diagnosticCount: 0,
        }),
      },
    });
    expect(result.structuredContent.meta.session).not.toHaveProperty(
      "namespaces"
    );
    expect(result.structuredContent.meta.session).not.toHaveProperty(
      "diagnostics"
    );
  });

  test("exposes the audit input and structured result through MCP", async () => {
    const auditResult = {
      contractVersion: 2,
      projectVersion: 7,
      scopes: ["accessibility"],
      pageFilter: null,
      summary: {
        total: 1,
        bySeverity: { error: 1, warning: 0, info: 0 },
        byScope: {
          accessibility: 1,
          security: 0,
          seo: 0,
          assets: 0,
          styles: 0,
          performance: 0,
        },
      },
      verbose: false,
      findings: [{ id: "accessibility/missing-alt/image" }],
      skippedCheckCount: 0,
      manualCheckCount: 3,
      renderedCheckCount: 0,
      renderedIssueCount: 0,
      renderedFailureCount: 0,
      nextCursor: null,
    };
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({ operationId: "project.audit", result: auditResult })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "audit",
      input: {
        scopes: ["accessibility"],
        severities: ["error"],
        limit: 10,
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "audit",
      input: {
        scopes: ["accessibility"],
        severities: ["error"],
        limit: 10,
      },
      dryRun: false,
    });
    expect(result.structuredContent).toEqual({
      ok: true,
      data: auditResult,
      meta: {
        session: expect.objectContaining({ operationId: "project.audit" }),
      },
    });
  });

  test("runs rendered responsive checks through the audit tool", async () => {
    const executeOperation = createExecuteOperation(
      async ({ command, input }) => {
        if (command === "list-pages") {
          return createEnvelope({
            operationId: "pages.list",
            result: {
              pages: [
                { id: "home", path: "/" },
                { id: "dynamic", path: "/posts/:slug" },
              ],
            },
          });
        }
        if (command === "list-breakpoints") {
          return createEnvelope({
            operationId: "breakpoints.list",
            result: {
              breakpoints: [
                { id: "base", label: "Base" },
                { id: "tablet", label: "Tablet", minWidth: 768 },
              ],
            },
          });
        }
        const requestedScopes =
          typeof input === "object" &&
          input !== null &&
          "scopes" in input &&
          Array.isArray(input.scopes)
            ? input.scopes
            : [
                "accessibility",
                "security",
                "seo",
                "assets",
                "styles",
                "performance",
              ];
        return createEnvelope({
          operationId: "project.audit",
          result: {
            contractVersion: 2,
            projectVersion: 7,
            scopes: requestedScopes,
            pageFilter: null,
            summary: {
              total: 0,
              bySeverity: { error: 0, warning: 0, info: 0 },
              byScope: {
                accessibility: 0,
                security: 0,
                seo: 0,
                assets: 0,
                styles: 0,
                performance: 0,
              },
            },
            verbose: true,
            findings: [],
            skippedCheckCount: 0,
            skippedChecks: [],
            manualCheckCount: 3,
            manualChecks: [
              { checkId: "responsive-visual-review" },
              { checkId: "visual-contrast-review" },
              { checkId: "visual-hierarchy-review" },
            ],
            renderedCheckCount: 0,
            renderedIssueCount: 0,
            renderedFailureCount: 0,
            renderedChecks: [],
            renderedFailures: [],
            nextCursor: null,
          },
        });
      }
    );
    const startPreview = vi.fn(async () => ({
      url: "http://127.0.0.1:5177",
      running: true,
    }));
    const stopPreview = vi.fn(async () => ({
      url: "http://127.0.0.1:5173",
      running: false,
    }));
    const captureScreenshot = vi.fn(async (input) => ({
      output: `/tmp/${input.viewport.width}.png`,
      browserPath: "/browser",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 1,
      warnings: [],
      navigation: {
        requestedUrl: `http://127.0.0.1:5177${input.path}`,
        finalUrl: `http://127.0.0.1:5177${input.path}`,
        status: 200,
        statusText: "OK",
        mimeType: "text/html",
        redirects: [],
        documentReadyState: "complete",
        generatedSiteRootPresent: true,
        layoutStable: true,
      },
      layout: {
        viewportWidth: input.viewport.width,
        viewportHeight: input.viewport.height,
        contentWidth:
          input.viewport.width === 390
            ? input.viewport.width + 20
            : input.viewport.width,
        contentHeight: 1200,
        horizontalOverflow: input.viewport.width === 390,
        images:
          input.viewport.width === 390
            ? [
                {
                  instanceId: "broken",
                  loading: "eager",
                  complete: true,
                  naturalWidth: 0,
                  naturalHeight: 0,
                  renderedWidth: 200,
                  renderedHeight: 100,
                  top: 100,
                },
                {
                  instanceId: "below-fold",
                  loading: "eager",
                  complete: true,
                  naturalWidth: 800,
                  naturalHeight: 600,
                  renderedWidth: 400,
                  renderedHeight: 300,
                  top: 900,
                },
                {
                  instanceId: "oversized",
                  loading: "lazy",
                  complete: true,
                  naturalWidth: 2400,
                  naturalHeight: 1600,
                  renderedWidth: 600,
                  renderedHeight: 400,
                  top: 100,
                },
              ]
            : [],
        resources:
          input.viewport.width === 390
            ? [
                {
                  pathname: "/styles.css",
                  initiatorType: "link",
                  transferSize: 12000,
                  encodedBodySize: 11000,
                  decodedBodySize: 40000,
                  duration: 25,
                  renderBlockingStatus: "blocking",
                },
                {
                  pathname: "/fonts/brand.ttf",
                  initiatorType: "css",
                  transferSize: 80000,
                  encodedBodySize: 79000,
                  decodedBodySize: 79000,
                  duration: 40,
                },
              ]
            : [],
      },
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
      startPreview,
      getPreviewStatus: vi.fn(),
      stopPreview,
      captureScreenshot,
    });

    const result = await adapter.callTool({
      name: "audit",
      input: { rendered: true, verbose: true },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "audit",
      input: { verbose: true },
      dryRun: false,
    });

    expect(startPreview).toHaveBeenCalledTimes(1);
    expect(stopPreview).toHaveBeenCalledTimes(1);
    expect(captureScreenshot).toHaveBeenCalledTimes(2);
    expect(captureScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/",
        timeout: 10_000,
        viewport: { width: 390, height: 844 },
      })
    );
    expect(result.structuredContent.data).toMatchObject({
      renderedCheckCount: 2,
      renderedIssueCount: 6,
      renderedFailureCount: 0,
      manualCheckCount: 3,
      renderedChecks: [
        expect.objectContaining({
          pageId: "home",
          viewport: { width: 390, height: 844 },
          issues: [
            "horizontal-overflow",
            "broken-image",
            "eager-below-fold-image",
            "oversized-image",
            "render-blocking-resource",
            "legacy-font-format",
          ],
          resourceIssues: [
            expect.objectContaining({
              kind: "render-blocking-resource",
              pathname: "/styles.css",
            }),
            expect.objectContaining({
              kind: "legacy-font-format",
              pathname: "/fonts/brand.ttf",
            }),
          ],
          imageIssues: [
            expect.objectContaining({
              kind: "broken-image",
              instanceId: "broken",
            }),
            expect.objectContaining({
              kind: "eager-below-fold-image",
              instanceId: "below-fold",
            }),
            expect.objectContaining({
              kind: "oversized-image",
              instanceId: "oversized",
            }),
          ],
        }),
        expect.any(Object),
      ],
      renderedFailures: [],
      manualChecks: [
        { checkId: "responsive-visual-review" },
        { checkId: "visual-contrast-review" },
        { checkId: "visual-hierarchy-review" },
      ],
    });

    captureScreenshot.mockClear();
    const accessibilityResult = await adapter.callTool({
      name: "audit",
      input: {
        scopes: ["accessibility"],
        rendered: true,
        verbose: true,
      },
    });

    expect(captureScreenshot).toHaveBeenCalledTimes(2);
    expect(stopPreview).toHaveBeenCalledTimes(2);
    expect(captureScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        includeImageMetrics: false,
        includeResourceMetrics: false,
      })
    );
    expect(accessibilityResult.structuredContent.data).toMatchObject({
      scopes: ["accessibility"],
      renderedState: "complete",
      renderedCheckCount: 2,
      renderedIssueCount: 1,
      renderedChecks: [
        expect.objectContaining({
          issues: ["horizontal-overflow"],
          imageIssues: [],
          resourceIssues: [],
        }),
        expect.any(Object),
      ],
    });

    await expect(
      adapter.callTool({
        name: "audit",
        input: { rendered: true, cursor: "next" },
      })
    ).rejects.toThrow(/cannot be combined with cursor pagination/);
  });

  test("returns static audit data with an error when rendered preview cannot start", async () => {
    const executeOperation = createExecuteOperation(async ({ command }) => {
      if (command === "list-pages") {
        return createEnvelope({
          operationId: "pages.list",
          result: { pages: [{ id: "home", path: "/" }] },
        });
      }
      if (command === "list-breakpoints") {
        return createEnvelope({
          operationId: "breakpoints.list",
          result: { breakpoints: [] },
        });
      }
      return createEnvelope({
        operationId: "project.audit",
        result: {
          contractVersion: 2,
          projectVersion: 7,
          scopes: [],
          pageFilter: null,
          summary: {
            total: 0,
            bySeverity: { error: 0, warning: 0, info: 0 },
            byScope: {},
          },
          verbose: true,
          findings: [],
          skippedCheckCount: 0,
          skippedChecks: [],
          manualCheckCount: 3,
          manualChecks: [{ checkId: "responsive-visual-review" }],
          renderedCheckCount: 0,
          renderedIssueCount: 0,
          renderedFailureCount: 0,
          renderedChecks: [],
          renderedFailures: [],
          nextCursor: null,
        },
      });
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
      startPreview: vi.fn(async () => {
        throw new Error("preview build failed");
      }),
      getPreviewStatus: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(),
    });

    const result = await adapter.callTool({
      name: "audit",
      input: { rendered: true, verbose: true },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: {
        code: "RENDERED_AUDIT_FAILED",
        message: expect.stringContaining("completed no rendered checks"),
      },
    });
    expect(result.structuredContent.data).toMatchObject({
      renderedState: "failed",
      renderedCheckCount: 0,
      renderedIssueCount: 0,
      renderedFailureCount: 1,
      renderedFailures: [
        {
          code: "RENDERED_AUDIT_PREVIEW_START_FAILED",
          phase: "preview-start",
          retryable: true,
          remediation: expect.stringContaining("preview.start"),
          message: "Rendered audit could not start: preview build failed",
        },
      ],
      manualCheckCount: 3,
      manualChecks: [{ checkId: "responsive-visual-review" }],
    });
  });

  test("includes actionable rendered failure summaries in compact output", async () => {
    const executeOperation = createExecuteOperation(async ({ command }) => {
      if (command === "list-pages") {
        return createEnvelope({
          operationId: "pages.list",
          result: { pages: [{ id: "home", path: "/" }] },
        });
      }
      if (command === "list-breakpoints") {
        return createEnvelope({
          operationId: "breakpoints.list",
          result: { breakpoints: [] },
        });
      }
      return createEnvelope({
        operationId: "project.audit",
        result: {
          contractVersion: 2,
          projectVersion: 1,
          scopes: ["accessibility"],
          pageFilter: null,
          summary: {
            total: 0,
            selectedTotal: 0,
            bySeverity: { error: 0, warning: 0, info: 0 },
            byScope: {
              accessibility: 0,
              security: 0,
              seo: 0,
              assets: 0,
              styles: 0,
              performance: 0,
            },
          },
          skippedCheckCount: 0,
          manualCheckCount: 1,
          renderedCheckCount: 0,
          renderedIssueCount: 0,
          renderedFailureCount: 0,
          renderedFailureSummaries: [],
          nextCursor: null,
          verbose: false,
          findings: [],
        },
      });
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
      startPreview: vi.fn(async () => {
        throw new Error("preview build failed");
      }),
      getPreviewStatus: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(),
    });

    const result = await adapter.callTool({
      name: "audit",
      input: { rendered: true },
    });

    expect(result.structuredContent.data).toMatchObject({
      renderedState: "failed",
      renderedFailureCount: 1,
      renderedFailureSummaries: [
        {
          code: "RENDERED_AUDIT_PREVIEW_START_FAILED",
          phase: "preview-start",
          remediation: expect.stringContaining("preview.start"),
          count: 1,
        },
      ],
    });
  });

  test("does not advertise or silently accept rendered audit without visual capabilities", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });
    const auditTool = adapter.listTools().find(({ name }) => name === "audit");

    expect(auditTool?.inputSchema.properties).not.toHaveProperty("rendered");
    await expect(
      adapter.callTool({ name: "audit", input: { rendered: true } })
    ).rejects.toThrow(/does not provide preview and screenshot capabilities/);
    await expect(
      adapter.callTool({
        name: "audit",
        input: { confirmationToken: "not-rendered" },
      })
    ).rejects.toThrow(/confirmationToken requires rendered: true/);
    await expect(
      adapter.callTool({ name: "audit", input: { rendered: false } })
    ).resolves.toMatchObject({
      structuredContent: { ok: true },
    });
  });

  test("returns a large rendered audit confirmation plan as a successful result", async () => {
    const executeOperation = createExecuteOperation(async ({ command }) => {
      if (command === "list-pages") {
        return createEnvelope({
          operationId: "pages.list",
          result: {
            pages: Array.from({ length: 121 }, (_, index) => ({
              id: `page-${index}`,
              path: `/page-${index}`,
            })),
          },
        });
      }
      if (command === "list-breakpoints") {
        return createEnvelope({
          operationId: "breakpoints.list",
          result: { breakpoints: [] },
        });
      }
      return createEnvelope({
        operationId: "project.audit",
        result: {
          contractVersion: 2,
          projectVersion: 7,
          scopes: [],
          pageFilter: null,
          summary: {
            total: 0,
            bySeverity: { error: 0, warning: 0, info: 0 },
            byScope: {},
          },
          verbose: false,
          findings: [],
          skippedCheckCount: 0,
          manualCheckCount: 0,
          renderedCheckCount: 0,
          renderedIssueCount: 0,
          renderedFailureCount: 0,
          nextCursor: null,
        },
      });
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(),
    });

    const result = await adapter.callTool({
      name: "audit",
      input: { rendered: true },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        renderedState: "confirmation-required",
        renderedPlan: {
          captureCount: 121,
          confirmationToken: expect.any(String),
        },
        renderedFailureCount: 1,
        renderedFailureSummaries: [
          { code: "RENDERED_AUDIT_CONFIRMATION_REQUIRED", count: 1 },
        ],
      },
    });
  });

  test("returns the computed transaction for dry-run mutations", async () => {
    const transaction = {
      id: "dry-run-transaction",
      payload: [
        {
          namespace: "pages" as const,
          patches: [
            { op: "add" as const, path: ["pages", "draft"], value: {} },
          ],
        },
      ],
    };
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "folders.create",
        source: "dry-run",
        result: { folderId: "draft" },
        transaction,
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "move-instance",
      input: { moves: [], dryRun: true },
    });

    expect(result.structuredContent).toMatchObject({
      data: { folderId: "draft" },
      meta: {
        session: {
          source: "dry-run",
          committed: false,
          transaction,
        },
      },
    });
  });

  test("plans and confirms destructive mutations without blind retries", async () => {
    const transaction = {
      id: "planned-delete",
      payload: [
        {
          namespace: "instances" as const,
          patches: [{ op: "remove" as const, path: ["target"] }],
        },
      ],
    };
    const executeOperation = createExecuteOperation(async ({ dryRun }) =>
      createEnvelope({
        operationId: "instances.delete",
        source: dryRun ? "dry-run" : "remote",
        result: { deletedInstanceIds: ["target"] },
        state: { committed: dryRun === false, freshness: {} },
        ...(dryRun ? { transaction } : {}),
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const planned = await adapter.callTool({
      name: "delete-instance",
      input: { instanceIds: ["target"] },
    });

    expect(planned).toMatchObject({
      isError: true,
      structuredContent: {
        ok: false,
        error: { code: "DESTRUCTIVE_CONFIRMATION_REQUIRED" },
        meta: {
          session: { source: "dry-run", committed: false, transaction },
          confirmation: {
            required: true,
            operation: "delete-instance",
            token: expect.any(String),
            summary: {
              namespaces: ["instances"],
              changeCount: 1,
              patchCount: 1,
              patchOperations: { remove: 1 },
            },
          },
        },
      },
    });
    expect(executeOperation).toHaveBeenCalledTimes(1);

    const confirmation = planned.structuredContent.meta.confirmation;
    if (confirmation === undefined) {
      throw new Error("Expected destructive confirmation");
    }
    const altered = await adapter.callTool({
      name: "delete-instance",
      input: {
        instanceIds: ["other"],
        confirmDestructive: true,
        confirmationToken: confirmation.token,
      },
    });
    expect(altered).toMatchObject({
      structuredContent: {
        ok: false,
        error: { code: "DESTRUCTIVE_CONFIRMATION_INVALID" },
      },
    });
    expect(executeOperation).toHaveBeenCalledTimes(2);

    const committed = await adapter.callTool({
      name: "delete-instance",
      input: {
        confirmationToken: confirmation.token,
        instanceIds: ["target"],
        confirmDestructive: true,
      },
    });

    expect(committed).toMatchObject({
      structuredContent: {
        ok: true,
        meta: { session: { committed: true } },
      },
    });
    expect(executeOperation).toHaveBeenCalledTimes(4);
  });

  test("rejects unsupported operation input fields before execution", async () => {
    const executeOperation: ExecuteOperation = vi.fn();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "list-instances",
        input: { rootInstanceId: "body", depth: 1 },
      })
    ).rejects.toThrow(
      "list-instances input.depth is not supported. Expected one of: rootInstanceId, maxDepth. Did you mean maxDepth?"
    );

    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("converts jsx fragments before executing insert operation", async () => {
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "instances.insertFragment",
        result: {
          rootInstanceIds: ["inserted"],
          instanceIds: ["inserted"],
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "insert-fragment",
      input: {
        parentInstanceId: "body",
        fragment:
          '<ws.element ws:tag="section"><ws.element ws:tag="h2">Title</ws.element></ws.element>',
      },
    });

    const call = vi.mocked(executeOperation).mock.calls[0]?.[0];
    expect(call).toEqual({
      command: "insert-fragment",
      input: {
        parentInstanceId: "body",
        fragment: expect.objectContaining({
          instances: expect.arrayContaining([
            expect.objectContaining({ component: "ws:element" }),
            expect.objectContaining({ component: "ws:element" }),
          ]),
        }),
        mode: undefined,
        insertIndex: undefined,
      },
      dryRun: false,
    });
    expect(call?.input).not.toHaveProperty("source");
  });

  test("converts semantic Collection item jsx before executing one atomic operation", async () => {
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "instances.insertCollection",
        result: {
          rootInstanceIds: ["collection"],
          instanceIds: ["collection", "item"],
          collectionInstanceId: "collection",
          itemRootInstanceId: "item",
          itemParameterId: "item-parameter",
          itemKeyParameterId: "item-key-parameter",
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "insert-collection",
      input: {
        parentInstanceId: "body",
        data: { type: "expression", value: "Posts.data.items" },
        itemFragment:
          '<ws.element ws:tag="article"><ws.element ws:tag="h2">{expression`collectionItem.title`}</ws.element></ws.element>',
      },
    });

    expect(vi.mocked(executeOperation).mock.calls[0]?.[0]).toEqual({
      command: "insert-collection",
      input: {
        parentInstanceId: "body",
        data: { type: "expression", value: "Posts.data.items" },
        itemFragment: expect.objectContaining({
          instances: expect.arrayContaining([
            expect.objectContaining({
              component: "ws:element",
              tag: "article",
            }),
            expect.objectContaining({ component: "ws:element", tag: "h2" }),
          ]),
        }),
        mode: undefined,
        insertIndex: undefined,
      },
      dryRun: false,
    });
  });

  test("rejects invalid semantic Collection data before execution", async () => {
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "insert-collection",
        input: {
          parentInstanceId: "body",
          data: { type: "json", value: "not-an-array" },
          itemFragment: '<ws.element ws:tag="article" />',
        },
      })
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          code: "invalid_union",
          path: ["data", "value"],
        }),
      ],
    });
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("rejects structured fragment objects at the mcp boundary", async () => {
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "insert-fragment",
        input: {
          parentInstanceId: "body",
          fragment: { children: [], instances: [] },
        },
      })
    ).rejects.toThrow(
      "insert-fragment requires fragment as a Webstudio JSX string"
    );
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("rejects deprecated source alias for fragment input", async () => {
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "insert-fragment",
        input: {
          parentInstanceId: "body",
          source: '<ws.element ws:tag="section" />',
        },
      })
    ).rejects.toThrow(
      "insert-fragment input.source is not supported. Put JSX in input.fragment instead."
    );
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("rejects top-level jsx alias for fragment input", async () => {
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "insert-fragment",
        input: {
          parentInstanceId: "body",
          jsx: '<ws.element ws:tag="section" />',
        },
      })
    ).rejects.toThrow(
      "insert-fragment input.jsx is not supported. Put JSX in input.fragment instead."
    );
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("explains parentId is not accepted for fragment insertion", async () => {
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "insert-fragment",
        input: {
          parentId: "body",
          fragment: '<ws.element ws:tag="section" />',
        },
      })
    ).rejects.toThrow(
      "insert-fragment input.parentId is not supported. Use input.parentInstanceId instead."
    );
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("normalizes insert-component position alias to mode", async () => {
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "components.insert",
        result: {
          rootInstanceIds: ["inserted"],
          instanceIds: ["inserted"],
        },
      })
    );
    const operations = [
      ...publicMcpOperations,
      publicOperation({
        command: "insert-component",
        id: "components.insert",
        method: "mutation",
        permit: "edit",
        description: "Insert component",
        inputSchema: getTestInputSchema(
          z.object({
            parentInstanceId: z.string(),
            component: z.string(),
            mode: z.enum(["append", "prepend", "replace"]).optional(),
            insertIndex: z.number().int().nonnegative().optional(),
          })
        ),
        writeNamespaces: ["instances"],
        invalidatesNamespaces: ["instances"],
      }),
    ];
    const adapter = createProjectSessionMcpCore({
      operations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "insert-component",
      input: {
        parentInstanceId: "body",
        component: "Box",
        position: "append",
      },
    });

    expect(executeOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "insert-component",
        input: {
          parentInstanceId: "body",
          component: "Box",
          mode: "append",
        },
      })
    );
    expect(result.structuredContent.meta).toMatchObject({
      next: [expect.stringContaining("run audit")],
    });
  });

  test("requires binding verification after binding-related mutations", async () => {
    const operation = publicOperation({
      command: "bind-props",
      id: "props.bind",
      method: "mutation",
      permit: "edit",
      description: "Bind props",
      writeNamespaces: ["props"],
      invalidatesNamespaces: ["props"],
    });
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });

    const result = await adapter.callTool({ name: operation.command });

    expect(result.structuredContent.meta.next).toEqual([
      expect.stringContaining("run verify-bindings"),
      expect.stringContaining("run audit"),
    ]);
  });

  test("normalizes create-page description and preserves basic auth", async () => {
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "pages.create",
        result: {
          pageId: "page",
          rootInstanceId: "root",
        },
      })
    );
    const operations = [
      ...publicMcpOperations,
      publicOperation({
        command: "create-page",
        id: "pages.create",
        method: "mutation",
        permit: "edit",
        description: "Create page",
        inputSchema: getTestInputSchema(
          z.object({
            name: z.string(),
            path: z.string(),
            title: z.string().optional(),
            parentFolderId: z.string().optional(),
            meta: z
              .object({
                description: z.string().optional(),
                auth: z
                  .object({
                    method: z.literal("basic"),
                    login: z.string(),
                    password: z.string(),
                  })
                  .optional(),
              })
              .optional(),
          })
        ),
        writeNamespaces: ["pages", "instances"],
        invalidatesNamespaces: ["pages", "instances"],
      }),
    ];
    const adapter = createProjectSessionMcpCore({
      operations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "create-page",
      input: {
        name: "Harbor Ops Design System",
        path: "/design-system",
        title: "Harbor Ops Design System",
        description:
          "A realistic component coverage page for the Harbor Ops logistics product design system.",
        meta: {
          auth: {
            method: "basic",
            login: "editor",
            password: "private-value",
          },
        },
      },
    });

    expect(executeOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "create-page",
        input: {
          name: "Harbor Ops Design System",
          path: "/design-system",
          title: "Harbor Ops Design System",
          meta: {
            description:
              "A realistic component coverage page for the Harbor Ops logistics product design system.",
            auth: {
              method: "basic",
              login: "editor",
              password: "private-value",
            },
          },
        },
      })
    );
  });

  test("suggests page structure tools when page detail input is unsupported", async () => {
    const executeOperation: ExecuteOperation = vi.fn();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "get-page-by-path",
        input: { path: "/design-system", detail: "roots" },
      })
    ).rejects.toThrow(
      "Use get-page/get-page-by-path for page metadata, list-instances to inspect page root contents, and inspect-instance for props, styles, children, bindings, or sources."
    );

    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("wraps bare array input for style operation tools", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "box-shadow",
        value: { type: "keyword", value: "none" },
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "styles.updateDeclarations",
      result: { styleKeys: [] },
    });

    await adapter.callTool({
      name: "update-styles",
      input: updates,
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: { updates },
      dryRun: false,
    });
  });

  test("parses stringified structured fields using the MCP input schema", async () => {
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "pages.update",
      result: { pageId: "page-id" },
    });

    await adapter.callTool({
      name: "update-page",
      input: {
        pageId: "page-id",
        values: JSON.stringify({
          title: '"Pricing"',
          meta: { description: '"Plans"' },
        }),
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-page",
      input: {
        pageId: "page-id",
        values: {
          title: '"Pricing"',
          meta: { description: '"Plans"' },
        },
      },
      dryRun: false,
    });
  });

  test("parses stringified single-array tool fields using the MCP input schema", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "styles.updateDeclarations",
      result: { styleKeys: [] },
    });

    await adapter.callTool({
      name: "update-styles",
      input: { updates: JSON.stringify(updates) },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: { updates },
      dryRun: false,
    });
  });

  test("parses stringified bare single-array tool input", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "styles.updateDeclarations",
      result: { styleKeys: [] },
    });

    await adapter.callTool({
      name: "update-styles",
      input: JSON.stringify(updates),
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: { updates },
      dryRun: false,
    });
  });

  test("parses stringified nested object values for unconstrained schema fields", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "color",
        value: JSON.stringify({ type: "keyword", value: "red" }),
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "styles.updateDeclarations",
      result: { styleKeys: [] },
    });

    await adapter.callTool({
      name: "update-styles",
      input: { updates },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: {
        updates: [
          {
            instanceId: "instance-id",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      dryRun: false,
    });
  });

  test("parses stringified nested array values for unconstrained schema fields", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "font-family",
        value: JSON.stringify(["Inter", "sans-serif"]),
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "styles.updateDeclarations",
      result: { styleKeys: [] },
    });

    await adapter.callTool({
      name: "update-styles",
      input: { updates },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: {
        updates: [
          {
            instanceId: "instance-id",
            property: "font-family",
            value: ["Inter", "sans-serif"],
          },
        ],
      },
      dryRun: false,
    });
  });

  test("keeps primitive strings in unconstrained schema fields unchanged", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "font-family",
        value: "TokenFont",
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "styles.updateDeclarations",
      result: { styleKeys: [] },
    });

    await adapter.callTool({
      name: "update-styles",
      input: { updates },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: { updates },
      dryRun: false,
    });
  });

  test("resolves discriminated input branches before parsing JSON-looking strings", async () => {
    const operation = publicOperation({
      command: "update-discriminated-value",
      id: "test.updateDiscriminatedValue",
      method: "mutation",
      permit: "build",
      description: "Update a discriminated value",
      inputSchema: getTestInputSchema(
        z.object({
          updates: z.array(
            z.discriminatedUnion("type", [
              z.object({ type: z.literal("string"), value: z.string() }),
              z.object({ type: z.literal("json"), value: z.unknown() }),
            ])
          ),
        })
      ),
      writeNamespaces: ["props"],
      invalidatesNamespaces: ["props"],
    });
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation,
    });
    const json = '{"@context":"https://schema.org","@type":1}';

    await adapter.callTool({
      name: operation.command,
      input: {
        updates: [
          { type: "string", value: json },
          { type: "json", value: json },
        ],
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: operation.command,
      input: {
        updates: [
          { type: "string", value: json },
          { type: "json", value: JSON.parse(json) },
        ],
      },
      dryRun: false,
    });
  });

  test("parses stringified record values through additionalProperties schemas", async () => {
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "pages.update",
      result: { pageId: "page-id" },
    });

    await adapter.callTool({
      name: "update-page",
      input: {
        pageId: "page-id",
        values: {
          custom: {
            settings: JSON.stringify({ enabled: true }),
          },
        },
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-page",
      input: {
        pageId: "page-id",
        values: {
          custom: {
            settings: { enabled: true },
          },
        },
      },
      dryRun: false,
    });
  });

  test("keeps and uses root additionalProperties schemas from generated input schema", async () => {
    const operation = publicOperation({
      command: "update-settings",
      id: "settings.update",
      method: "mutation",
      permit: "edit",
      description: "Update settings",
      inputSchema: getTestInputSchema(
        z.object({ known: z.string() }).catchall(
          z.object({
            enabled: z.boolean(),
          })
        )
      ),
    });
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "settings.update",
        result: { ok: true },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    expect(listProjectSessionMcpTools([operation])[0]?.inputSchema).toEqual(
      expect.objectContaining({
        additionalProperties: expect.objectContaining({
          type: "object",
          properties: expect.objectContaining({
            enabled: { type: "boolean" },
          }),
        }),
      })
    );

    await adapter.callTool({
      name: "update-settings",
      input: {
        known: "value",
        custom: JSON.stringify({ enabled: true }),
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-settings",
      input: {
        known: "value",
        custom: { enabled: true },
      },
      dryRun: false,
    });
  });

  test("keeps allOf schema branches conjunctive when parsing stringified inputs", async () => {
    const operation = publicOperation({
      command: "update-conflicting",
      id: "settings.updateConflicting",
      method: "mutation",
      permit: "edit",
      description: "Update conflicting settings",
      inputSchema: getTestInputSchema(
        z.object({
          settings: z
            .object({
              value: z.string(),
            })
            .and(
              z.object({
                value: z.object({
                  enabled: z.boolean(),
                }),
              })
            ),
        })
      ),
    });
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "settings.updateConflicting",
        result: { ok: true },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "update-conflicting",
      input: {
        settings: {
          value: JSON.stringify({ enabled: true }),
        },
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-conflicting",
      input: {
        settings: {
          value: JSON.stringify({ enabled: true }),
        },
      },
      dryRun: false,
    });
  });

  test("parses nested fields from schemas with object keywords and no explicit type", async () => {
    const operation = publicOperation({
      command: "update-loose-schema",
      id: "settings.updateLooseSchema",
      method: "mutation",
      permit: "edit",
      description: "Update settings with loose schema",
      inputSchema: {
        properties: {
          settings: {
            properties: {
              custom: {
                properties: {
                  enabled: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    });
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "settings.updateLooseSchema",
        result: { ok: true },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "update-loose-schema",
      input: {
        settings: {
          custom: JSON.stringify({ enabled: true }),
        },
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-loose-schema",
      input: {
        settings: {
          custom: { enabled: true },
        },
      },
      dryRun: false,
    });
  });

  test("parses tuple items with prefix item schemas", async () => {
    const operation = publicOperation({
      command: "update-range",
      id: "settings.updateRange",
      method: "mutation",
      permit: "edit",
      description: "Update range",
      inputSchema: getTestInputSchema(
        z.object({
          range: z.tuple([
            z.string(),
            z.object({
              enabled: z.boolean(),
            }),
          ]),
        })
      ),
    });
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "settings.updateRange",
        result: { ok: true },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "update-range",
      input: {
        range: ["sm", JSON.stringify({ enabled: true })],
      },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-range",
      input: {
        range: ["sm", { enabled: true }],
      },
      dryRun: false,
    });
  });

  test("parses stringified nested object values inside union schema fields", async () => {
    const transactions = [
      {
        id: "transaction-id",
        payload: [
          {
            namespace: "props",
            patches: [
              {
                op: "add",
                path: ["prop-id"],
                value: JSON.stringify({
                  id: "prop-id",
                  name: "data",
                  type: "json",
                  value: { enabled: true },
                }),
              },
            ],
          },
        ],
      },
    ];
    const { adapter, executeOperation } = createTestMcpCore({
      operationId: "build.applyPatch",
      result: { success: true },
    });

    await adapter.callTool({
      name: "apply-patch",
      input: { transactions },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "apply-patch",
      input: {
        transactions: [
          {
            id: "transaction-id",
            payload: [
              {
                namespace: "props",
                patches: [
                  {
                    op: "add",
                    path: ["prop-id"],
                    value: {
                      id: "prop-id",
                      name: "data",
                      type: "json",
                      value: { enabled: true },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      dryRun: false,
    });
  });

  test("wraps bare array input for single-array operation tools", async () => {
    const instanceIds = ["instance-id"];
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "instances.delete",
        result: { instanceIds },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "delete-instance",
      input: instanceIds,
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "delete-instance",
      input: { instanceIds },
      dryRun: true,
    });
  });

  test("does not wrap bare array input for unconstrained single-field tools", async () => {
    const operation = publicOperation({
      command: "update-anything",
      id: "settings.updateAnything",
      method: "mutation",
      permit: "edit",
      description: "Update anything",
      inputSchema: getTestInputSchema(
        z.object({
          value: z.unknown(),
        })
      ),
    });
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "settings.updateAnything",
        result: { ok: true },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: [operation],
      createProjectSession: createSessionFactory(),
      executeOperation,
    });
    const value = ["not", "a", "root", "wrapper"];

    await adapter.callTool({
      name: "update-anything",
      input: value,
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-anything",
      input: value,
      dryRun: false,
    });
  });

  test("calls import through injected project importer", async () => {
    const importProject = vi.fn(async () => ({ imported: true as const }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      importProject,
    });

    const result = await adapter.callTool({
      name: "import",
      input: {
        to: "https://p-destination.wstd.dev/?authToken=token",
        assetsDir: "assets",
        ignoreVersionCheck: true,
        skipAssets: true,
      },
    });

    expect(importProject).toHaveBeenCalledWith({
      to: "https://p-destination.wstd.dev/?authToken=token",
      assetsDir: "assets",
      ignoreVersionCheck: true,
      skipAssets: true,
    });
    expect(result.structuredContent.data).toEqual({ imported: true });
  });

  test("includes import in capability index when importer is provided", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      importProject: vi.fn(async () => ({ imported: true as const })),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const capabilities = (
      index.structuredContent.data as {
        capabilities: { tools: string[] }[];
      }
    ).capabilities;

    expect(capabilities.flatMap((capability) => capability.tools)).toContain(
      "import"
    );
  });

  test("categorizes text asset editing with asset capabilities", async () => {
    const updateAssetContent = publicOperation({
      command: "update-asset-content",
      id: "assets.updateContent",
      method: "mutation",
      permit: "edit",
      description: "Update text asset content",
      inputSchema: getTestInputSchema(
        z.object({
          assetId: z.string(),
          expectedName: z.string(),
          content: z.string(),
        })
      ),
      readNamespaces: ["assets"],
      writeNamespaces: ["assets"],
      invalidatesNamespaces: ["assets"],
    });
    const adapter = createProjectSessionMcpCore({
      operations: [...publicMcpOperations, updateAssetContent],
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const capabilities = (
      index.structuredContent.data as {
        capabilities: { area: string; tools: string[] }[];
      }
    ).capabilities;
    const assets = capabilities.find(({ area }) => area === "assets");

    expect(assets?.tools).toContain("update-asset-content");
  });

  test("rejects import without destination share link", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      importProject: vi.fn(),
    });

    await expect(
      adapter.callTool({ name: "import", input: {} })
    ).rejects.toThrow("import requires destination share link in to.");
  });

  test("delegates catalog operation tools without creating core session", async () => {
    const createProjectSession = createSessionFactory();
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "pages.list",
        result: [],
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession,
      executeOperation,
    });

    await adapter.callTool({ name: "list-pages" });
    await adapter.callTool({ name: "list-pages" });

    expect(createProjectSession).not.toHaveBeenCalled();
    expect(executeOperation).toHaveBeenCalledTimes(2);
  });

  test("calls project session management tools directly", async () => {
    const session = createSession({
      initialize: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.status",
          result: { loaded: true },
          namespaces: {
            read: ["pages"],
            write: [],
            invalidated: [],
            missing: ["assets"],
          },
          diagnostics: [
            {
              level: "warning",
              code: "STALE_ASSETS",
              message: "Assets need refreshing.",
              details: { namespace: "assets" },
            },
          ],
          state: {
            committed: false,
            freshness: {
              pages: {
                status: "fresh",
                version: 1,
                source: "remote",
                loadedAt: "2026-07-10T12:00:00.000Z",
              },
            },
          },
        })
      ),
      refresh: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.refresh",
          version: 2,
          source: "remote",
          result: { refreshedNamespaces: ["pages"] },
          namespaces: {
            read: ["pages"],
            write: [],
            invalidated: [],
            missing: [],
          },
        })
      ),
      reset: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.reset",
          buildId: undefined,
          version: undefined,
          result: { loaded: false },
        })
      ),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const status = await adapter.callTool({ name: "status" });
    const verboseStatus = await adapter.callTool({
      name: "status",
      input: { verbose: true },
    });
    const refresh = await adapter.callTool({
      name: "refresh",
      input: { namespaces: ["pages"] },
    });
    expect(session.initialize).toHaveBeenCalledTimes(3);
    const reset = await adapter.callTool({ name: "reset-session" });

    expect(status.structuredContent.data).toEqual({ loaded: true });
    expect(status.structuredContent.meta.session).not.toHaveProperty(
      "namespaces"
    );
    expect(verboseStatus.structuredContent.meta.session).toMatchObject({
      namespaces: {
        read: ["pages"],
        missing: ["assets"],
      },
      diagnostics: [
        {
          code: "STALE_ASSETS",
          details: { namespace: "assets" },
        },
      ],
      freshness: {
        pages: {
          status: "fresh",
          source: "remote",
          loadedAt: "2026-07-10T12:00:00.000Z",
        },
      },
    });
    expect(session.initialize).toHaveBeenCalledTimes(3);
    expect(session.refresh).toHaveBeenCalledWith(["pages"]);
    expect(refresh.structuredContent.meta.session).toEqual(
      expect.objectContaining({ operationId: "project-session.refresh" })
    );
    expect(reset.structuredContent.meta.session).toEqual(
      expect.objectContaining({ operationId: "project-session.reset" })
    );
  });

  test("calls meta tools without initializing project session", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "publish a site" },
    });
    const workflow = await adapter.callTool({
      name: "workflow.next",
      input: { goal: "design-system-page" },
    });
    const detailsWhileCheckpointed = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { tools: ["publish"] },
    });
    await expect(
      adapter.callTool({ name: "create-page", input: { name: "Blocked" } })
    ).rejects.toThrow("CHECKPOINT_REQUIRED");
    const ackCheckpoint = () =>
      adapter.callTool({
        name: "checkpoint.ack",
        input: {
          reported: true,
          continueAfterReport: true,
          summary: "reported checkpoint",
        },
      });
    await ackCheckpoint();
    const workflowPhase = await adapter.callTool({
      name: "workflow.next",
      input: { goal: "design-system-page", phase: "dry-run-section" },
    });
    await ackCheckpoint();
    const workflowPagePhase = await adapter.callTool({
      name: "workflow.next",
      input: { goal: "design-system-page", phase: "page-creation" },
    });
    await ackCheckpoint();
    const workflowPresentationPhase = await adapter.callTool({
      name: "workflow.next",
      input: { goal: "design-system-page", phase: "presentation-pass" },
    });
    await ackCheckpoint();
    const details = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { tools: ["publish"] },
    });
    const insertFragmentDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { tools: ["insert-fragment"] },
    });
    const fuzzyDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "styles" },
    });

    expect(session.initialize).not.toHaveBeenCalled();
    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({
        readThisFirst: expect.stringContaining(
          "first call meta.guide with the user's objective"
        ),
        delegatedAgentRule: expect.stringContaining(
          "shortcut command such as webstudio meta.index"
        ),
        startHere: expect.arrayContaining(["meta.guide", "workflow.next"]),
        discovery: expect.objectContaining({
          overview: expect.stringContaining(
            "Do not call every discovery tool up front"
          ),
          tools: expect.stringContaining('"tools"'),
          insertFragment: expect.stringContaining("parentInstanceId"),
          components: expect.stringContaining('"brief"'),
          workflow: expect.stringContaining("workflow.next"),
        }),
        rules: expect.arrayContaining([
          expect.stringContaining(
            "Use direct value tools for fixed text/props"
          ),
        ]),
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            area: "publish",
            tools: ["publish"],
          }),
        ]),
      })
    );
    const indexData = index.structuredContent.data as { readThisFirst: string };
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining("delegated or non-streaming agent")
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining(
        "Copying a `.webstudio` folder is not an isolated project clone"
      )
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining("pass `--dry-run` to local-capable mutations")
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining('components.coverage-plan {"detail":"roots"}')
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining("`list-pages` does not accept `detail`")
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining(
        "Do not take a broad task such as creating a full design-system page as one execution unit"
      )
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining('workflow.next {"goal":"design-system-page"}')
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining("one dry-run JSX section")
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining("components.coverage-insert-next")
    );
    expect(indexData.readThisFirst).toEqual(
      expect.stringContaining("Phase commands do not include nextPhase")
    );
    expect(indexData.readThisFirst).not.toContain("Page details with");
    const discovery = (
      index.structuredContent.data as {
        discovery: { insertFragment: string };
      }
    ).discovery;
    expect(discovery.insertFragment).toContain("insert-fragment");
    expect(discovery.insertFragment).toContain("parentInstanceId");
    expect(discovery.insertFragment).toContain("not parentId");
    expect(discovery.insertFragment).toContain("ws:style={css`...`}");
    expect(discovery.insertFragment).toContain("style={{ padding: 24 }}");
    expect(JSON.stringify(index.structuredContent.data)).not.toContain(
      "{ brief }"
    );
    expect(JSON.stringify(index.structuredContent.data)).not.toContain(
      "({ brief })"
    );
    expect(index.structuredContent.data).not.toEqual(
      expect.objectContaining({
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            tools: expect.arrayContaining(["create-page"]),
          }),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "publish" }),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "publish",
            mcpExamples: [{ target: "production" }],
          }),
        ]),
      })
    );
    expect(workflow.structuredContent.data).toEqual(
      expect.objectContaining({
        goal: "design-system-page",
        phase: "discovery",
        mustReturnAfter: true,
        parentVisibleCheckpoint: expect.stringContaining(
          "acknowledge this checkpoint first"
        ),
        checkpoint: expect.objectContaining({
          required: true,
          instruction: expect.stringContaining("Stop after this workflow.next"),
        }),
        allowedTools: ["components.coverage-plan"],
        nextPhase: "page-creation",
      })
    );
    expect(detailsWhileCheckpointed.structuredContent.data).toEqual(
      expect.objectContaining({ tools: expect.any(Array) })
    );
    expect(workflowPhase.structuredContent.data).toEqual(
      expect.objectContaining({
        goal: "design-system-page",
        phase: "dry-run-section",
        mustReturnAfter: true,
        checkpoint: expect.objectContaining({ required: true }),
        allowedTools: expect.arrayContaining(["insert-fragment"]),
        commandPattern: expect.stringContaining('ws:tag=\\"h2\\"'),
        constraints: expect.arrayContaining([
          expect.stringContaining("Keep the dry-run fragment tiny"),
          expect.stringContaining("do not use deprecated $.Box"),
        ]),
        nextPhase: "commit-section",
      })
    );
    expect(workflowPagePhase.structuredContent.data).toEqual(
      expect.objectContaining({
        goal: "design-system-page",
        phase: "page-creation",
        purpose: expect.stringContaining("Create it only if lookup proves"),
        allowedTools: expect.arrayContaining(["list-pages"]),
        commandPattern: expect.stringMatching(/list-pages.*limit/),
        fallbackCommandPattern: expect.stringMatching(
          /create-page.*\/design-system/
        ),
        expectedReturn: expect.arrayContaining([
          "whether /design-system already exists",
          "if missing, report that create-page is the next phase action",
        ]),
      })
    );
    expect(workflowPresentationPhase.structuredContent.data).toEqual(
      expect.objectContaining({
        goal: "design-system-page",
        phase: "presentation-pass",
        purpose: expect.stringContaining("real design-system page"),
        allowedTools: expect.arrayContaining(["update-styles"]),
        constraints: expect.arrayContaining([
          expect.stringContaining("Do not treat coverage 72/72 as completion"),
          expect.stringContaining("Keep every covered component"),
        ]),
      })
    );
    expect(details.structuredContent.data).toEqual(
      expect.objectContaining({
        requestedTools: ["publish"],
        missingTools: [],
        count: 1,
        omittedCount: 0,
        tools: [
          expect.objectContaining({
            name: "publish",
            inputSchema: expect.any(Object),
            inputFields: ["target", "domains"],
            mcpExamples: [{ target: "production" }],
            inputNote: expect.stringContaining(
              "Use direct value tools for fixed text/props"
            ),
          }),
        ],
      })
    );
    const [publishDetails] = (
      details.structuredContent.data as {
        tools: { inputNote: string }[];
      }
    ).tools;
    expect(publishDetails?.inputNote).toContain(
      "MCP tool arguments are JSON objects, not CLI flags"
    );
    expect(publishDetails?.inputNote).toContain(
      "prefer insert-fragment so JSX is converted locally"
    );
    const [insertFragmentToolDetails] = (
      insertFragmentDetails.structuredContent.data as {
        tools: { mcpExamples: unknown[] }[];
      }
    ).tools;
    const insertFragmentExamples = JSON.stringify(
      insertFragmentToolDetails?.mcpExamples
    );
    expect(insertFragmentExamples).toContain("ws:style={css`");
    expect(insertFragmentExamples).toContain('ws:tag=\\"section\\"');
    expect(insertFragmentExamples).toContain("style={{ padding: 32");
    expect(insertFragmentExamples).toContain("ws:tokens");
    expect(insertFragmentExamples).toContain("ActionValue");
    expect(insertFragmentExamples).toContain("radix.SwitchThumb");
    expect(fuzzyDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("capped"),
        count: expect.any(Number),
        omittedCount: expect.any(Number),
        tools: expect.any(Array),
      })
    );
    expect(
      (fuzzyDetails.structuredContent.data as { tools: unknown[] }).tools.length
    ).toBeLessThanOrEqual(12);

    const insertDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "insert component" },
    });
    const insertToolNames = (
      insertDetails.structuredContent.data as { tools: { name: string }[] }
    ).tools.map((tool) => tool.name);
    expect(insertToolNames[0]).toBe("insert-fragment");
    if (insertToolNames.includes("insert-component")) {
      expect(insertToolNames.indexOf("insert-component")).toBeLessThan(
        insertToolNames.indexOf("list-instances")
      );
    }

    const styledSectionDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "create a styled section" },
    });
    const styledSectionToolNames = (
      styledSectionDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    expect(styledSectionToolNames[0]).toBe("insert-fragment");
    expect(styledSectionToolNames).not.toEqual(
      expect.arrayContaining(["delete-folder", "import", "create-breakpoint"])
    );

    const heroSectionDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "style hero section" },
    });
    const heroSectionToolNames = (
      heroSectionDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    expect(heroSectionToolNames[0]).toBe("insert-fragment");
    expect(heroSectionToolNames).not.toEqual(
      expect.arrayContaining([
        "delete-page",
        "delete-folder",
        "delete-styles",
        "delete-breakpoint",
      ])
    );

    const deleteStylesDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete unused styles" },
    });
    const deleteStylesToolNames = (
      deleteStylesDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    expect(deleteStylesToolNames[0]).toBe("delete-styles");
    expect(deleteStylesToolNames).not.toEqual(
      expect.arrayContaining([
        "delete-page",
        "delete-folder",
        "delete-redirect",
        "insert-fragment",
        "update-styles",
      ])
    );

    const deleteCssVariablesDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete CSS variables" },
    });
    const deleteCssVariablesToolNames = (
      deleteCssVariablesDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (deleteCssVariablesToolNames.includes("delete-css-variable")) {
      expect(deleteCssVariablesToolNames[0]).toBe("delete-css-variable");
    }
    expect(deleteCssVariablesToolNames).not.toEqual(
      expect.arrayContaining(["delete-variable"])
    );

    const deleteVariablesDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete variables" },
    });
    const deleteVariablesToolNames = (
      deleteVariablesDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (deleteVariablesToolNames.includes("delete-variable")) {
      expect(deleteVariablesToolNames[0]).toBe("delete-variable");
    }

    const createCssVariableDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "create CSS variable" },
    });
    const createCssVariableToolNames = (
      createCssVariableDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (createCssVariableToolNames.includes("define-css-variable")) {
      expect(createCssVariableToolNames[0]).toBe("define-css-variable");
    }

    const createVariablesDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "create variables" },
    });
    const createVariablesToolNames = (
      createVariablesDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (createVariablesToolNames.includes("create-variable")) {
      expect(createVariablesToolNames[0]).toBe("create-variable");
    }

    const deleteDesignTokenDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete design token" },
    });
    const deleteDesignTokenToolNames = (
      deleteDesignTokenDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    expect(deleteDesignTokenToolNames).not.toEqual(
      expect.arrayContaining([
        "delete-design-token-styles",
        "detach-design-token",
      ])
    );

    const deleteDesignTokenStylesDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete design token styles" },
    });
    const deleteDesignTokenStylesToolNames = (
      deleteDesignTokenStylesDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (
      deleteDesignTokenStylesToolNames.includes("delete-design-token-styles")
    ) {
      expect(deleteDesignTokenStylesToolNames[0]).toBe(
        "delete-design-token-styles"
      );
    }

    const detachDesignTokenDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "remove design token from component" },
    });
    const detachDesignTokenToolNames = (
      detachDesignTokenDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (detachDesignTokenToolNames.includes("detach-design-token")) {
      expect(detachDesignTokenToolNames[0]).toBe("detach-design-token");
    }

    const updateTextDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "update text" },
    });
    const updateTextToolNames = (
      updateTextDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    expect(updateTextToolNames[0]).toBe("update-text");
    expect(updateTextToolNames).not.toEqual(
      expect.arrayContaining(["update-page", "update-styles"])
    );

    const deletePageDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete page" },
    });
    const deletePageToolNames = (
      deletePageDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (deletePageToolNames.includes("delete-page")) {
      expect(deletePageToolNames[0]).toBe("delete-page");
    }
    expect(deletePageToolNames).toEqual(expect.arrayContaining(["list-pages"]));
    expect(deletePageToolNames).not.toEqual(
      expect.arrayContaining([
        "create-page",
        "update-page",
        "duplicate-page",
        "delete-folder",
      ])
    );

    const deletePagesDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete pages" },
    });
    const deletePagesToolNames = (
      deletePagesDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (deletePagesToolNames.includes("delete-page")) {
      expect(deletePagesToolNames[0]).toBe("delete-page");
    }
    expect(deletePagesToolNames).not.toEqual(
      expect.arrayContaining(["create-page", "update-page", "delete-folder"])
    );

    const componentTreeDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "insert styled component tree" },
    });
    const componentTreeToolNames = (
      componentTreeDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    expect(componentTreeToolNames[0]).toBe("insert-fragment");

    const replaceImageDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "replace image" },
    });
    const replaceImageToolNames = (
      replaceImageDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (replaceImageToolNames.includes("replace-asset")) {
      expect(replaceImageToolNames[0]).toBe("replace-asset");
    }

    const moveComponentDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "move component" },
    });
    const moveComponentToolNames = (
      moveComponentDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (moveComponentToolNames.includes("move-instance")) {
      expect(moveComponentToolNames[0]).toBe("move-instance");
    }

    const cloneSectionDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "clone section" },
    });
    const cloneSectionToolNames = (
      cloneSectionDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (cloneSectionToolNames.includes("clone-instance")) {
      expect(cloneSectionToolNames[0]).toBe("clone-instance");
    }

    const deleteComponentDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "delete component" },
    });
    const deleteComponentToolNames = (
      deleteComponentDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (deleteComponentToolNames.includes("delete-instance")) {
      expect(deleteComponentToolNames[0]).toBe("delete-instance");
    }

    const compareScreenshotsDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "compare screenshots" },
    });
    const compareScreenshotsToolNames = (
      compareScreenshotsDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (compareScreenshotsToolNames.includes("screenshot.diff")) {
      expect(compareScreenshotsToolNames[0]).toBe("screenshot.diff");
    }

    const findComponentDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "find component" },
    });
    const findComponentToolNames = (
      findComponentDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (findComponentToolNames.includes("components.search")) {
      expect(findComponentToolNames[0]).toBe("components.search");
    }

    const getComponentDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "get component details" },
    });
    const jsonLdGuide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "Add JSON-LD structured data to the home page" },
    });
    const collectionGuide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "Render an array of blog posts as repeated cards" },
    });
    const expressionGuide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "Bind a dynamic expression to a prop" },
    });
    const authenticatedPageGuide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "Build a Supabase authenticated account page" },
    });
    const designInputGuide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "Recreate this Figma design as a responsive page" },
    });
    const craftGuide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "Add a section that preserves this Craft project" },
    });
    const getComponentToolNames = (
      getComponentDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (getComponentToolNames.includes("components.get")) {
      expect(getComponentToolNames[0]).toBe("components.get");
    }

    const coverageDetails = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "check component coverage" },
    });
    const coverageToolNames = (
      coverageDetails.structuredContent.data as {
        tools: { name: string }[];
      }
    ).tools.map((tool) => tool.name);
    if (coverageToolNames.includes("components.coverage-status")) {
      expect(coverageToolNames[0]).toBe("components.coverage-status");
    }
    expect(jsonLdGuide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          expect.stringContaining("do not use update-page custom metadata"),
          expect.stringContaining("Insert JsonLd under HeadSlot"),
          expect.stringContaining("Run audit"),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "components.get" }),
          expect.objectContaining({ name: "audit" }),
        ]),
      })
    );
    expect(collectionGuide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          expect.stringContaining("complete nested array/object"),
          expect.stringContaining("insert-collection"),
          expect.stringContaining("private parameters atomically"),
          expect.stringContaining("stable unique id or slug"),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "insert-collection" }),
        ]),
      })
    );
    expect(expressionGuide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          expect.stringContaining("webstudio://project/expressions"),
          expect.stringContaining("do not guess scoped identifier names"),
          expect.stringContaining("one expression rather than a statement"),
          expect.stringContaining("successful syntax validation"),
        ]),
      })
    );
    expect(authenticatedPageGuide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          expect.stringContaining("existing auth resources"),
          expect.stringContaining("Never place credentials"),
          expect.stringContaining("signed-out, loading, signed-in"),
          expect.stringContaining("not an authorization boundary"),
          expect.stringContaining("call verify-bindings"),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "list-instances" }),
          expect.objectContaining({ name: "insert-fragment" }),
          expect.objectContaining({ name: "verify-bindings" }),
          expect.objectContaining({ name: "audit" }),
        ]),
      })
    );
    expect(designInputGuide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          expect.stringContaining("Interpret the supplied design"),
          expect.stringContaining(
            "Before the first mutation, call list-breakpoints and list-design-tokens"
          ),
          expect.stringContaining("parallel design system"),
          expect.stringContaining("semantic editable structure"),
          expect.stringContaining("actual breakpoint ranges"),
          expect.stringContaining("Run rendered audit"),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "list-breakpoints" }),
          expect.objectContaining({ name: "components.search" }),
          expect.objectContaining({ name: "insert-fragment" }),
          expect.objectContaining({ name: "attach-design-token" }),
          expect.objectContaining({ name: "update-styles" }),
        ]),
      })
    );
    expect(craftGuide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          expect.stringContaining('"scopes":["craft"]'),
          expect.stringContaining("do not add Craft"),
          expect.stringContaining("only the first reported"),
          expect.stringContaining("templateCompatibility"),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "audit" }),
        ]),
      })
    );
  });

  test("rejects invalid focused discovery input with path-specific messages", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    await expect(
      adapter.callTool({
        name: "meta.guide",
        input: { brief: true },
      })
    ).rejects.toThrow(
      "meta.guide input.brief must be a string when provided. Received boolean."
    );
    await expect(
      adapter.callTool({
        name: "meta.get_more_tools",
        input: { tools: "insert-component" },
      })
    ).rejects.toThrow(
      "meta.get_more_tools input.tools must be an array of strings when provided. Received string."
    );
    await expect(
      adapter.callTool({
        name: "components.get",
        input: {},
      })
    ).rejects.toThrow("components.get input.component is required.");
    await expect(
      adapter.callTool({
        name: "meta.index",
        input: { query: "create a styled section" },
      })
    ).rejects.toThrow(
      'meta.index does not accept input. Call meta.guide with {"brief":"..."} for goal-specific guidance.'
    );
    await expect(
      adapter.callTool({
        name: "workflow.next",
        input: { goal: "full-site" },
      })
    ).rejects.toThrow(
      'workflow.next currently supports goal "design-system-page".'
    );
    await expect(
      adapter.callTool({
        name: "workflow.next",
        input: { goal: "design-system-page", phase: "everything" },
      })
    ).rejects.toThrow(
      "workflow.next input.phase must be one of discovery, page-creation, dry-run-section, commit-section, coverage-batch, presentation-pass."
    );
    expect(session.initialize).not.toHaveBeenCalled();
  });

  test("exposes structured component discovery without full resource parsing", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const summary = await adapter.callTool({ name: "components.summary" });
    const summaryDetails = await adapter.callTool({
      name: "components.summary",
      input: { detail: "components", limit: 100 },
    });
    const componentRegistry = await adapter.callTool({
      name: "components.list",
      input: { source: "all", limit: 200 },
    });
    const templateRegistry = await adapter.callTool({
      name: "templates.list",
      input: { limit: 200 },
    });
    const coveragePlan = await adapter.callTool({
      name: "components.coverage-plan",
    });
    const checkpointedFind = await adapter.callTool({
      name: "components.find",
      input: { brief: "radix select" },
    });
    expect(checkpointedFind.structuredContent.data).toEqual(
      expect.objectContaining({ components: expect.any(Array) })
    );
    await expect(
      adapter.callTool({
        name: "checkpoint.ack",
        input: { reported: false },
      })
    ).rejects.toThrow(
      'checkpoint.ack requires {"reported":true,"continueAfterReport":true,"summary":"..."}'
    );
    await expect(
      adapter.callTool({
        name: "checkpoint.ack",
        input: { reported: true },
      })
    ).rejects.toThrow(
      'checkpoint.ack requires {"reported":true,"continueAfterReport":true,"summary":"..."}'
    );
    await expect(
      adapter.callTool({
        name: "checkpoint.ack",
        input: {
          reported: true,
          continueAfterReport: true,
          summary: "reported checkpoint",
        },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        structuredContent: expect.objectContaining({
          data: expect.objectContaining({
            acknowledged: true,
            summary: "reported checkpoint",
          }),
        }),
      })
    );
    const coveragePlanAlias = await adapter.callTool({
      name: "get-component-coverage-plan",
    });
    await adapter.callTool({
      name: "checkpoint.ack",
      input: {
        reported: true,
        continueAfterReport: true,
        summary: "reported checkpoint",
      },
    });
    const fullCoveragePlan = await adapter.callTool({
      name: "components.coverage-plan",
      input: { detail: "full" },
    });
    await adapter.callTool({
      name: "checkpoint.ack",
      input: {
        reported: true,
        continueAfterReport: true,
        summary: "reported checkpoint",
      },
    });
    const rootCoveragePlan = await adapter.callTool({
      name: "components.coverage-plan",
      input: { detail: "roots", limit: 5 },
    });
    await adapter.callTool({
      name: "checkpoint.ack",
      input: {
        reported: true,
        continueAfterReport: true,
        summary: "reported checkpoint",
      },
    });
    const xmlCoveragePlan = await adapter.callTool({
      name: "components.coverage-plan",
      input: { documentType: "xml", detail: "roots", limit: 100 },
    });
    await adapter.callTool({
      name: "checkpoint.ack",
      input: {
        reported: true,
        continueAfterReport: true,
        summary: "reported checkpoint",
      },
    });
    const find = await adapter.callTool({
      name: "components.find",
      input: { brief: "radix select indicator" },
    });
    const search = await adapter.callTool({
      name: "components.search",
      input: { brief: "radix select indicator" },
    });
    const bodyFind = await adapter.callTool({
      name: "components.find",
      input: { brief: "body" },
    });
    const bodyDetails = await adapter.callTool({
      name: "components.get",
      input: { component: "Body" },
    });
    const broadFind = await adapter.callTool({
      name: "components.find",
      input: { brief: "radix tabs dialog select" },
    });
    const broadFindNextPage = await adapter.callTool({
      name: "components.find",
      input: { brief: "radix tabs dialog select", offset: 12, limit: 3 },
    });
    const details = await adapter.callTool({
      name: "components.get",
      input: {
        component:
          "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
      },
    });
    const selectDetails = await adapter.callTool({
      name: "components.get",
      input: { component: "@webstudio-is/sdk-components-react-radix:Select" },
    });
    const selectTemplateDetails = await adapter.callTool({
      name: "templates.get",
      input: { component: "@webstudio-is/sdk-components-react-radix:Select" },
    });
    const buttonDetails = await adapter.callTool({
      name: "components.get",
      input: { component: "Button" },
    });
    const jsonLdDetails = await adapter.callTool({
      name: "components.get",
      input: { component: "JsonLd" },
    });
    const collectionDetails = await adapter.callTool({
      name: "components.get",
      input: { component: "ws:collection" },
    });
    const italicDetails = await adapter.callTool({
      name: "components.get",
      input: { component: "Italic" },
    });
    const animationGroupDetails = await adapter.callTool({
      name: "components.get",
      input: {
        component: "@webstudio-is/sdk-components-animation:AnimateChildren",
      },
    });
    const textAnimationDetails = await adapter.callTool({
      name: "components.get",
      input: {
        component: "@webstudio-is/sdk-components-animation:AnimateText",
      },
    });
    const staggerAnimationDetails = await adapter.callTool({
      name: "components.get",
      input: {
        component: "@webstudio-is/sdk-components-animation:StaggerAnimation",
      },
    });
    const videoAnimationDetails = await adapter.callTool({
      name: "components.get",
      input: {
        component: "@webstudio-is/sdk-components-animation:VideoAnimation",
      },
    });
    const coveragePlanData = coveragePlan.structuredContent.data as {
      total: number;
      rootCount: number;
      partCount: number;
    };

    expect(session.initialize).not.toHaveBeenCalled();
    expect(summary.structuredContent.data).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("Default summary is compact"),
        total: expect.any(Number),
        templateCount: expect.any(Number),
        standaloneInsertableCount: expect.any(Number),
        nonStandaloneCount: expect.any(Number),
      })
    );
    expect(summary.structuredContent.data).not.toHaveProperty("components");
    expect(JSON.stringify(summary.structuredContent.data).length).toBeLessThan(
      1_000
    );
    expect(summaryDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        detail: "components",
        count: expect.any(Number),
        pagination: { offset: 0, limit: 100, nextOffset: undefined },
        components: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Select",
            hasTemplate: true,
            standaloneInsertable: true,
          }),
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Checkbox",
            jsxElement: "<radix.Checkbox />",
            hasTemplate: true,
            templateRootComponents: [
              "@webstudio-is/sdk-components-react-radix:Label",
            ],
          }),
          expect.objectContaining({
            component:
              "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
            jsxElement: "<radix.SelectItemIndicator />",
            standaloneInsertable: false,
          }),
        ]),
      })
    );
    expect(componentRegistry.structuredContent.data).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("compact metadata"),
        source: "all",
        documentType: "html",
        items: expect.arrayContaining([
          expect.objectContaining({
            name: "component:HtmlEmbed",
            type: "registry:ui",
            meta: expect.objectContaining({
              source: "meta",
              component: "HtmlEmbed",
              insert: expect.objectContaining({
                component: "HtmlEmbed",
                template: false,
              }),
            }),
          }),
          expect.objectContaining({
            name: "template:@webstudio-is/sdk-components-react-radix:Select",
            type: "registry:ui",
            meta: expect.objectContaining({
              source: "template",
              component: "@webstudio-is/sdk-components-react-radix:Select",
              insert: expect.objectContaining({
                component: "@webstudio-is/sdk-components-react-radix:Select",
                template: true,
              }),
            }),
          }),
        ]),
      })
    );
    expect(
      JSON.stringify(componentRegistry.structuredContent.data)
    ).not.toContain('"files"');
    expect(templateRegistry.structuredContent.data).toEqual(
      expect.objectContaining({
        source: "template",
        items: expect.arrayContaining([
          expect.objectContaining({
            name: "template:@webstudio-is/sdk-components-react-radix:Select",
          }),
        ]),
      })
    );
    expect(templateRegistry.structuredContent.data).not.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ name: "component:HtmlEmbed" }),
        ]),
      })
    );
    expect(
      JSON.stringify(templateRegistry.structuredContent.data).length
    ).toBeLessThan(50_000);
    expect(coveragePlan.structuredContent.data).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("intentionally compact"),
        checkpoint: expect.objectContaining({
          required: true,
          instruction: expect.stringContaining(
            "Stop after this coverage-plan response"
          ),
          nextAllowedAfterReport: expect.stringContaining("create the page"),
        }),
        total: expect.any(Number),
        rootCount: expect.any(Number),
        partCount: expect.any(Number),
        uncoveredPartCount: 0,
        roots: expect.arrayContaining([
          expect.objectContaining({
            component: expect.any(String),
            jsxElement: expect.stringMatching(/^<.+ \/>$/),
            coveredCount: expect.any(Number),
          }),
        ]),
      })
    );
    expect(coveragePlanAlias.structuredContent.data).toEqual(
      expect.objectContaining({
        total: coveragePlanData.total,
        rootCount: coveragePlanData.rootCount,
        partCount: coveragePlanData.partCount,
      })
    );
    expect(coveragePlan.structuredContent.data).not.toEqual(
      expect.objectContaining({
        partComponents: expect.any(Array),
      })
    );
    expect(coveragePlan.structuredContent.data).not.toEqual(
      expect.objectContaining({
        roots: expect.arrayContaining([
          expect.objectContaining({ sampleCovers: expect.any(Array) }),
        ]),
      })
    );
    expect(rootCoveragePlan.structuredContent.data).toEqual(
      expect.objectContaining({
        documentType: "html",
        roots: expect.arrayContaining([
          expect.objectContaining({
            sampleCovers: expect.any(Array),
          }),
        ]),
      })
    );
    for (const component of ["Body", "XmlNode", "XmlTime"]) {
      expect(rootCoveragePlan.structuredContent.data).not.toEqual(
        expect.objectContaining({
          roots: expect.arrayContaining([
            expect.objectContaining({ component }),
          ]),
        })
      );
    }
    expect(xmlCoveragePlan.structuredContent.data).toEqual(
      expect.objectContaining({
        documentType: "xml",
        roots: expect.arrayContaining([
          expect.objectContaining({ component: "XmlNode" }),
          expect.objectContaining({ component: "XmlTime" }),
        ]),
      })
    );
    expect(fullCoveragePlan.structuredContent.data).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("design-system coverage"),
        documentType: "html",
        total: expect.any(Number),
        rootCount: expect.any(Number),
        partCount: expect.any(Number),
        roots: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-animation:AnimateChildren",
            covers: expect.arrayContaining([
              // contentModel.children: direct child components count toward coverage.
              "@webstudio-is/sdk-components-animation:AnimateText",
              "@webstudio-is/sdk-components-animation:StaggerAnimation",
            ]),
          }),
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Select",
            hasTemplate: true,
            insertWith: "@webstudio-is/sdk-components-react-radix:Select",
            templateRootComponents: [
              "@webstudio-is/sdk-components-react-radix:Select",
            ],
            templateRequiredParts: expect.arrayContaining([
              "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
            ]),
            covers: expect.arrayContaining([
              // contentModel.descendants: nested component parts count too.
              "@webstudio-is/sdk-components-react-radix:SelectTrigger",
              "@webstudio-is/sdk-components-react-radix:SelectContent",
            ]),
          }),
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Checkbox",
            hasTemplate: true,
            insertWith: "@webstudio-is/sdk-components-react-radix:Checkbox",
            templateRootComponents: [
              "@webstudio-is/sdk-components-react-radix:Label",
            ],
          }),
          expect.objectContaining({
            component: "HeadSlot",
            covers: expect.arrayContaining([
              "HeadLink",
              "HeadMeta",
              "HeadTitle",
            ]),
          }),
          expect.objectContaining({
            component: "ws:block",
            covers: expect.arrayContaining(["ws:block-template"]),
          }),
        ]),
        partComponents: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-animation:AnimateText",
            coveredBy: expect.arrayContaining([
              "@webstudio-is/sdk-components-animation:AnimateChildren",
            ]),
          }),
          expect.objectContaining({
            component:
              "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
            coveredBy: expect.arrayContaining([
              "@webstudio-is/sdk-components-react-radix:Select",
            ]),
          }),
        ]),
        uncoveredPartComponents: [],
      })
    );
    expect(find.structuredContent.data).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("compact, and paged"),
        count: expect.any(Number),
        totalCount: expect.any(Number),
        pagination: expect.objectContaining({
          offset: 0,
          limit: 12,
        }),
        components: expect.arrayContaining([
          expect.objectContaining({
            component:
              "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
          }),
        ]),
      })
    );
    expect(search.structuredContent.data).toEqual(
      expect.objectContaining({
        query: "radix select indicator",
        components: expect.arrayContaining([
          expect.objectContaining({
            component:
              "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
          }),
        ]),
      })
    );
    expect(bodyFind.structuredContent.data).toEqual(
      expect.objectContaining({
        count: 0,
        components: [],
      })
    );
    expect(bodyDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        found: false,
        component: "Body",
      })
    );
    expect(broadFind.structuredContent.data).toEqual(
      expect.objectContaining({
        count: 12,
        totalCount: expect.any(Number),
        omittedCount: expect.any(Number),
        pagination: expect.objectContaining({
          offset: 0,
          limit: 12,
          nextOffset: 12,
        }),
        components: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Tabs",
            matchedTokens: expect.arrayContaining(["radix", "tabs"]),
          }),
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Dialog",
            matchedTokens: expect.arrayContaining(["radix", "dialog"]),
          }),
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Select",
            matchedTokens: expect.arrayContaining(["radix", "select"]),
          }),
        ]),
      })
    );
    const broadFindData = broadFind.structuredContent.data as {
      components: Record<string, unknown>[];
      count: number;
      totalCount: number;
    };
    expect(broadFindData.totalCount).toBeGreaterThan(broadFindData.count);
    for (const component of broadFindData.components) {
      expect(Object.values(component)).not.toContain(undefined);
      expect(component).not.toHaveProperty("templateRequiredParts");
      expect(component).not.toHaveProperty("templateRequiredEdges");
      expect(component).not.toHaveProperty("templateTextContent");
    }
    expect(broadFindNextPage.structuredContent.data).toEqual(
      expect.objectContaining({
        count: 3,
        pagination: expect.objectContaining({
          offset: 12,
          limit: 3,
        }),
      })
    );
    expect(details.structuredContent.data).toEqual(
      expect.objectContaining({
        found: true,
        component:
          "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
        standaloneInsertable: false,
        contentModel: expect.any(Object),
        props: expect.any(Object),
        usage: expect.stringContaining(
          "Do not insert this component standalone"
        ),
      })
    );
    expect(buttonDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "Button",
        found: false,
      })
    );
    expect(italicDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "Italic",
        found: false,
      })
    );
    expect(
      (
        await adapter.callTool({
          name: "components.get",
          input: {
            component: "@webstudio-is/sdk-components-react-radix:Checkbox",
          },
        })
      ).structuredContent.data
    ).toEqual(
      expect.objectContaining({
        component: "@webstudio-is/sdk-components-react-radix:Checkbox",
        hasTemplate: true,
        templateRootComponents: [
          "@webstudio-is/sdk-components-react-radix:Label",
        ],
        usage: expect.stringContaining("templateRootComponents"),
      })
    );
    expect(animationGroupDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "@webstudio-is/sdk-components-animation:AnimateChildren",
        animationUsage: expect.stringContaining(
          "Animation Group is the root animation controller"
        ),
        props: expect.objectContaining({
          action: expect.objectContaining({ type: "animationAction" }),
        }),
        usage: expect.stringContaining('fill:"backwards"'),
      })
    );
    expect(textAnimationDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "@webstudio-is/sdk-components-animation:AnimateText",
        animationUsage: expect.stringContaining("splitBy"),
        props: expect.objectContaining({
          slidingWindow: expect.objectContaining({ defaultValue: 5 }),
          splitBy: expect.objectContaining({
            options: expect.arrayContaining(["char", "space"]),
          }),
        }),
        usage: expect.stringContaining("direct child of Animation Group"),
      })
    );
    expect(staggerAnimationDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "@webstudio-is/sdk-components-animation:StaggerAnimation",
        animationUsage: expect.stringContaining("direct children"),
        props: expect.objectContaining({
          slidingWindow: expect.objectContaining({ defaultValue: 1 }),
        }),
        usage: expect.stringContaining("slidingWindow 0"),
      })
    );
    expect(videoAnimationDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "@webstudio-is/sdk-components-animation:VideoAnimation",
        hasTemplate: true,
        animationUsage: expect.stringContaining("Video child template"),
        props: expect.objectContaining({
          timeline: expect.objectContaining({ type: "boolean" }),
        }),
        usage: expect.stringContaining("seek-friendly videos"),
      })
    );
    expect(selectDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "@webstudio-is/sdk-components-react-radix:Select",
        hasTemplate: true,
        templateRequiredParts: expect.arrayContaining([
          "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
        ]),
        templateRequiredEdges: expect.arrayContaining([
          {
            parentComponent:
              "@webstudio-is/sdk-components-react-radix:SelectItem",
            childComponent:
              "@webstudio-is/sdk-components-react-radix:SelectItemIndicator",
          },
        ]),
        usage: expect.stringContaining(
          "nest them according to templateRequiredEdges"
        ),
      })
    );
    expect(jsonLdDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "JsonLd",
        description: expect.stringContaining("JSON-LD structured data"),
        jsonLdUsage: expect.stringMatching(/inside HeadSlot.*Schema\.org/),
        usage: expect.stringContaining("update-props"),
        props: expect.objectContaining({
          code: expect.objectContaining({
            control: "json-code",
            type: "string",
          }),
        }),
      })
    );
    expect(collectionDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        component: "ws:collection",
        description: expect.stringContaining("array or object"),
        collectionUsage: expect.stringMatching(
          /insert-collection.*private item\/itemKey parameters.*atomically/
        ),
        usage: expect.stringContaining("internal Collection parameter"),
        props: expect.objectContaining({
          data: expect.objectContaining({ type: "json", required: true }),
          item: expect.objectContaining({ type: "string" }),
          itemKey: expect.objectContaining({ type: "string" }),
        }),
      })
    );
    expect(selectTemplateDetails.structuredContent.data).toEqual(
      expect.objectContaining({
        found: true,
        name: "template:@webstudio-is/sdk-components-react-radix:Select",
        type: "registry:ui",
        template: expect.objectContaining({
          instances: expect.any(Array),
        }),
        meta: expect.objectContaining({
          insert: expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Select",
            template: true,
          }),
        }),
      })
    );
  });

  test("hides explicit hidden component metas even when templates are visible", async () => {
    const component = "test:ConcealedWidget";
    const previousMeta = componentMetas.get(component);
    const templates = getComponentTemplates();
    const previousTemplate = templates.get(component);
    componentMetas.set(component, {
      category: "hidden",
      label: "Concealed Widget",
      contentModel: {
        category: "instance",
        children: ["instance"],
      },
      props: {},
    } satisfies WsComponentMeta);
    templates.set(component, {
      category: "general",
      template: {
        ...createEmptyWebstudioFragment(),
        children: [{ type: "id", value: "template-root" }],
        instances: [
          {
            type: "instance",
            id: "template-root",
            component,
            children: [],
          },
        ],
      },
    });

    try {
      const adapter = createProjectSessionMcpCore({
        operations: publicMcpOperations,
        createProjectSession: createSessionFactory(),
        executeOperation: createExecuteOperation(),
      });
      const summary = await adapter.callTool({
        name: "components.summary",
        input: { detail: "components", limit: 100 },
      });
      const find = await adapter.callTool({
        name: "components.find",
        input: { brief: "ConcealedWidget" },
      });
      const details = await adapter.callTool({
        name: "components.get",
        input: { component },
      });

      expect(summary.structuredContent.data).toEqual(
        expect.objectContaining({
          components: expect.not.arrayContaining([
            expect.objectContaining({ component }),
          ]),
        })
      );
      expect(find.structuredContent.data).toEqual(
        expect.objectContaining({
          components: [],
          count: 0,
        })
      );
      expect(details.structuredContent.data).toEqual(
        expect.objectContaining({
          component,
          found: false,
        })
      );
    } finally {
      if (previousMeta === undefined) {
        componentMetas.delete(component);
      } else {
        componentMetas.set(component, previousMeta);
      }
      if (previousTemplate === undefined) {
        templates.delete(component);
      } else {
        templates.set(component, previousTemplate);
      }
    }
  });

  test("reports page component coverage status from list-instances", async () => {
    const executeOperation = createExecuteOperation(async () =>
      createEnvelope({
        operationId: "instances.list",
        result: {
          instances: [
            { id: "body", component: "ws:element", depth: 0 },
            {
              id: "switch",
              component: "@webstudio-is/sdk-components-react-radix:Switch",
              depth: 1,
            },
          ],
        },
        namespaces: {
          read: ["pages", "instances"],
          write: [],
          invalidated: [],
          missing: [],
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const status = await adapter.callTool({
      name: "components.coverage-status",
      input: { pagePath: "/design-system" },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "list-instances",
      input: {
        pageId: undefined,
        pagePath: "/design-system",
      },
      dryRun: false,
    });
    expect(status.structuredContent.data).toEqual(
      expect.objectContaining({
        pagePath: "/design-system",
        documentType: "html",
        coveredCount: expect.any(Number),
        missingCount: expect.any(Number),
        covered: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Switch",
            jsxElement: "<radix.Switch />",
          }),
        ]),
        missing: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Select",
            jsxElement: "<radix.Select />",
          }),
        ]),
        missingRoots: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Select",
            jsxElement: "<radix.Select />",
          }),
        ]),
        missingParts: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
            jsxElement: "<radix.AccordionItem />",
          }),
        ]),
      })
    );
  });

  test("inserts one missing coverage component and returns before and after coverage", async () => {
    const isTestRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" &&
      value !== null &&
      Array.isArray(value) === false;
    const instances = [
      { id: "body", component: "ws:element", depth: 0 },
      {
        id: "switch",
        component: "@webstudio-is/sdk-components-react-radix:Switch",
        depth: 1,
      },
    ];
    const executeOperation = createExecuteOperation(
      async ({ command, input }) => {
        if (command === "list-instances") {
          return createEnvelope({
            operationId: "instances.list",
            result: { instances },
            namespaces: {
              read: ["pages", "instances"],
              write: [],
              invalidated: [],
              missing: [],
            },
          });
        }
        if (command === "insert-component") {
          const component =
            isTestRecord(input) && typeof input.component === "string"
              ? input.component
              : "";
          instances.push({
            id: "inserted",
            component,
            depth: 1,
          });
          return createEnvelope({
            operationId: "components.insert",
            result: {
              rootInstanceIds: ["inserted"],
              instanceIds: ["inserted"],
              parentInstanceId:
                isTestRecord(input) &&
                typeof input.parentInstanceId === "string"
                  ? input.parentInstanceId
                  : undefined,
            },
            state: { committed: true, freshness: {} },
            version: 2,
          });
        }
        throw new Error(`Unexpected command ${command}`);
      }
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "components.coverage-insert-next",
      input: {
        pagePath: "/design-system",
        parentInstanceId: "root",
        component: "@webstudio-is/sdk-components-react-radix:Select",
      },
    });

    expect(executeOperation).toHaveBeenNthCalledWith(1, {
      command: "list-instances",
      input: {
        pageId: undefined,
        pagePath: "/design-system",
      },
      dryRun: false,
    });
    expect(executeOperation).toHaveBeenNthCalledWith(2, {
      command: "insert-component",
      input: {
        parentInstanceId: "root",
        component: "@webstudio-is/sdk-components-react-radix:Select",
      },
      dryRun: false,
    });
    expect(executeOperation).toHaveBeenNthCalledWith(3, {
      command: "list-instances",
      input: {
        pageId: undefined,
        pagePath: "/design-system",
      },
      dryRun: false,
    });
    expect(result.structuredContent.data).toEqual(
      expect.objectContaining({
        inserted: expect.objectContaining({
          component: "@webstudio-is/sdk-components-react-radix:Select",
        }),
        before: expect.objectContaining({
          coveredCount: expect.any(Number),
          missingCount: expect.any(Number),
        }),
        after: expect.objectContaining({
          coveredCount: expect.any(Number),
          missingCount: expect.any(Number),
        }),
      })
    );
    const find = await adapter.callTool({
      name: "components.find",
      input: { brief: "button" },
    });
    expect(find.structuredContent.data).toEqual(
      expect.objectContaining({ components: expect.any(Array) })
    );
    await expect(
      adapter.callTool({
        name: "components.coverage-insert-next",
        input: { pagePath: "/design-system", parentInstanceId: "root" },
      })
    ).rejects.toThrow("CHECKPOINT_REQUIRED");
  });

  test("keeps coverage reads active during a dry-run insertion", async () => {
    const instances = [
      { id: "body", component: "ws:element", depth: 0 },
      {
        id: "switch",
        component: "@webstudio-is/sdk-components-react-radix:Switch",
        depth: 1,
      },
    ];
    const executeOperation = createExecuteOperation(
      async ({ command, dryRun }) => {
        if (command === "list-instances") {
          if (dryRun) {
            throw new Error("read operations do not accept dryRun");
          }
          return createEnvelope({
            operationId: "instances.list",
            result: { instances },
          });
        }
        if (command === "insert-component") {
          expect(dryRun).toBe(true);
          return createEnvelope({
            operationId: "components.insert",
            result: {
              rootInstanceIds: ["inserted"],
              instanceIds: ["inserted"],
              parentInstanceId: "root",
            },
            state: { committed: false, freshness: {} },
            version: 1,
          });
        }
        throw new Error(`Unexpected command ${command}`);
      }
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await expect(
      adapter.callTool({
        name: "components.coverage-insert-next",
        input: {
          pagePath: "/design-system",
          parentInstanceId: "root",
          component: "@webstudio-is/sdk-components-react-radix:Select",
        },
        dryRun: true,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        structuredContent: expect.objectContaining({
          data: expect.objectContaining({ committed: false }),
        }),
      })
    );
    expect(executeOperation).toHaveBeenNthCalledWith(1, {
      command: "list-instances",
      input: {
        pageId: undefined,
        pagePath: "/design-system",
      },
      dryRun: false,
    });
    expect(executeOperation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        command: "insert-component",
        dryRun: true,
      })
    );
    expect(executeOperation).toHaveBeenNthCalledWith(3, {
      command: "list-instances",
      input: {
        pageId: undefined,
        pagePath: "/design-system",
      },
      dryRun: false,
    });
  });

  test("inserts uncovered non-standalone coverage parts under compatible parents", async () => {
    const isTestRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" &&
      value !== null &&
      Array.isArray(value) === false;
    const instances = [
      { id: "body", component: "ws:element", depth: 0 },
      {
        id: "animation-group",
        component: "@webstudio-is/sdk-components-animation:AnimateChildren",
        depth: 1,
      },
    ];
    const executeOperation = createExecuteOperation(
      async ({ command, input }) => {
        if (command === "list-instances") {
          return createEnvelope({
            operationId: "instances.list",
            result: { instances },
          });
        }
        if (command === "insert-fragment") {
          const fragment =
            isTestRecord(input) && isTestRecord(input.fragment)
              ? input.fragment
              : undefined;
          expect(input).toEqual(
            expect.objectContaining({
              parentInstanceId: "animation-group",
              fragment: expect.objectContaining({
                instances: expect.arrayContaining([
                  expect.objectContaining({
                    component:
                      "@webstudio-is/sdk-components-animation:AnimateText",
                  }),
                ]),
              }),
            })
          );
          instances.push({
            id: "animate-text",
            component: "@webstudio-is/sdk-components-animation:AnimateText",
            depth: 2,
          });
          return createEnvelope({
            operationId: "instances.insertFragment",
            result: {
              rootInstanceIds: ["animate-text"],
              instanceIds: ["animate-text"],
              parentInstanceId:
                isTestRecord(input) &&
                typeof input.parentInstanceId === "string"
                  ? input.parentInstanceId
                  : undefined,
              fragment,
            },
            state: { committed: true, freshness: {} },
            version: 2,
          });
        }
        throw new Error(`Unexpected command ${command}`);
      }
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "components.coverage-insert-next",
      input: {
        pagePath: "/design-system",
        parentInstanceId: "body",
        component: "@webstudio-is/sdk-components-animation:AnimateText",
      },
    });

    expect(executeOperation).toHaveBeenNthCalledWith(2, {
      command: "insert-fragment",
      input: expect.objectContaining({
        parentInstanceId: "animation-group",
        fragment: expect.objectContaining({
          instances: expect.arrayContaining([
            expect.objectContaining({
              component: "@webstudio-is/sdk-components-animation:AnimateText",
            }),
          ]),
        }),
      }),
      dryRun: false,
    });
    expect(result.structuredContent.data).toEqual(
      expect.objectContaining({
        inserted: expect.objectContaining({
          component: "@webstudio-is/sdk-components-animation:AnimateText",
          mode: "fragment",
        }),
        parentInstanceId: "animation-group",
      })
    );
  });

  test("exposes screenshot tools only when screenshot runners are injected", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const captureScreenshot = vi.fn(async () => ({
      output: "/tmp/current.png",
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: { width: 1440, height: 900 },
      fullPage: true,
      elapsedMs: 12,
      warnings: [],
    }));
    const adapterWithoutScreenshot = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });
    const adapterWithScreenshot = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
      captureScreenshot,
    });
    const adapterWithScreenshotDiff = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
      diffScreenshots: diffPngFiles,
    });

    expect(
      adapterWithoutScreenshot.listTools().map((tool) => tool.name)
    ).not.toContain("screenshot");
    expect(
      adapterWithoutScreenshot.listTools().map((tool) => tool.name)
    ).not.toContain("screenshot.diff");
    expect(
      adapterWithScreenshot.listTools().map((tool) => tool.name)
    ).toContain("screenshot");
    expect(
      adapterWithScreenshot.listTools().map((tool) => tool.name)
    ).not.toContain("screenshot.diff");
    expect(
      adapterWithScreenshotDiff.listTools().map((tool) => tool.name)
    ).toContain("screenshot.diff");

    const result = await adapterWithScreenshot.callTool({
      name: "screenshot",
      input: {
        url: "https://example.com",
        output: "current.png",
        viewport: { width: 1440, height: 900 },
        fullPage: true,
        browser: "auto",
        waitUntil: "networkidle",
        waitForSelector: "#ready",
        waitForTimeout: 500,
        timeout: 10_000,
      },
    });

    expect(session.initialize).not.toHaveBeenCalled();
    expect(captureScreenshot).toHaveBeenCalledWith(
      {
        url: "https://example.com",
        baseUrl: undefined,
        path: undefined,
        output: "current.png",
        host: undefined,
        port: undefined,
        imageDomains: undefined,
        source: undefined,
        viewport: { width: 1440, height: 900 },
        fullPage: true,
        includeImageMetrics: false,
        includeResourceMetrics: false,
        includeContrastMetrics: false,
        browser: "auto",
        browserPath: undefined,
        waitUntil: "networkidle",
        waitForSelector: "#ready",
        waitForTimeout: 500,
        timeout: 10_000,
      },
      expect.objectContaining({ report: expect.any(Function) })
    );
    expect(result.structuredContent).toEqual({
      ok: true,
      data: {
        output: "/tmp/current.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium",
        viewport: { width: 1440, height: 900 },
        fullPage: true,
        elapsedMs: 12,
        warnings: [],
      },
      meta: {},
    });
  });

  test("omits screenshot diff guidance when diff runner is not injected", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(async () => ({
        output: "/tmp/current.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: { width: 1440, height: 900 },
        fullPage: false,
        elapsedMs: 12,
        warnings: [],
      })),
      startPreview: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      getPreviewStatus: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      guidance: testMcpGuidance,
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "visual verification" },
    });

    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({
        visionLoop: expect.not.arrayContaining([
          expect.stringContaining("screenshot.diff"),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          testMcpGuidance.getVisionWorkflowSummary({ includeDiff: false }),
        ]),
      })
    );
    expect(guide.content[0].text).not.toContain("screenshot.diff");
  });

  test("rejects unsupported screenshot browser input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          browser: "firefox",
        },
      })
    ).rejects.toThrow(
      "screenshot browser must be auto, chromium, chrome, edge, or brave."
    );
  });

  test("rejects invalid screenshot readiness input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitUntil: "interactive",
        },
      })
    ).rejects.toThrow(
      "screenshot waitUntil must be commit, domcontentloaded, load, or networkidle."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForTimeout: -1,
        },
      })
    ).rejects.toThrow(
      "screenshot waitForTimeout must be a non-negative integer."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForTimeout: "500",
        },
      })
    ).rejects.toThrow(
      "screenshot waitForTimeout must be a non-negative integer."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForSelector: "",
        },
      })
    ).rejects.toThrow("screenshot waitForSelector must be a non-empty string.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForSelector: 1,
        },
      })
    ).rejects.toThrow("screenshot waitForSelector must be a non-empty string.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          timeout: 0,
        },
      })
    ).rejects.toThrow("screenshot timeout must be a positive integer.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          timeout: "10000",
        },
      })
    ).rejects.toThrow("screenshot timeout must be a positive integer.");
  });

  test("rejects empty screenshot url and path input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "",
        },
      })
    ).rejects.toThrow("screenshot requires url or path.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          path: "",
        },
      })
    ).rejects.toThrow("screenshot requires url or path.");
  });

  test("rejects ambiguous screenshot base URL input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          baseUrl: "http://127.0.0.1:5177",
        },
      })
    ).rejects.toThrow("screenshot requires url or path.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          baseUrl: "http://127.0.0.1:5177",
          path: "/design-system",
        },
      })
    ).rejects.toThrow(
      "screenshot accepts either url or path/baseUrl, not both."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          baseUrl: "not-a-url",
          path: "/design-system",
        },
      })
    ).rejects.toThrow("screenshot baseUrl must be an absolute URL.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          baseUrl: "http://127.0.0.1:5177",
          path: "/design-system",
          port: 5173,
        },
      })
    ).rejects.toThrow(
      "screenshot baseUrl uses an existing preview/site and cannot be combined with host, port, source, or imageDomains."
    );
  });

  test("compares screenshot diffs with generated PNG files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-diff-"));
    try {
      const baselinePath = path.join(tempDir, "baseline.png");
      const currentPath = path.join(tempDir, "current.png");
      const outputDir = path.join(tempDir, "diff");
      await writePng(baselinePath, createPng(4, 4, { r: 255, g: 255, b: 255 }));
      const current = createPng(4, 4, { r: 255, g: 255, b: 255 });
      paintRect(
        current,
        { x: 1, y: 1, width: 2, height: 1 },
        { r: 0, g: 0, b: 0 }
      );
      await writePng(currentPath, current);
      const adapter = createProjectSessionMcpCore({
        operations: publicMcpOperations,
        createProjectSession: createSessionFactory(),
        executeOperation: createExecuteOperation(),
        diffScreenshots: diffPngFiles,
      });

      const result = await adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath,
          currentPath,
          outputDir,
        },
      });

      expect(result.structuredContent.data).toEqual(
        expect.objectContaining({
          totalPixels: 16,
          differentPixels: 2,
          mismatchPercentage: 12.5,
          regions: [
            expect.objectContaining({
              bounds: { x: 1, y: 1, width: 2, height: 1 },
              pixelCount: 2,
            }),
          ],
          summary: expect.stringContaining("status: changed"),
          diffPath: path.join(outputDir, "current-diff.png"),
          contextDiffPath: path.join(outputDir, "current-context-diff.png"),
        })
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("rejects invalid screenshot diff input", async () => {
    const diffScreenshots = vi.fn(async () => ({
      totalPixels: 0,
      differentPixels: 0,
      mismatchPercentage: 0,
      summary: "Screenshot diff summary",
      regions: [],
      textAnalysis: {
        status: "ok" as const,
        provider: "tesseract" as const,
        changes: [],
        observedText: ["Pricing"],
      },
      warnings: [],
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      diffScreenshots,
    });

    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: { baselinePath: "baseline.png" },
      })
    ).rejects.toThrow("screenshot.diff requires baselinePath and currentPath.");
    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath: "baseline.png",
          currentPath: "current.png",
          threshold: 2,
        },
      })
    ).rejects.toThrow("screenshot.diff threshold must be between 0 and 1.");
    await adapter.callTool({
      name: "screenshot.diff",
      input: {
        baselinePath: "baseline.png",
        currentPath: "current.png",
        expectedText: ["Pricing"],
        expectedVisual: { maxMismatchPercentage: 2, maxChangedRegions: 3 },
      },
    });
    expect(diffScreenshots).toHaveBeenLastCalledWith(
      expect.objectContaining({
        expectedText: ["Pricing"],
        expectedVisual: { maxMismatchPercentage: 2, maxChangedRegions: 3 },
      })
    );
    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath: "baseline.png",
          currentPath: "current.png",
          expectedText: [],
        },
      })
    ).rejects.toThrow(
      "screenshot.diff expectedText must be a non-empty array of non-empty strings."
    );
    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath: "baseline.png",
          currentPath: "current.png",
          expectedVisual: { minChangedRegions: 2, maxChangedRegions: 1 },
        },
      })
    ).rejects.toThrow("screenshot.diff expectedVisual must include valid");
    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath: "baseline.png",
          currentPath: "current.png",
          expectedVisual: {
            dominantColorChange: {
              channel: "purple",
              direction: "increase",
            },
          },
        },
      })
    ).rejects.toThrow("screenshot.diff expectedVisual must include valid");
  });

  test("installs OCR only after explicit confirmation", async () => {
    const installOcr = vi.fn(async () => ({
      installed: true,
      alreadyAvailable: false,
      command: "sudo apt install -y tesseract-ocr",
      tesseractPath: "/usr/bin/tesseract",
      installUrl: tesseractInstallUrl,
      warnings: [],
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      installOcr,
    });

    await expect(
      adapter.callTool({ name: "vision.install-ocr", input: {} })
    ).rejects.toThrow(
      "vision.install-ocr requires confirm: true after explicit user consent."
    );
    await expect(
      adapter.callTool({
        name: "vision.install-ocr",
        input: { confirm: true },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        structuredContent: expect.objectContaining({
          data: expect.objectContaining({
            installed: true,
            tesseractPath: "/usr/bin/tesseract",
          }),
        }),
      })
    );
    expect(installOcr).toHaveBeenCalledOnce();
  });

  test("exposes preview tools when preview runner is injected", async () => {
    const captureScreenshot = vi.fn(async () => ({
      output: "/tmp/current.png",
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: { width: 1440, height: 900 },
      fullPage: false,
      elapsedMs: 12,
      warnings: [],
    }));
    const progressMessages: string[] = [];
    const startPreview = vi.fn(
      async (
        _input: { host?: string; port?: number; source?: "local" | "session" },
        progress?: { report: (message: string) => void }
      ) => {
        progress?.report(
          "tool preview.start preparing generated preview project"
        );
        return {
          url: "http://127.0.0.1:5173/",
          pid: 123,
          running: true,
        };
      }
    );
    const getPreviewStatus = vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    }));
    const stopPreview = vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: false,
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot,
      diffScreenshots: diffPngFiles,
      startPreview,
      getPreviewStatus,
      stopPreview,
      guidance: testMcpGuidance,
      reportToolProgress: (message) => {
        progressMessages.push(message);
      },
    });

    expect(adapter.listTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "preview.start",
        "preview.status",
        "preview.stop",
      ])
    );

    const started = await adapter.callTool({
      name: "preview.start",
      input: { host: "127.0.0.1", port: 5173, source: "session" },
    });
    const status = await adapter.callTool({ name: "preview.status" });
    const stopped = await adapter.callTool({ name: "preview.stop" });
    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "visual verification" },
    });

    expect(startPreview).toHaveBeenCalledWith(
      {
        host: "127.0.0.1",
        port: 5173,
        source: "session",
      },
      expect.objectContaining({ report: expect.any(Function) })
    );
    expect(getPreviewStatus).toHaveBeenCalledOnce();
    expect(stopPreview).toHaveBeenCalledOnce();
    expect(progressMessages).toEqual([
      "tool preview.start preparing generated preview project",
    ]);
    expect(started.structuredContent.data).toEqual({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    });
    expect(status.structuredContent.data).toEqual({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    });
    expect(stopped.structuredContent.data).toEqual({
      url: "http://127.0.0.1:5173/",
      running: false,
    });
    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({
        visionLoop: expect.arrayContaining([
          ...testMcpGuidance
            .getVisionVerificationLoop({ includeDiff: true })
            .slice(1, 3),
          'Call screenshot with { path: "/" } or the changed page path.',
        ]),
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            area: "visual-verification",
            tools: [
              "preview.start",
              "preview.status",
              "preview.stop",
              "screenshot",
              "screenshot.diff",
            ],
          }),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          testMcpGuidance.getVisionWorkflowSummary({ includeDiff: true }),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "preview.start" }),
          expect.objectContaining({ name: "screenshot" }),
        ]),
      })
    );
  });

  test("does not include visual guidance without host-provided docs", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "visual verification" },
    });

    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({ visionLoop: [] })
    );
    expect(
      (guide.structuredContent.data as { workflow: string[] }).workflow
    ).not.toContain(
      testMcpGuidance.getVisionWorkflowSummary({ includeDiff: false })
    );
  });

  test("rejects invalid preview ports", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "preview.start",
        input: { port: 70000 },
      })
    ).rejects.toThrow("preview port must be an integer between 1 and 65535.");
  });

  test("rejects empty preview host", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "preview.start",
        input: { host: "" },
      })
    ).rejects.toThrow("preview host must not be empty.");
  });

  test("uses discovery tools when meta guide has no brief", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const guide = await adapter.callTool({ name: "meta.guide" });

    expect(session.initialize).not.toHaveBeenCalled();
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "status" }),
          expect.objectContaining({ name: "whoami" }),
        ]),
      })
    );
  });

  test("rejects unknown tools before calling the operation executor", async () => {
    const createProjectSession = createSessionFactory();
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession,
      executeOperation,
    });

    await expect(adapter.callTool({ name: "unknown-tool" })).rejects.toThrow(
      'Unknown MCP tool "unknown-tool".'
    );
    expect(createProjectSession).not.toHaveBeenCalled();
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test.each([
    {
      command: "insert-fragment",
      input: {
        parentInstanceId: "body",
        fragment: '<ws.element ws:tag="div" />',
      },
    },
    {
      command: "insert-collection",
      input: {
        parentInstanceId: "body",
        data: { type: "json", value: [] },
        itemFragment: '<ws.element ws:tag="article" />',
      },
    },
  ])(
    "does not dispatch the $command adapter when the operation is unavailable",
    async ({ command, input }) => {
      const createProjectSession = createSessionFactory();
      const executeOperation = createExecuteOperation();
      const adapter = createProjectSessionMcpCore({
        operations: publicMcpOperations.filter(
          (operation) => operation.command !== command
        ),
        createProjectSession,
        executeOperation,
      });

      await expect(adapter.callTool({ name: command, input })).rejects.toThrow(
        `Unknown MCP tool "${command}".`
      );
      expect(createProjectSession).not.toHaveBeenCalled();
      expect(executeOperation).not.toHaveBeenCalled();
    }
  );

  test("reads MCP resources from the long-lived project session", async () => {
    const session = createSession({
      initialize: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.status",
          result: { loaded: true },
        })
      ),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const status = await adapter.readResource({
      uri: "webstudio://project/status",
    });
    const toolsOverview = await adapter.readResource({
      uri: "webstudio://project/tools-overview",
    });
    const tools = await adapter.readResource({
      uri: "webstudio://project/tools",
    });
    const guide = await adapter.readResource({
      uri: "webstudio://project/guide",
    });
    const expressions = await adapter.readResource({
      uri: "webstudio://project/expressions",
    });
    const accessibilityReview = await adapter.readResource({
      uri: "webstudio://project/accessibility-review",
    });
    const componentsOverview = await adapter.readResource({
      uri: "webstudio://project/components-overview",
    });
    const components = await adapter.readResource({
      uri: "webstudio://project/components",
    });
    const componentsVerbose = await adapter.readResource({
      uri: "webstudio://project/components?verbose=true",
    });

    expect(JSON.parse(status.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        data: { loaded: true },
        meta: expect.objectContaining({
          session: expect.objectContaining({
            operationId: "project-session.status",
          }),
        }),
      })
    );
    expect(JSON.parse(tools.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        detail: "compact",
        returnedCount: 20,
        nextCursor: "20",
        tools: expect.any(Array),
      })
    );
    expect(tools.contents[0]?.text).not.toContain("inputSchema");
    expect((tools.contents[0]?.text ?? "").length).toBeLessThan(16_000);
    expect(JSON.parse(toolsOverview.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("Short tool overview"),
        count: expect.any(Number),
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            area: "content",
            count: expect.any(Number),
          }),
        ]),
      })
    );
    expect(toolsOverview.contents[0]?.text).not.toContain("inputSchema");
    expect(JSON.parse(guide.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        readThisFirst: expect.stringContaining(
          "do one small discovery step, then act"
        ),
        delegatedAgentRule: expect.stringContaining(
          "shortcut command such as webstudio meta.index"
        ),
        startHere: expect.arrayContaining(["meta.index"]),
        discovery: expect.objectContaining({
          overview: expect.stringContaining(
            "Do not call every discovery tool up front"
          ),
          components: expect.stringContaining("components.summary"),
        }),
        rules: expect.arrayContaining([
          expect.stringContaining(
            "Use direct value tools for fixed text/props"
          ),
        ]),
      })
    );
    expect(accessibilityReview.contents[0]).toEqual(
      expect.objectContaining({
        mimeType: "text/markdown",
        text: expect.stringContaining("# Webstudio Accessibility Review"),
      })
    );
    expect(accessibilityReview.contents[0]?.text).toContain(
      "Community-Access/accessibility-agents"
    );
    expect(expressions.contents[0]).toEqual(
      expect.objectContaining({
        mimeType: "text/markdown",
        text: expect.stringContaining("# Webstudio Expressions"),
      })
    );
    expect(expressions.contents[0]?.text).toContain("Supported string methods");
    expect(expressions.contents[0]?.text).toContain("- `toLowerCase`");
    expect(expressions.contents[0]?.text).toContain("- `join`");
    expect(expressions.contents[0]?.text).not.toContain(
      "{{allowedStringMethods}}"
    );
    expect(expressions.contents[0]?.text).toContain(
      "Collection creates internal `collectionItem` and `collectionItemKey`"
    );
    const componentOverviewData = JSON.parse(
      componentsOverview.contents[0]?.text ?? "{}"
    );
    expect(componentOverviewData).toEqual(
      expect.objectContaining({
        usage: expect.stringContaining("components.list"),
        count: expect.any(Number),
        namespaces: expect.objectContaining({
          "@webstudio-is/sdk-components-react-radix": expect.any(Number),
        }),
      })
    );
    expect(componentOverviewData).not.toHaveProperty("components");
    const compactComponents = JSON.parse(components.contents[0]?.text ?? "{}");
    expect(compactComponents).toEqual(
      expect.objectContaining({
        detail: "compact",
        returnedCount: 20,
        nextCursor: "20",
        components: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Accordion",
            namespace: "@webstudio-is/sdk-components-react-radix",
            exportName: "Accordion",
            category: expect.any(String),
          }),
        ]),
      })
    );
    for (const component of compactComponents.components) {
      expect(component).not.toHaveProperty("contentModel");
      expect(component).not.toHaveProperty("props");
      expect(component).not.toHaveProperty("states");
    }
    expect((components.contents[0]?.text ?? "").length).toBeLessThan(16_000);
    expect(JSON.parse(componentsVerbose.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        source: "@webstudio-is/sdk-components-registry/metas",
        detail: "verbose",
        returnedCount: 20,
        components: expect.arrayContaining([
          expect.objectContaining({
            component: "@webstudio-is/sdk-components-react-radix:Accordion",
            namespace: "@webstudio-is/sdk-components-react-radix",
            exportName: "Accordion",
            contentModel: expect.objectContaining({
              children: expect.arrayContaining(["instance"]),
              descendants: expect.arrayContaining([
                "@webstudio-is/sdk-components-react-radix:AccordionItem",
              ]),
            }),
            initialProps: expect.arrayContaining(["value", "collapsible"]),
            props: expect.objectContaining({
              value: expect.any(Object),
              collapsible: expect.any(Object),
            }),
          }),
        ]),
      })
    );
    await expect(
      adapter.readResource({ uri: "webstudio://project/unknown" })
    ).rejects.toThrow('Unknown MCP resource "webstudio://project/unknown".');
  });

  test("pages discovery resources without omissions or duplicate entries", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });
    const readCatalog = async (
      resource: "tools" | "components",
      verbose: boolean
    ) => {
      const ids: string[] = [];
      let cursor: string | undefined;
      let total = 0;
      do {
        const query = new URLSearchParams({
          limit: "13",
          verbose: String(verbose),
          ...(cursor === undefined ? {} : { cursor }),
        });
        const result = await adapter.readResource({
          uri: `webstudio://project/${resource}?${query}`,
        });
        const data = JSON.parse(result.contents[0]?.text ?? "{}");
        const entries = data[resource] as Array<{
          name?: string;
          component?: string;
        }>;
        expect(data.returnedCount).toBe(entries.length);
        expect(entries.length).toBeLessThanOrEqual(13);
        ids.push(
          ...entries.map(({ name, component }) => name ?? component ?? "")
        );
        total = data.total;
        cursor = data.nextCursor;
      } while (cursor !== undefined);
      expect(ids).toHaveLength(total);
      expect(new Set(ids).size).toBe(ids.length);
      return ids;
    };

    const compactTools = await readCatalog("tools", false);
    const verboseTools = await readCatalog("tools", true);
    const compactComponents = await readCatalog("components", false);
    const verboseComponents = await readCatalog("components", true);

    expect(compactTools).toEqual(verboseTools);
    expect(compactTools).toEqual(adapter.listTools().map(({ name }) => name));
    expect(compactComponents).toEqual(verboseComponents);
  });

  test("caps and validates discovery resource pagination", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });
    const capped = await adapter.readResource({
      uri: "webstudio://project/tools?limit=500",
    });
    const cappedData = JSON.parse(capped.contents[0]?.text ?? "{}");
    expect(cappedData.returnedCount).toBeLessThanOrEqual(50);

    await expect(
      adapter.readResource({
        uri: "webstudio://project/tools?cursor=invalid",
      })
    ).rejects.toThrow("Invalid webstudio://project/tools cursor");
    await expect(
      adapter.readResource({
        uri: "webstudio://project/components?limit=0",
      })
    ).rejects.toThrow("limit must be at least 1");
  });

  test("connects through the official MCP SDK and exposes discovery", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      expect(client.getServerCapabilities()).toEqual({
        tools: {},
        resources: {},
        logging: {},
      });
      expect(client.getServerVersion()).toEqual({
        name: "webstudio",
        version: "0.0.0",
      });
      await expect(client.listTools()).resolves.toEqual({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "list-pages",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
            }),
            _meta: {
              webstudio: expect.objectContaining({
                operationId: "pages.list",
              }),
            },
          }),
          expect.objectContaining({
            name: "publish",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "meta.index",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
            }),
          }),
          expect.objectContaining({
            name: "components.coverage-status",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
            }),
          }),
          expect.objectContaining({
            name: "refresh",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
            }),
          }),
          expect.objectContaining({
            name: "reset-session",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
            }),
          }),
          expect.objectContaining({
            name: "delete-instance",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: true,
            }),
          }),
        ]),
      });
      await expect(client.listResources()).resolves.toEqual({
        resources: expect.arrayContaining([
          expect.objectContaining({ uri: "webstudio://project/status" }),
          expect.objectContaining({
            uri: "webstudio://project/tools-overview",
          }),
          expect.objectContaining({ uri: "webstudio://project/tools" }),
          expect.objectContaining({
            uri: "webstudio://project/components-overview",
          }),
          expect.objectContaining({
            uri: "webstudio://project/components",
          }),
        ]),
      });
    } finally {
      await close();
    }
  });

  test("exposes dry-run and destructive confirmation through stdio MCP", async () => {
    const transaction = {
      id: "stdio-delete-plan",
      payload: [
        {
          namespace: "instances" as const,
          patches: [{ op: "remove" as const, path: ["target"] }],
        },
      ],
    };
    const executeOperation = createExecuteOperation(async ({ dryRun }) =>
      createEnvelope({
        operationId: "instances.delete",
        source: dryRun ? "dry-run" : "remote",
        result: { deletedInstanceIds: ["target"] },
        state: { committed: dryRun === false, freshness: {} },
        ...(dryRun ? { transaction } : {}),
      })
    );
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      const tools = await client.listTools();
      const deleteTool = tools.tools.find(
        ({ name }) => name === "delete-instance"
      );
      expect(deleteTool).toMatchObject({
        inputSchema: {
          properties: expect.objectContaining({
            dryRun: expect.objectContaining({ type: "boolean" }),
            confirmDestructive: expect.objectContaining({ type: "boolean" }),
            confirmationToken: expect.objectContaining({ type: "string" }),
          }),
        },
        annotations: expect.objectContaining({ destructiveHint: true }),
      });
      expect(
        tools.tools.find(({ name }) => name === "move-instance")
      ).toMatchObject({
        inputSchema: {
          properties: expect.objectContaining({
            dryRun: expect.objectContaining({ type: "boolean" }),
          }),
        },
        annotations: expect.objectContaining({ destructiveHint: false }),
      });
      expect(
        tools.tools.find(({ name }) => name === "publish")?.inputSchema
          .properties
      ).not.toHaveProperty("dryRun");

      const planned = await client.callTool({
        name: "delete-instance",
        arguments: { instanceIds: ["target"] },
      });
      const plannedContent = planned.structuredContent as
        | {
            ok: boolean;
            error?: { code: string };
            meta: { confirmation?: { token: string } };
          }
        | undefined;
      expect(plannedContent).toMatchObject({
        ok: false,
        error: { code: "DESTRUCTIVE_CONFIRMATION_REQUIRED" },
      });
      const confirmation = plannedContent?.meta.confirmation;
      if (confirmation === undefined) {
        throw new Error("Expected stdio destructive confirmation");
      }

      const committed = await client.callTool({
        name: "delete-instance",
        arguments: {
          instanceIds: ["target"],
          confirmDestructive: true,
          confirmationToken: confirmation.token,
        },
      });
      expect(committed.structuredContent).toMatchObject({
        ok: true,
        meta: { session: { committed: true } },
      });
    } finally {
      await close();
    }
  });

  test("keeps one MCP SDK connection healthy across repeated reads and mutations", async () => {
    const executeOperation = createExecuteOperation(async ({ command }) =>
      createEnvelope({
        operationId: command === "list-pages" ? "pages.list" : "pages.update",
        result: command === "list-pages" ? { pages: [] } : { pageId: "home" },
      })
    );
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      for (let index = 0; index < 50; index += 1) {
        const read = await client.callTool({
          name: "list-pages",
          arguments: {},
        });
        expect(read.isError).not.toBe(true);
        const mutation = await client.callTool({
          name: "update-page",
          arguments: {
            pageId: "home",
            values: { title: `Session title ${index}` },
          },
        });
        expect(mutation.isError).not.toBe(true);
      }
      expect(executeOperation).toHaveBeenCalledTimes(100);
    } finally {
      await close();
    }
  });

  test("sends sparse protocol-native startup logging after initialization", async () => {
    const onInitialized = vi.fn();
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      onInitialized,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const logs: unknown[] = [];
    client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        logs.push(notification.params);
      }
    );
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      expect(client.getServerCapabilities()).toEqual(
        expect.objectContaining({ logging: {} })
      );
      expect(logs).toEqual([
        {
          level: "info",
          logger: "webstudio",
          data: expect.stringContaining("ready with"),
        },
      ]);
      expect(onInitialized).toHaveBeenCalledOnce();
      expect(onInitialized).toHaveBeenCalledWith("test-client");
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("sends sparse protocol-native tool lifecycle logging", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () =>
        createEnvelope({
          operationId: "pages.list",
          result: [{ id: "home" }],
        })
      ),
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const logs: unknown[] = [];
    client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        logs.push(notification.params);
      }
    );
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      await client.callTool({
        name: "list-pages",
        arguments: { includeFolders: true },
      });

      expect(logs).toEqual(
        expect.arrayContaining([
          {
            level: "info",
            logger: "webstudio",
            data: "tool list-pages started",
          },
          {
            level: "info",
            logger: "webstudio",
            data: expect.stringMatching(/^tool list-pages succeeded in \d+ms$/),
          },
        ])
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("returns schema-valid rendered failures and stores their artifact manifest through the server", async () => {
    const storeRenderedAuditArtifacts = vi.fn(async () => "/manifest.json");
    const executeOperation = createExecuteOperation(async ({ command }) => {
      if (command === "list-pages") {
        return createEnvelope({
          operationId: "pages.list",
          result: { pages: [{ id: "home", path: "/" }] },
        });
      }
      if (command === "list-breakpoints") {
        return createEnvelope({
          operationId: "breakpoints.list",
          result: { breakpoints: [] },
        });
      }
      return createEnvelope({
        operationId: "project.audit",
        result: {
          contractVersion: 2,
          projectVersion: 7,
          scopes: ["accessibility"],
          pageFilter: null,
          summary: {
            total: 0,
            bySeverity: { error: 0, warning: 0, info: 0 },
            byScope: { accessibility: 0 },
          },
          verbose: true,
          findings: [],
          skippedCheckCount: 0,
          skippedChecks: [],
          manualCheckCount: 1,
          manualChecks: [{ checkId: "responsive-visual-review" }],
          renderedCheckCount: 0,
          renderedIssueCount: 0,
          renderedFailureCount: 0,
          renderedChecks: [],
          renderedFailures: [],
          nextCursor: null,
        },
      });
    });
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
      startPreview: vi.fn(async () => {
        throw new Error("preview build failed");
      }),
      getPreviewStatus: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(),
      storeRenderedAuditArtifacts,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      const result = await client.callTool({
        name: "audit",
        arguments: { rendered: true, verbose: true },
      });

      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          ok: false,
          error: { code: "RENDERED_AUDIT_FAILED" },
          data: { renderedFailureCount: 1 },
        },
      });
      expect(storeRenderedAuditArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-1",
          projectVersion: 1,
          failures: [
            expect.objectContaining({
              code: "RENDERED_AUDIT_PREVIEW_START_FAILED",
            }),
          ],
        })
      );
    } finally {
      await close();
    }
  });

  test("sends visible fallback and heartbeat logs for long-running tools", async () => {
    const reportLog = vi.fn();
    const executeOperation = createExecuteOperation(
      async () =>
        await new Promise<ProjectSessionEnvelope>((resolve) => {
          setTimeout(() => {
            resolve(
              createEnvelope({
                operationId: "pages.list",
                result: [{ id: "home" }],
              })
            );
          }, 25);
        })
    );
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
      reportLog,
      toolHeartbeatIntervalMs: 5,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const logs: unknown[] = [];
    client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        logs.push(notification.params);
      }
    );
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      await client.callTool({
        name: "list-pages",
        arguments: { includeFolders: true },
      });

      expect(logs).toEqual(
        expect.arrayContaining([
          {
            level: "info",
            logger: "webstudio",
            data: expect.stringMatching(
              /^tool list-pages still running after \d+ms$/
            ),
          },
        ])
      );
      expect(reportLog).toHaveBeenCalledWith(
        "info",
        expect.stringMatching(/^tool list-pages still running after \d+ms$/)
      );
      expect(reportLog).toHaveBeenCalledWith(
        "info",
        expect.stringMatching(/^tool list-pages succeeded in \d+ms$/)
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("marks visual verification tools with side-effect-aware SDK annotations", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      startPreview: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      getPreviewStatus: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      captureScreenshot: vi.fn(async () => ({
        output: "current.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: { width: 1440, height: 900 },
        fullPage: false,
        elapsedMs: 1,
        warnings: [],
      })),
      diffScreenshots: vi.fn(async () => ({
        totalPixels: 0,
        differentPixels: 0,
        mismatchPercentage: 0,
        summary: "Screenshot diff summary",
        regions: [],
        textAnalysis: {
          status: "skipped" as const,
          provider: "tesseract" as const,
          changes: [],
        },
        warnings: [],
      })),
      installOcr: vi.fn(async () => ({
        installed: false,
        alreadyAvailable: true,
        tesseractPath: "/usr/bin/tesseract",
        installUrl: tesseractInstallUrl,
        warnings: [],
      })),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(client.listTools()).resolves.toEqual({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "preview.start",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "preview.status",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "preview.stop",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "screenshot",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "screenshot.diff",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "vision.install-ocr",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
        ]),
      });
    } finally {
      await close();
    }
  });

  test("handles SDK tool calls and resource reads", async () => {
    const session = createSession({
      initialize: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.status",
          result: { loaded: true },
        })
      ),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "pages.list",
        result: [{ id: "home" }],
      })
    );
    const importProject = vi.fn(async () => ({ imported: true as const }));
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation,
      importProject,
    });
    const { client, close } = await createConnectedClient(server);
    try {
      await expect(
        client.callTool({
          name: "list-pages",
          arguments: { includeFolders: true, dryRun: true },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            ok: true,
            data: [{ id: "home" }],
          }),
        })
      );
      expect(executeOperation).toHaveBeenCalledWith({
        command: "list-pages",
        input: { includeFolders: true },
        dryRun: true,
      });
      await client.callTool({
        name: "list-pages",
        arguments: { includeFolders: true, dryRun: false },
      });
      expect(executeOperation).toHaveBeenLastCalledWith({
        command: "list-pages",
        input: { includeFolders: true },
        dryRun: false,
      });
      await expect(
        client.callTool({
          name: "import",
          arguments: {
            to: "https://p-destination.wstd.dev/?authToken=token",
          },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            data: { imported: true },
          }),
        })
      );
      expect(importProject).toHaveBeenCalledWith({
        to: "https://p-destination.wstd.dev/?authToken=token",
        assetsDir: undefined,
        ignoreVersionCheck: false,
        skipAssets: false,
      });

      await expect(
        client.readResource({ uri: "webstudio://project/status" })
      ).resolves.toEqual({
        contents: [
          expect.objectContaining({
            uri: "webstudio://project/status",
            mimeType: "application/json",
          }),
        ],
      });
    } finally {
      await close();
    }
  });

  test("returns stable SDK tool errors from resolver", async () => {
    const error = new Error(
      "Project session snapshot changed on disk."
    ) as Error & { code: string };
    error.code = "PROJECT_SESSION_BUSY";
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () => {
        throw error;
      }),
      getErrorCode: (error) =>
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(
        client.callTool({
          name: "list-pages",
          arguments: {},
        })
      ).resolves.toEqual(
        expect.objectContaining({
          isError: true,
          structuredContent: {
            ok: false,
            error: {
              message: projectSessionBusyMessage,
              code: "PROJECT_SESSION_BUSY",
            },
            meta: {},
          },
        })
      );
    } finally {
      await close();
    }
  });

  test("returns expected input examples for SDK zod tool errors", async () => {
    const inputSchema = z.object({
      email: z.email(),
      description: z.string().min(10),
    });
    const parseResult = inputSchema.safeParse({
      email: "invalid",
      description: "short",
    });
    if (parseResult.success) {
      throw new Error("Expected invalid test input");
    }
    const server = await createProjectSessionMcpServer({
      operations: [
        ...publicMcpOperations,
        {
          ...publicMcpOperations[0]!,
          command: "constrained-input",
          inputSchema: getTestInputSchema(inputSchema),
        },
      ],
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () => {
        throw parseResult.error;
      }),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      const result = await client.callTool({
        name: "constrained-input",
        arguments: { email: "invalid", description: "short" },
      });
      expect(result).toEqual(
        expect.objectContaining({
          isError: true,
          structuredContent: {
            ok: false,
            error: {
              message: "Tool input is invalid.",
              code: "INVALID_INPUT",
              issues: expect.arrayContaining([
                expect.objectContaining({
                  path: ["email"],
                  message: expect.any(String),
                  example: "user@example.com",
                }),
                expect.objectContaining({
                  path: ["description"],
                  message: expect.any(String),
                  example: "stringxxxx",
                }),
              ]),
            },
            meta: {},
          },
        })
      );
    } finally {
      await close();
    }
  });

  test("returns equivalent structured runtime validation issues", async () => {
    const issue = {
      code: "invalid_expression",
      path: ["values", "title"],
      message: "Invalid Webstudio expression",
      constraint: "valid_webstudio_expression",
      example: 'pageTitle ?? "Pricing"',
      detail: "Unexpected token at 1:4",
    };
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () => {
        throw new BuilderRuntimeError(
          "INVALID_INPUT",
          "Page input is invalid.",
          {
            issues: [issue],
          }
        );
      }),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      const result = await client.callTool({
        name: "list-pages",
        arguments: {},
      });
      expect(result.structuredContent).toEqual({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Page input is invalid.",
          issues: [issue],
        },
        meta: {},
      });
    } finally {
      await close();
    }
  });

  test("allows reads but blocks mutations until a required checkpoint is acknowledged", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      getErrorCode: (error) =>
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      const coveragePlan = await client.callTool({
        name: "components.coverage-plan",
        arguments: {},
      });
      expect(coveragePlan.structuredContent).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            checkpoint: expect.objectContaining({ required: true }),
          }),
        })
      );

      await expect(
        client.callTool({
          name: "components.find",
          arguments: { brief: "button" },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({ ok: true }),
        })
      );
      await expect(
        client.callTool({
          name: "create-page",
          arguments: { name: "Blocked", path: "/blocked" },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          isError: true,
          structuredContent: expect.objectContaining({
            ok: false,
            error: expect.objectContaining({
              message: expect.stringContaining("CHECKPOINT_REQUIRED"),
              code: "CHECKPOINT_REQUIRED",
            }),
          }),
        })
      );

      await expect(
        client.callTool({
          name: "checkpoint.ack",
          arguments: {
            reported: true,
            continueAfterReport: true,
            summary: "reported checkpoint",
          },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            data: {
              acknowledged: true,
              summary: "reported checkpoint",
              nextCommand:
                'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\'',
            },
          }),
        })
      );

      await expect(
        client.callTool({
          name: "components.find",
          arguments: { brief: "button" },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({ ok: true }),
        })
      );
    } finally {
      await close();
    }
  });

  test("creates a complete project session MCP server", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () =>
        createEnvelope({
          operationId: "pages.list",
          result: [{ id: "home" }],
        })
      ),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(
        client.callTool({
          name: "list-pages",
          arguments: {},
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            data: [{ id: "home" }],
          }),
        })
      );
    } finally {
      await close();
    }
  });
});
