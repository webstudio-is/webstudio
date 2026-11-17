import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect } from "@playwright/test";
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
import { createLocalBundleFromDevBuild } from "../flows/generated-app";
import { authorManagedForm } from "./mcp-managed-form-author";

const commands = new Set([
  "create-page",
  "set-text-content",
  "insert-fragment",
  "insert-component",
  "list-instances",
  "refresh",
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

const author = async (projectId: string, receiverUrl: string) => {
  let build = await loadDevBuild({ projectId: projectId });
  const parse = <Value>(field: keyof typeof build) =>
    JSON.parse(String(build[field])) as Value;
  const pages = migratePages(parse("pages"));
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
    compatibilityVersion: "mcp-navigation-form-e2e-v1",
    runtimeContext: { createId: () => `mcp-navigation-${nextId++}` },
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
        sessionVersion: "mcp-navigation-form-e2e-v1",
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
              createId: () => `mcp-navigation-server-${nextId++}`,
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
              id: `mcp-navigation-transaction-${nextId++}`,
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
        throw new Error(JSON.stringify(result.diagnostics));
      }
      return result;
    },
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "mcp-navigation-form-e2e",
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
    const navigationPage = await call("create-page", {
      name: "Form navigation",
      path: "/search",
    });
    // Inserting the public Form template creates connected Email Resources.
    // Removing every Action through MCP must switch that same Form to navigation.
    const inserted = await call("insert-component", {
      parentInstanceId: navigationPage.rootInstanceId,
      component: "form",
    });
    const formId = (inserted.rootInstanceIds as string[])[0];
    if (formId === undefined) {
      throw new Error("Expected the inserted Form ID");
    }
    await call("refresh");
    const initial = await call("inspect-instance", {
      instanceId: formId,
      include: ["props"],
    });
    expect(initial.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "action", value: expect.any(Array) }),
      ])
    );
    await call("update-props", {
      updates: [
        { instanceId: formId, name: "action", type: "json", value: [] },
      ],
    });
    await call("insert-fragment", {
      parentInstanceId: formId,
      fragment:
        '<ws.element ws:tag="select" name="tag" multiple>' +
        '<ws.element ws:tag="option" value="second">Second</ws.element>' +
        '<ws.element ws:tag="option" value="first">First</ws.element>' +
        "</ws.element>",
    });
    const resource = await call("create-resource", {
      resource: {
        name: "Search results",
        method: "get",
        url: receiverUrl,
        headers: [],
      },
      scopeInstanceId: navigationPage.rootInstanceId,
      dataSourceName: "searchResults",
      exposeAsDataSource: true,
    });
    await call("update-resource", {
      resourceId: resource.resourceId,
      scopeInstanceId: navigationPage.rootInstanceId,
      exposeAsDataSource: true,
      values: {
        searchParams: [
          {
            name: "tag",
            value:
              'typeof system.search.tag === "string" ? system.search.tag : (system.search.tag ?? []).join("|")',
          },
        ],
      },
    });
    const output = await call("insert-fragment", {
      parentInstanceId: navigationPage.rootInstanceId,
      fragment: '<Text id="navigation-search-results">Waiting</Text>',
    });
    const [outputInstanceId] = output.rootInstanceIds as string[];
    await call("set-text-content", {
      operation: "set",
      instanceId: outputInstanceId,
      mode: "expression",
      text: 'searchResults?.data?.query ?? "Waiting"',
    });
    await call("refresh");
    const inspection = await call("inspect-instance", {
      instanceId: formId,
      include: ["props"],
    });
    expect(inspection.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "action", type: "json", value: [] }),
      ])
    );
    return formId;
  } finally {
    await client.close();
    await server.close();
  }
};

export const preparePreviewBundle = async (
  projectId: string,
  receiverUrl: string,
  ...formatModes: string[]
) => {
  const formatForms = [];
  for (const mode of formatModes) {
    const { formId } = await authorManagedForm(projectId, { mode });
    formatForms.push({ mode, formId });
  }
  const navigationFormId = await author(projectId, receiverUrl);
  const build = await loadDevBuild({ projectId });
  await mkdir(".webstudio", { recursive: true });
  await writeFile(
    ".webstudio/data.json",
    `${JSON.stringify(createLocalBundleFromDevBuild(build))}\n`
  );
  return { formatForms, navigationFormId };
};
