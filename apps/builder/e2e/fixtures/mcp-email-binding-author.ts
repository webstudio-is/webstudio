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

const projectId = process.argv[2];
const mode = process.argv[3];
if (projectId === undefined || (mode !== "bind" && mode !== "reset")) {
  throw new Error("Expected a project ID and bind or reset mode");
}

const commands = new Set([
  "list-instances",
  "list-resources",
  "inspect-instance",
  "update-resource",
  "update-props",
  "update-project-settings",
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

let build = await loadDevBuild({ projectId });
const parse = <Value>(field: keyof typeof build) =>
  JSON.parse(String(build[field])) as Value;
let remote: ProjectSessionRemoteSnapshot = {
  projectId,
  buildId: build.id,
  version: build.version,
  state: createBuilderStateFromBuildData({
    pages: migratePages(parse("pages")),
    instances: parse("instances"),
    props: parse("props"),
    styles: parse("styles"),
    styleSources: parse("styleSources"),
    styleSourceSelections: parse("styleSourceSelections"),
    dataSources: parse("dataSources"),
    projectSettings: parse("projectSettings"),
    resources: parse("resources"),
    breakpoints: parse("breakpoints"),
    assets: [],
    assetFolders: [],
  }),
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
    projectSettings: JSON.stringify(snapshot.projectSettings),
    resources: JSON.stringify(snapshot.resources),
    breakpoints: JSON.stringify(snapshot.breakpoints),
  });
};
const session = createProjectSession({
  projectId,
  compatibilityVersion: "mcp-email-binding-e2e-v1",
  runtimeContext: { createId: () => `mcp-email-binding-${nextId++}` },
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
        state: applyBuilderPatchTransactions(remote.state, transactions).state,
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
      sessionVersion: "mcp-email-binding-e2e-v1",
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
            createId: () => `mcp-email-binding-server-${nextId++}`,
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
            id: `mcp-email-binding-transaction-${nextId++}`,
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
    const scopedInput = { ...(input as object), projectId };
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
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "mcp-email-binding-e2e", version: "1.0.0" });
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
  const instances = await call("list-instances", {
    pagePath: "/",
    component: "NativeForm",
  });
  const form = (
    instances.instances as Array<{ id: string; component: string }>
  ).find(({ component }) => component === "NativeForm");
  if (form === undefined) {
    throw new Error("Expected the contact Form");
  }
  const resources = await call("list-resources", {
    scopeInstanceId: form.id,
  });
  const projectEmail = (
    resources.resources as Array<{
      id: string;
      dataSourceId: string;
      name: string;
    }>
  ).find(({ name }) => name === "Project recipients");
  if (projectEmail === undefined) {
    throw new Error("Expected the contact Form Project Email Resource");
  }
  if (mode === "bind") {
    const inspection = await call("inspect-instance", {
      instanceId: form.id,
      include: ["props"],
    });
    const formDataId = (
      inspection.props as Array<{ name: string; value: unknown }>
    ).find(({ name }) => name === "formData")?.value;
    if (typeof formDataId !== "string") {
      throw new Error("Expected the Form data parameter");
    }
    const formData = encodeDataSourceVariable(formDataId);
    await call("update-resource", {
      resourceId: projectEmail.id,
      values: {
        email: {
          recipientMode: "custom",
          recipientsExpression: `${formData}.email`,
          senderExpression: `${formData}.email`,
          subject: `\`Bound: \${${formData}.subject}\``,
          body: `\`Message from \${${formData}.name}: \${${formData}.message}\``,
        },
      },
    });
    await call("update-props", {
      updates: [
        {
          instanceId: form.id,
          name: "action",
          type: "json",
          value: [{ dataSourceId: projectEmail.dataSourceId, enabled: true }],
        },
      ],
    });
  } else {
    await call("update-resource", {
      resourceId: projectEmail.id,
      values: { email: { recipientMode: "project" } },
    });
    await call("update-project-settings", {
      meta: {
        contactEmail: "owner@mcp.test",
        emailSender: "Contact Form <forms@mcp.test>",
        emailSubject: "Inherited project subject",
        emailBody: "Inherited project body.",
      },
    });
  }
  await call("refresh");
  const persistedResources = JSON.parse(
    (await loadDevBuild({ projectId })).resources
  ) as Array<{ id: string; email?: Record<string, unknown> }>;
  const persistedSettings = persistedResources.find(
    ({ id }) => id === projectEmail.id
  )?.email;
  if (mode === "reset") {
    expect(persistedSettings).toEqual({ recipientMode: "project" });
  } else {
    expect(persistedSettings).toMatchObject({
      recipientMode: "custom",
      recipientsExpression: expect.any(String),
      senderExpression: expect.any(String),
      subject: expect.any(String),
      body: expect.any(String),
    });
  }
  process.stdout.write(`${JSON.stringify({ formId: form.id })}\n`);
} finally {
  await client.close();
  await server.close();
}
