import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect, test } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { runtimeOperationContracts } from "./contracts/builder-runtime";
import { createProjectSessionMcpServer, type PublicMcpOperation } from "./mcp";
import {
  createProjectSession,
  type ProjectSessionPersistedSnapshot,
  type ProjectSessionRemoteSnapshot,
} from "./project-session";
import {
  applyBuilderPatchTransactions,
  createBuilderStateFromSnapshot,
  type BuilderStateSnapshot,
} from "./state";
import {
  executeBuilderRuntimeOperation,
  type BuilderRuntimeMutation,
} from "./runtime";

const operationCommands = new Set([
  "insert-component",
  "list-instances",
  "inspect-instance",
  "list-resources",
  "list-variables",
  "create-resource",
  "update-resource",
  "update-props",
  "get-project-settings",
  "update-project-settings",
]);
const operations: PublicMcpOperation[] = runtimeOperationContracts
  .filter(({ command }) => operationCommands.has(command))
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

const fixtureBuild = {
  pages: {
    homePageId: "page-home",
    rootFolderId: "folder-root",
    meta: {},
    compiler: {},
    pages: new Map([
      [
        "page-home",
        {
          id: "page-home",
          name: "Home",
          title: "Home",
          path: "",
          rootInstanceId: "instance-root",
          meta: {},
        },
      ],
    ]),
    folders: new Map([
      [
        "folder-root",
        {
          id: "folder-root",
          name: "Root",
          slug: "",
          children: ["page-home"],
        },
      ],
    ]),
  },
  instances: [
    [
      "instance-root",
      {
        type: "instance" as const,
        id: "instance-root",
        component: "Body",
        children: [],
      },
    ],
  ],
  props: [],
  styles: [],
  styleSources: [],
  styleSourceSelections: [],
  dataSources: [],
  resources: [],
  assets: [],
  breakpoints: [],
  projectSettings: { meta: {}, compiler: {} },
} satisfies BuilderStateSnapshot;

