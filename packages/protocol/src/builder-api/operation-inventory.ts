import { publicApiOperations } from "./operations";

export type OperationFamilyInventory = {
  family: string;
  operationIds: readonly string[];
  currentEntryPoints: readonly string[];
  currentTests: readonly string[];
  expectedSharedOwner: string;
  exposedIn: {
    api: boolean;
    cli: boolean;
    mcp: boolean;
  };
  migrationStatus: "not-started" | "in-progress" | "migrated";
};

type OperationFamilyInventoryInput = Omit<
  OperationFamilyInventory,
  "currentTests"
> & {
  currentTests?: readonly string[];
};

const operationsByPrefix = (prefix: string) =>
  publicApiOperations
    .filter((operation) => operation.id.startsWith(`${prefix}.`))
    .map((operation) => operation.id);

const currentApiTests = [
  "apps/builder/app/services/api-router.server.test.ts",
  "packages/http-client/src/index.test.ts",
  "packages/cli/src/commands/api-command.test.ts",
  "packages/cli/src/commands/man.test.ts",
  "packages/cli/src/commands/schema.test.ts",
] as const;

const withDefaultCurrentTests = (
  family: OperationFamilyInventoryInput
): OperationFamilyInventory => ({
  currentTests: currentApiTests,
  ...family,
});

export const operationFamilyInventory = (
  [
    {
      family: "auth",
      operationIds: operationsByPrefix("auth"),
      currentEntryPoints: [
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/protocol/src/builder-api",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "projects",
      operationIds: operationsByPrefix("projects"),
      currentEntryPoints: [
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/protocol/src/builder-api",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "build",
      operationIds: operationsByPrefix("build"),
      currentEntryPoints: [
        "apps/builder/app/services/api-router.server.ts",
        "packages/project/src/db/build-patch-core.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner:
        "packages/project-build/contracts plus existing patch infrastructure",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "pages",
      operationIds: operationsByPrefix("pages"),
      currentEntryPoints: [
        "apps/builder/app/shared/page-utils",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/pages",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "folders",
      operationIds: operationsByPrefix("folders"),
      currentEntryPoints: [
        "apps/builder/app/shared/page-utils",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/pages",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "instances",
      operationIds: operationsByPrefix("instances"),
      currentEntryPoints: [
        "apps/builder/app/shared/instance-utils",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/instances",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "styles",
      operationIds: operationsByPrefix("styles"),
      currentEntryPoints: [
        "apps/builder/app/shared/style-source-utils.ts",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/styles",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "designTokens",
      operationIds: operationsByPrefix("designTokens"),
      currentEntryPoints: [
        "apps/builder/app/shared/style-source-utils.ts",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/styles",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "cssVariables",
      operationIds: operationsByPrefix("cssVariables"),
      currentEntryPoints: [
        "apps/builder/app/shared/css-variable-*",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/styles",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "variables",
      operationIds: operationsByPrefix("variables"),
      currentEntryPoints: [
        "apps/builder/app/shared/data-variables.ts",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/data",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "resources",
      operationIds: operationsByPrefix("resources"),
      currentEntryPoints: [
        "apps/builder/app/shared/resource-utils.ts",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/project-build/src/operations/data",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "assets",
      operationIds: operationsByPrefix("assets"),
      currentEntryPoints: [
        "Builder asset manager utilities",
        "packages/asset-uploader",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner:
        "packages/project-build/src/operations/assets plus packages/asset-uploader",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "publish",
      operationIds: operationsByPrefix("publish"),
      currentEntryPoints: [
        "packages/project-build/src/db/build.ts",
        "packages/domain",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/domain plus packages/project-build",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
    {
      family: "domains",
      operationIds: operationsByPrefix("domains"),
      currentEntryPoints: [
        "packages/domain",
        "apps/builder/app/services/api-router.server.ts",
        "packages/http-client/src/index.ts",
        "packages/cli/src/commands/api-command.ts",
      ],
      expectedSharedOwner: "packages/domain",
      exposedIn: { api: true, cli: true, mcp: false },
      migrationStatus: "not-started",
    },
  ] as const satisfies readonly OperationFamilyInventoryInput[]
).map(withDefaultCurrentTests);

export const inventoriedOperationIds = new Set(
  operationFamilyInventory.flatMap((family) => family.operationIds)
);
