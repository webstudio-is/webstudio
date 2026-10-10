import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect } from "@playwright/test";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import {
  migratePages,
  serializePages,
} from "@webstudio-is/project-migrations/pages";
import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts";
import {
  createProjectSessionMcpServer,
  type PublicMcpOperation,
} from "@webstudio-is/project-build/mcp";
import {
  createProjectSession,
  type ProjectSessionPersistedSnapshot,
  type ProjectSessionRemoteSnapshot,
} from "@webstudio-is/project-build/project-session";
import {
  applyBuilderPatchTransactions,
  createBuilderBuildDataSnapshotFromState,
  createBuilderStateFromBuildData,
} from "@webstudio-is/project-build/state";
import {
  executeBuilderRuntimeOperation,
  type BuilderRuntimeMutation,
} from "@webstudio-is/project-build/runtime";
import { loadDevBuild, updateBuild } from "../db";

const commands = new Set([
  "create-page",
  "insert-fragment",
  "insert-component",
  "list-instances",
  "list-variables",
  "create-resource",
  "update-resource",
  "update-props",
  "inspect-instance",
]);
const operations: PublicMcpOperation[] = runtimeOperationContracts
  .filter(({ command }) => commands.has(command))
  .map((contract) => ({
    command: contract.command,
    id: contract.id,
    method: contract.kind === "mutation" ? "mutation" : "query",
    permit: contract.permit ?? "view",
    description: contract.command,
    inputSchema: contract.inputSchema,
    outputSchema: contract.outputSchema,
    localCapable: true,
    serverOnly: false,
    readNamespaces: contract.readNamespaces,
    writeNamespaces: contract.writeNamespaces,
    invalidatesNamespaces: contract.invalidatesNamespaces,
    retryOnConflict: contract.retryOnConflict,
    requiresConfirm: contract.requiresConfirm,
  }));

const projectId = process.argv[2];
if (projectId === undefined) {
  throw new Error("Expected the disposable E2E project ID");
}