test("discovers, commits, and reads back the new Form through MCP", async () => {
  let remote: ProjectSessionRemoteSnapshot = {
    projectId: "mcp-form-fixture",
    buildId: "fixture-build",
    version: 1,
    state: createBuilderStateFromSnapshot(fixtureBuild),
  };
  let stored: ProjectSessionPersistedSnapshot | undefined;
  let revision = 0;
  let commits = 0;
  let nextId = 0;
  const session = createProjectSession({
    projectId: remote.projectId,
    compatibilityVersion: "mcp-form-fixture-v1",
    runtimeContext: { createId: () => `form-fixture-${nextId++}` },
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
        commits++;
        return { version: remote.version };
      },
      commitRestorePoint: async () => {
        throw new Error("Restore point commits are not part of this fixture");
      },
      getPermissions: async () => ({
        canView: true,
        canEdit: true,
        canBuild: true,
        canAdmin: false,
        canUseApi: true,
      }),
      getCompatibility: async () => ({
        sessionVersion: "mcp-form-fixture-v1",
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
              createId: () => `server-form-fixture-${nextId++}`,
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
              id: `form-transaction-${nextId++}`,
              payload: mutation.payload,
            },
          ]).state,
        };
        commits++;
        return mutation.result as Result;
      },
    },
  });
  const server = await createProjectSessionMcpServer({
    operations,
    createProjectSession: () => session,
    executeOperation: async ({ command, input, dryRun }) => {
      const operation = operations.find(
        (operation) => operation.command === command
      );
      if (operation === undefined) {
        throw new Error(`Unexpected operation: ${command}`);
      }
      const runtimeOperation = runtimeOperationContracts.find(
        ({ id }) => id === operation.id
      );
      if (runtimeOperation === undefined) {
        throw new Error(`Unexpected runtime operation: ${command}`);
      }
      const scopedInput = { ...(input as object), projectId: remote.projectId };
      const result =
        operation.method === "mutation"
          ? await session.mutate(runtimeOperation.id, scopedInput, {
              permit: operation.permit,
              dryRun,
            })
          : await session.read(runtimeOperation.id, scopedInput, {
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
  const client = new Client({ name: "form-e2e-test", version: "1.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    expect(
      result.isError,
      `${name}: ${JSON.stringify(result.structuredContent)}`
    ).not.toBe(true);
    const payload = result.structuredContent as {
      ok: boolean;
      data: Record<string, unknown>;
      meta?: { session?: { committed?: boolean } };
    };
    expect(payload.ok, name).toBe(true);
    return payload;
  };

  try {
    const tools = await client.listTools();
    expect(tools.tools.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "components.search",
        "templates.get",
        "insert-component",
        "list-instances",
        "inspect-instance",
        "update-props",
        "list-resources",
        "list-variables",
        "create-resource",
        "update-resource",
        "get-project-settings",
        "update-project-settings",
      ])
    );
    const discovered = await call("components.search", { brief: "Form (new)" });
    const component = (
      discovered.data.components as Array<{
        component: string;
        template?: string;
      }>
    ).find(({ template }) => template === "template:form");
    expect(component?.component).toBe("form");
    const template = await call("templates.get", {
      template: component?.template,
    });
    expect(template.data).toMatchObject({
      found: true,
      name: "template:form",
      meta: { component: "form" },
    });

    const inserted = await call("insert-component", {
      parentInstanceId: "instance-root",
      component: "form",
    });
    expect(inserted.meta?.session?.committed).toBe(true);
    expect(commits).toBe(1);
    expect(remote.version).toBe(2);

    await call("refresh");
    const instances = await call("list-instances", { pagePath: "/" });
    const resources = await call("list-resources", { limit: 50 });
    const variables = await call("list-variables", { limit: 50 });
    const form = (
      instances.data.instances as Array<{ id: string; component: string }>
    ).find(({ component }) => component === "NativeForm");
    expect(form).toBeDefined();
    const formInspection = await call("inspect-instance", {
      instanceId: form?.id,
      include: ["props"],
    });
    const action = (
      formInspection.data.props as Array<{
        name: string;
        type: string;
        value: unknown;
      }>
    ).find(({ name }) => name === "action");
    expect(action).toMatchObject({ type: "json" });
    const resourceList = resources.data.resources as Array<{
      id: string;
      name: string;
      dataSourceId: string;
      scopeInstanceId: string;
    }>;
    const projectResource = resourceList.find(
      ({ name }) => name === "Project recipients"
    );
    const visitorResource = resourceList.find(
      ({ name }) => name === "Visitor email field"
    );
    expect(projectResource).toMatchObject({ scopeInstanceId: form?.id });
    expect(visitorResource).toMatchObject({ scopeInstanceId: form?.id });
    expect(action?.value).toEqual([
      { dataSourceId: projectResource?.dataSourceId, enabled: true },
      { dataSourceId: visitorResource?.dataSourceId, enabled: true },
    ]);
    const formVariables = variables.data.variables as Array<{
      id: string;
      name: string;
      scopeInstanceId: string;
    }>;
    const formState = formVariables.find(({ name }) => name === "formState");
    const results = formVariables.find(({ name }) => name === "results");
    const errors = formVariables.find(({ name }) => name === "errors");
    expect([formState, results, errors]).toEqual([
      expect.objectContaining({ scopeInstanceId: form?.id }),
      expect.objectContaining({ scopeInstanceId: form?.id }),
      expect.objectContaining({ scopeInstanceId: form?.id }),
    ]);
    expect(formInspection.data.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "onStateChange",
          type: "action",
          value: [
            expect.objectContaining({
              type: "execute",
              args: ["state"],
              code: `${encodeDataSourceVariable(formState?.id ?? "")} = state`,
            }),
          ],
        }),
        expect.objectContaining({
          name: "onResultChange",
          type: "action",
          value: [
            expect.objectContaining({
              type: "execute",
              args: ["result"],
              code: expect.stringContaining(
                `${encodeDataSourceVariable(results?.id ?? "")} = result?.results`
              ),
            }),
          ],
        }),
      ])
    );
    const resultCallback = (
      formInspection.data.props as Array<{
        name: string;
        value: Array<{ code?: string }>;
      }>
    ).find(({ name }) => name === "onResultChange");
    expect(resultCallback?.value[0]?.code).toContain(
      `${encodeDataSourceVariable(errors?.id ?? "")} = result?.errors`
    );
    expect(
      remote.state.resources?.get(projectResource?.id ?? "")
    ).toMatchObject({
      control: "email",
      method: "post",
      email: { recipientMode: "project" },
    });
    const visitorEmail = remote.state.resources?.get(
      visitorResource?.id ?? ""
    )?.email;
    expect(
      remote.state.resources?.get(visitorResource?.id ?? "")
    ).toMatchObject({
      control: "email",
      method: "post",
      email: {
        recipientMode: "visitor",
        visitorEmailField: "email",
        subject: expect.any(String),
        body: expect.any(String),
      },
    });

    const updated = await call("update-resource", {
      resourceId: visitorResource?.id,
      values: {
        name: "Visitor confirmation",
        email: {
          recipientMode: "visitor",
          visitorEmailField: "email",
          subject: JSON.stringify("Thanks for your message"),
          body: visitorEmail?.body,
          includeAttachments: false,
        },
      },
    });
    expect(updated.meta?.session?.committed).toBe(true);
    expect(commits).toBe(2);
    expect(remote.version).toBe(3);
    await call("refresh");
    const committedResources = await call("list-resources", { limit: 50 });
    expect(committedResources.data.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: visitorResource?.id,
          name: "Visitor confirmation",
          dataSourceId: visitorResource?.dataSourceId,
        }),
      ])
    );
    expect(
      remote.state.resources?.get(visitorResource?.id ?? "")
    ).toMatchObject({
      email: {
        recipientMode: "visitor",
        visitorEmailField: "email",
        subject: JSON.stringify("Thanks for your message"),
        body: visitorEmail?.body,
        includeAttachments: false,
      },
    });
    expect(
      remote.state.resources?.get(projectResource?.id ?? "")
    ).toMatchObject({
      email: { recipientMode: "project" },
    });

    const actionUpdate = await call("update-props", {
      updates: [
        {
          instanceId: form?.id,
          name: "action",
          type: "json",
          value: [
            { dataSourceId: visitorResource?.dataSourceId, enabled: false },
            { dataSourceId: projectResource?.dataSourceId, enabled: true },
          ],
        },
      ],
    });
    expect(actionUpdate.meta?.session?.committed).toBe(true);
    expect(commits).toBe(3);
    expect(remote.version).toBe(4);
    await call("refresh");
    const committedForm = await call("inspect-instance", {
      instanceId: form?.id,
      include: ["props"],
    });
    expect(committedForm.data.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "action",
          type: "json",
          value: [
            { dataSourceId: visitorResource?.dataSourceId, enabled: false },
            { dataSourceId: projectResource?.dataSourceId, enabled: true },
          ],
        }),
      ])
    );

    const formData = (
      formInspection.data.props as Array<{ name: string; value: unknown }>
    ).find(({ name }) => name === "formData");
    const formDataExpression = encodeDataSourceVariable(
      String(formData?.value)
    );
    const http = await call("create-resource", {
      resource: {
        name: "HTTP submission",
        method: "post",
        url: "https://example.com/submit",
        headers: [],
      },
      scopeInstanceId: form?.id,
      dataSourceName: "HTTP submission",
      exposeAsDataSource: true,
    });
    const httpResourceId = http.data.resourceId as string;
    const httpDataSourceId = http.data.dataSourceId as string;
    expect(http.meta?.session?.committed).toBe(true);
    await call("update-resource", {
      resourceId: httpResourceId,
      scopeInstanceId: form?.id,
      exposeAsDataSource: true,
      values: {
        method: "put",
        headers: [
          { name: "X-Form-Subject", value: `${formDataExpression}.subject` },
        ],
        searchParams: [
          { name: "source", value: { type: "literal", value: "contact" } },
        ],
        body: `{ subject: ${formDataExpression}.subject }`,
        bodyFormat: "json",
      },
    });
    await call("refresh");
    const scopedResources = await call("list-resources", {
      scopeInstanceId: form?.id,
      limit: 50,
    });
    expect(scopedResources.data.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: httpResourceId,
          dataSourceId: httpDataSourceId,
          name: "HTTP submission",
          method: "put",
          scopeInstanceId: form?.id,
        }),
      ])
    );
    expect(remote.state.resources?.get(httpResourceId)).toMatchObject({
      method: "put",
      headers: [
        { name: "X-Form-Subject", value: `${formDataExpression}.subject` },
      ],
      searchParams: [{ name: "source", value: JSON.stringify("contact") }],
      body: `{ subject: ${formDataExpression}.subject }`,
      bodyFormat: "json",
    });

    await call("update-project-settings", {
      meta: {
        contactEmail: "team@example.com",
        emailSender: "Site <sender@example.com>",
        emailSubject: "New contact request",
        emailBody: "A visitor submitted the contact form.",
      },
    });
    await call("refresh");
    const settings = await call("get-project-settings");
    expect(settings.data.meta).toMatchObject({
      contactEmail: "team@example.com",
      emailSender: "Site <sender@example.com>",
      emailSubject: "New contact request",
      emailBody: "A visitor submitted the contact form.",
    });
    await call("update-resource", {
      resourceId: projectResource?.id,
      values: {
        email: {
          recipientMode: "custom",
          recipients: "forms@example.com",
          subject: JSON.stringify("Custom notification"),
        },
      },
    });
    expect(
      remote.state.resources?.get(projectResource?.id ?? "")
    ).toMatchObject({
      email: { recipientMode: "custom", recipients: "forms@example.com" },
    });
    await call("update-resource", {
      resourceId: projectResource?.id,
      values: { email: { recipientMode: "project" } },
    });
    expect(
      remote.state.resources?.get(projectResource?.id ?? "")
    ).toMatchObject({
      email: { recipientMode: "project" },
    });

    const extraActions: Array<{ dataSourceId: string; enabled: boolean }> = [];
    for (let index = 0; index < 7; index++) {
      const created = await call("create-resource", {
        resource: {
          name: `Additional action ${index + 1}`,
          method: "post",
          url: "https://example.com/submit",
          headers: [],
        },
        scopeInstanceId: form?.id,
        exposeAsDataSource: true,
      });
      extraActions.push({
        dataSourceId: created.data.dataSourceId as string,
        enabled: true,
      });
    }
    const tenActions = [
      { dataSourceId: projectResource?.dataSourceId, enabled: true },
      { dataSourceId: visitorResource?.dataSourceId, enabled: false },
      { dataSourceId: httpDataSourceId, enabled: true },
      ...extraActions,
    ];
    expect(tenActions).toHaveLength(10);
    await call("update-props", {
      updates: [
        {
          instanceId: form?.id,
          name: "action",
          type: "json",
          value: tenActions,
        },
      ],
    });
    await call("refresh");
    const tenActionForm = await call("inspect-instance", {
      instanceId: form?.id,
    });
    expect(tenActionForm.data.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "action", value: tenActions }),
      ])
    );
    const commitsBeforeRejection = commits;
    const elevenActionUpdate = await client.callTool({
      name: "update-props",
      arguments: {
        updates: [
          {
            instanceId: form?.id,
            name: "action",
            type: "json",
            value: [
              ...tenActions,
              { dataSourceId: "one-too-many", enabled: true },
            ],
          },
        ],
      },
    });
    expect(elevenActionUpdate.isError).toBe(true);
    expect(JSON.stringify(elevenActionUpdate)).toContain(
      "Select no more than 10 Resource actions"
    );
    expect(commits).toBe(commitsBeforeRejection);
    const remainingActions = [
      { dataSourceId: httpDataSourceId, enabled: true },
      { dataSourceId: projectResource?.dataSourceId, enabled: true },
    ];
    await call("update-props", {
      updates: [
        {
          instanceId: form?.id,
          name: "action",
          type: "json",
          value: remainingActions,
        },
      ],
    });
    await call("refresh");
    const finalForm = await call("inspect-instance", { instanceId: form?.id });
    expect(finalForm.data.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "action", value: remainingActions }),
      ])
    );
  } finally {
    await client.close();
    await server.close();
  }
});