const author = async () => {
  let build = await loadDevBuild({ projectId: projectId });
  const parse = <Value>(field: keyof typeof build) =>
    JSON.parse(String(build[field])) as Value;
  const pages = migratePages(parse("pages"));
  const home = pages.pages.get(pages.homePageId);
  if (home === undefined) {
    throw new Error("Expected a home page in the E2E fixture");
  }
  const initialState = createBuilderStateFromBuildData({
    pages,
    instances: parse("instances"),
    props: parse("props"),
    styles: parse("styles"),
    styleSources: parse("styleSources"),
    styleSourceSelections: parse("styleSourceSelections"),
    dataSources: parse("dataSources"),
    resources: parse("resources"),
    breakpoints: parse("breakpoints"),
    assets: [],
    assetFolders: [],
  });
  let remote: ProjectSessionRemoteSnapshot = {
    projectId: projectId,
    buildId: build.id,
    version: build.version,
    state: initialState,
  };
  let stored: ProjectSessionPersistedSnapshot | undefined;
  let revision = 0;
  let nextId = 0;
  const persist = async () => {
    const snapshot = createBuilderBuildDataSnapshotFromState(remote.state);
    build = await updateBuild(build.id, {
      version: remote.version,
      pages: JSON.stringify(serializePages(snapshot.pages!)),
      instances: JSON.stringify(snapshot.instances),
      props: JSON.stringify(snapshot.props),
      styles: JSON.stringify(snapshot.styles),
      styleSources: JSON.stringify(snapshot.styleSources),
      styleSourceSelections: JSON.stringify(snapshot.styleSourceSelections),
      dataSources: JSON.stringify(snapshot.dataSources),
      resources: JSON.stringify(snapshot.resources),
      breakpoints: JSON.stringify(snapshot.breakpoints),
    });
  };
  const session = createProjectSession({
    projectId: projectId,
    compatibilityVersion: "mcp-form-context-e2e-v1",
    runtimeContext: { createId: () => `mcp-context-${nextId++}` },
    storage: {
      load: async () => stored,
      save: async (snapshot, options) => {
        expect(options.expectedRevision).toBe(stored?.revision);
        stored = { ...snapshot, revision: `revision-${++revision}` };
        return { revision: stored.revision };
      },
      clear: async () => {
        stored = undefined;
      },
    },
    transport: {
      fetchNamespaces: async () => remote,
      commitPatch: async ({ baseVersion, transactions }) => {
        expect(baseVersion).toBe(remote.version);
        remote = {
          ...remote,
          version: remote.version + 1,
          state: applyBuilderPatchTransactions(remote.state, transactions)
            .state,
        };
        await persist();
        return { version: remote.version };
      },
      commitRestorePoint: async () => {
        throw new Error("Restore points are outside this E2E fixture");
      },
      getPermissions: async () => ({
        canView: true,
        canEdit: true,
        canBuild: true,
        canAdmin: false,
        canUseApi: true,
      }),
      getCompatibility: async () => ({
        sessionVersion: "mcp-form-context-e2e-v1",
        runtimeContractVersion: "test-runtime-contracts",
        projectSchemaVersion: "test-project-schema",
        apiCompatibilityVersion: "test-api",
      }),
      executeServerOperation: async <Result>({
        operationId,
        input,
      }: {
        operationId: string;
        input: unknown;
      }): Promise<Result> => {
        const mutation =
          await executeBuilderRuntimeOperation<BuilderRuntimeMutation>({
            id: operationId,
            state: remote.state,
            input,
            context: {
              createId: () => `mcp-context-server-${nextId++}`,
              projectId: remote.projectId,
              projectVersion: remote.version,
            },
          });
        expect(mutation.kind).toBe("mutation");
        remote = {
          ...remote,
          version: remote.version + 1,
          state: applyBuilderPatchTransactions(remote.state, [
            {
              id: `mcp-context-transaction-${nextId++}`,
              payload: mutation.payload,
            },
          ]).state,
        };
        await persist();
        return mutation.result as Result;
      },
    },
  });
  const server = await createProjectSessionMcpServer({
    operations,
    createProjectSession: () => session,
    executeOperation: async ({ command, input, dryRun }) => {
      const operation = operations.find(
        (candidate) => candidate.command === command
      );
      const contract = runtimeOperationContracts.find(
        ({ id }) => id === operation?.id
      );
      if (operation === undefined || contract === undefined) {
        throw new Error(`Unexpected MCP operation: ${command}`);
      }
      const scopedInput = {
        ...(input as object),
        projectId: projectId,
      };
      const result =
        operation.method === "mutation"
          ? await session.mutate(contract.id, scopedInput, {
              permit: operation.permit,
              dryRun,
            })
          : await session.read(contract.id, scopedInput, {
              permit: operation.permit,
            });
      const failure = result.diagnostics.find(({ level }) => level === "error");
      if (failure) {
        throw new Error(failure.message);
      }
      return result;
    },
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "mcp-form-context-e2e",
    version: "1.0.0",
  });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const response = await client.callTool({ name, arguments: args });
    if (response.isError) {
      throw new Error(`${name}: ${JSON.stringify(response.structuredContent)}`);
    }
    const payload = response.structuredContent as {
      ok: boolean;
      data: Record<string, unknown>;
    };
    expect(payload.ok, name).toBe(true);
    return payload.data;
  };

  try {
    await call("insert-fragment", {
      parentInstanceId: home.rootInstanceId,
      fragment:
        '<Link href="/contact/autumn?private=omit">Open contact Form</Link>',
    });
    const page = await call("create-page", {
      name: "Form context",
      path: "/contact/:slug",
    });
    await call("insert-component", {
      parentInstanceId: page.rootInstanceId,
      component: "form",
    });
    await call("refresh");
    const instances = await call("list-instances", {
      pagePath: "/contact/:slug",
      component: "NativeForm",
    });
    const formId = (
      instances.instances as Array<{ id: string; component: string }>
    ).find(({ component }) => component === "NativeForm")?.id;
    if (formId === undefined) {
      throw new Error(`Expected inserted Form: ${JSON.stringify(instances)}`);
    }
    const formInspection = await call("inspect-instance", {
      instanceId: formId,
      include: ["props"],
    });
    const formProps = formInspection.props as Array<{
      name: string;
      value: unknown;
    }>;
    const variable = (name: string) => {
      const id = formProps.find((prop) => prop.name === name)?.value;
      if (typeof id !== "string") {
        throw new Error(`Expected the ${name} Form parameter`);
      }
      return encodeDataSourceVariable(id);
    };
    const formData = variable("formData");
    const browserInfo = variable("browserInfo");
    const resource = await call("create-resource", {
      resource: {
        name: "Context receiver",
        method: "post",
        url: "https://mcp-delivery.example/submit",
        headers: [],
      },
      scopeInstanceId: formId,
      dataSourceName: "Context receiver",
      exposeAsDataSource: true,
    });
    await call("update-resource", {
      resourceId: resource.resourceId,
      scopeInstanceId: formId,
      exposeAsDataSource: true,
      values: {
        bodyFormat: "json",
        body: `{ name: ${formData}.name, email: ${formData}.email, slug: system.params.slug, browser: { ip: ${browserInfo}.ip ?? null, userAgent: ${browserInfo}.userAgent ?? null, language: ${browserInfo}.language ?? null, referrer: ${browserInfo}.referrer ?? null } }`,
        headers: [
          { name: "X-Form-Language", value: `${browserInfo}.language ?? ""` },
        ],
      },
    });
    await call("update-props", {
      updates: [
        {
          instanceId: formId,
          name: "action",
          type: "json",
          value: [{ dataSourceId: resource.dataSourceId, enabled: true }],
        },
      ],
    });
    await call("refresh");
    const inspection = await call("inspect-instance", {
      instanceId: formId,
      include: ["props"],
    });
    expect(inspection.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "action",
          type: "json",
        }),
      ])
    );
    process.stdout.write(
      `${JSON.stringify({ formId, resourceId: resource.resourceId })}\n`
    );
  } finally {
    await client.close();
    await server.close();
  }
};

await author();
