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
  "insert-component",
  "insert-fragment",
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
const authorOptions = (() => {
  const argument = process.argv[3];
  if (argument === undefined || argument.startsWith("{") === false) {
    return { mode: argument ?? "default" };
  }
  return JSON.parse(argument) as {
    mode: string;
    successRedirect?: string;
    fail?: boolean;
    actionUrl?: string;
  };
})();
const deliveryMode = ["delivery", "multipart", "redirect"].includes(
  authorOptions.mode
);
const emailAttachmentsMode = authorOptions.mode === "email-attachments";
const emailMode = authorOptions.mode === "email" || emailAttachmentsMode;
const emailIsolationMode = authorOptions.mode === "email-isolation";
const redirectMode = authorOptions.mode === "redirect";
const emptyActionMode = authorOptions.mode === "empty-action";
const formatMode = ["format-json", "format-multipart", "format-text"].includes(
  authorOptions.mode
);
const httpFailureUrl = deliveryMode
  ? "https://mcp-delivery.example/reject"
  : "http://127.0.0.1/preview-e2e-must-not-run";

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
    projectSettings: parse("projectSettings"),
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
      projectSettings: JSON.stringify(snapshot.projectSettings),
      resources: JSON.stringify(snapshot.resources),
      breakpoints: JSON.stringify(snapshot.breakpoints),
    });
  };
  const session = createProjectSession({
    projectId: projectId,
    compatibilityVersion: "mcp-preview-form-e2e-v1",
    runtimeContext: { createId: () => `mcp-preview-${nextId++}` },
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
        sessionVersion: "mcp-preview-form-e2e-v1",
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
              createId: () => `mcp-preview-server-${nextId++}`,
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
              id: `mcp-preview-transaction-${nextId++}`,
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
  const client = new Client({ name: "mcp-preview-form-e2e", version: "1.0.0" });
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
    await call("insert-component", {
      parentInstanceId: home.rootInstanceId,
      component: "form",
    });
    if (emailIsolationMode) {
      await call("insert-component", {
        parentInstanceId: home.rootInstanceId,
        component: "form",
      });
    }
    await call("refresh");
    const instances = await call("list-instances", {
      pagePath: "/",
      component: "NativeForm",
    });
    const forms = (
      instances.instances as Array<{ id: string; component: string }>
    ).filter(({ component }) => component === "NativeForm");
    const form = forms[0];
    const secondForm = forms[1];
    if (
      form === undefined ||
      (emailIsolationMode && secondForm === undefined)
    ) {
      throw new Error(`Inserted Form is missing: ${JSON.stringify(instances)}`);
    }
    const formsToUpdate =
      emailIsolationMode && secondForm !== undefined
        ? [form, secondForm]
        : [form];
    for (const currentForm of formsToUpdate) {
      await call("insert-fragment", {
        parentInstanceId: currentForm.id,
        fragment: emailAttachmentsMode
          ? '<Input name="tag" /><Input name="tag" /><Input name="upload" type="file" multiple />'
          : '<Input name="tag" /><Input name="tag" /><Input name="upload" type="file" />',
      });
    }
    const resources = await call("list-resources", {
      scopeInstanceId: form.id,
    });
    const emails = resources.resources as Array<{
      id: string;
      dataSourceId: string;
      name: string;
    }>;
    const projectRecipientsResource = emails.find(
      ({ name }) => name === "Project recipients"
    );
    if (emailIsolationMode && projectRecipientsResource === undefined) {
      throw new Error("Expected the first Form Project Email Resource");
    }
    let emailResourceIdsByForm: [string, string] | undefined;
    expect(emails.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["Project recipients", "Visitor email field"])
    );
    const variables = await call("list-variables", {
      scopeInstanceId: form.id,
    });
    const formInspection = await call("inspect-instance", {
      instanceId: form.id,
      include: ["props"],
    });
    const formDataId = (
      formInspection.props as Array<{ name: string; value: string }>
    ).find(({ name }) => name === "formData")?.value;
    if (formDataId === undefined) {
      throw new Error("Expected Form data parameter");
    }
    const formVariables = variables.variables as Array<{
      id: string;
      name: string;
    }>;
    const variableId = (name: string) => {
      if (name === "formData") {
        return encodeDataSourceVariable(formDataId);
      }
      const id = formVariables.find((variable) => variable.name === name)?.id;
      if (id === undefined) {
        throw new Error(`Expected Form variable ${name}`);
      }
      return encodeDataSourceVariable(id);
    };
    const formattedBody =
      authorOptions.mode === "format-json"
        ? `({ sender: ${variableId("formData")}.email, message: ${variableId("formData")}.message })`
        : authorOptions.mode === "format-multipart"
          ? `({ sender: ${variableId("formData")}.email, message: ${variableId("formData")}.message })`
          : authorOptions.mode === "format-text"
            ? `${variableId("formData")}.message`
            : undefined;
    const http = await call("create-resource", {
      resource: {
        name: formatMode ? "Formatted HTTP action" : "Blocked HTTP action",
        method: "post",
        // Delivery and format tests use the intercepted local receiver; other
        // modes prove protected transport rejects loopback before a request.
        url: formatMode
          ? "https://mcp-delivery.example/submit"
          : httpFailureUrl,
        headers:
          authorOptions.mode === "format-json"
            ? [{ name: "Content-Type", value: '"text/plain"' }]
            : [],
        ...(formattedBody === undefined ? {} : { body: formattedBody }),
        ...(authorOptions.mode === "format-json"
          ? { bodyFormat: "json" }
          : authorOptions.mode === "format-multipart"
            ? { bodyFormat: "multipart" }
            : authorOptions.mode === "format-text"
              ? { bodyFormat: "auto" }
              : {}),
      },
      scopeInstanceId: form.id,
      dataSourceName: formatMode
        ? "Formatted HTTP action"
        : "Blocked HTTP action",
      exposeAsDataSource: true,
    });
    if (emailMode || emailIsolationMode) {
      await call("update-project-settings", {
        meta: {
          contactEmail: "owner@mcp.test",
          emailSender: "Contact Form <forms@mcp.test>",
          emailSubject: "MCP contact notification",
          emailBody: "A visitor sent a message through the contact form.",
        },
      });
      const projectSettings = await call("get-project-settings");
      expect(projectSettings.meta).toMatchObject({
        contactEmail: "owner@mcp.test",
        emailSender: "Contact Form <forms@mcp.test>",
        emailSubject: "MCP contact notification",
        emailBody: "A visitor sent a message through the contact form.",
      });
      if (emailMode) {
        const projectEmail = emails.find(
          ({ name }) => name === "Project recipients"
        );
        const visitorEmail = emails.find(
          ({ name }) => name === "Visitor email field"
        );
        if (projectEmail === undefined || visitorEmail === undefined) {
          throw new Error("Expected the default Email Resources");
        }
        if (emailAttachmentsMode) {
          await call("update-resource", {
            resourceId: projectEmail.id,
            values: { email: { includeAttachments: true } },
          });
        }
        await call("update-resource", {
          resourceId: visitorEmail.id,
          values: {
            email: {
              recipientMode: "visitor",
              visitorEmailField: "email",
              subject: JSON.stringify("We received your message"),
              body: JSON.stringify(
                "Thanks for contacting us. We will reply soon."
              ),
              includeAttachments: !emailAttachmentsMode,
            },
          },
        });
      } else {
        const projectEmail = emails.find(
          ({ name }) => name === "Project recipients"
        );
        if (projectEmail === undefined || secondForm === undefined) {
          throw new Error("Expected Project recipient Email Resources");
        }
        const secondResources = await call("list-resources", {
          scopeInstanceId: secondForm.id,
        });
        const secondProjectEmail = (
          secondResources.resources as Array<{
            id: string;
            dataSourceId: string;
            name: string;
          }>
        ).find(({ name }) => name === "Project recipients");
        if (secondProjectEmail === undefined) {
          throw new Error("Expected the second Form Project Email Resource");
        }
        emailResourceIdsByForm = [projectEmail.id, secondProjectEmail.id];
        await call("update-resource", {
          resourceId: projectEmail.id,
          values: {
            email: {
              recipientMode: "custom",
              recipients: "first-form@mcp.test",
              subject: JSON.stringify("First Form message"),
              body: JSON.stringify("Body override for the first Form."),
            },
          },
        });
        await call("update-resource", {
          resourceId: secondProjectEmail.id,
          values: {
            email: {
              recipientMode: "custom",
              recipients: "second-form@mcp.test",
              subject: JSON.stringify("Second Form message"),
              body: JSON.stringify("Body override for the second Form."),
            },
          },
        });
        await call("update-props", {
          updates: [
            {
              instanceId: secondForm.id,
              name: "action",
              type: "json",
              value: [
                {
                  dataSourceId: secondProjectEmail.dataSourceId,
                  enabled: true,
                },
              ],
            },
          ],
        });
      }
      await call("refresh");
      const persistedEmailResources = JSON.parse(
        (await loadDevBuild({ projectId })).resources
      ) as Array<{ id: string; email?: Record<string, unknown> }>;
      if (emailMode) {
        const visitorEmail = emails.find(
          ({ name }) => name === "Visitor email field"
        );
        expect(
          persistedEmailResources.find(({ id }) => id === visitorEmail?.id)
            ?.email
        ).toMatchObject({
          recipientMode: "visitor",
          visitorEmailField: "email",
          subject: JSON.stringify("We received your message"),
          body: JSON.stringify("Thanks for contacting us. We will reply soon."),
          includeAttachments: !emailAttachmentsMode,
        });
        if (emailAttachmentsMode) {
          const projectEmail = emails.find(
            ({ name }) => name === "Project recipients"
          );
          expect(
            persistedEmailResources.find(({ id }) => id === projectEmail?.id)
              ?.email
          ).toMatchObject({ includeAttachments: true });
        }
      } else if (secondForm !== undefined) {
        if (emailResourceIdsByForm === undefined) {
          throw new Error("Expected both Form Email Resource IDs");
        }
        const [firstProjectEmailId, secondProjectEmailId] =
          emailResourceIdsByForm;
        expect(
          persistedEmailResources.find(({ id }) => id === firstProjectEmailId)
            ?.email
        ).toMatchObject({
          recipientMode: "custom",
          recipients: "first-form@mcp.test",
          subject: JSON.stringify("First Form message"),
          body: JSON.stringify("Body override for the first Form."),
        });
        expect(
          persistedEmailResources.find(({ id }) => id === secondProjectEmailId)
            ?.email
        ).toMatchObject({
          recipientMode: "custom",
          recipients: "second-form@mcp.test",
          subject: JSON.stringify("Second Form message"),
          body: JSON.stringify("Body override for the second Form."),
        });
      }
    }
    await call("refresh");
    const configuredResources = await call("list-resources", {
      scopeInstanceId: form.id,
    });
    expect(configuredResources.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: http.resourceId,
          dataSourceId: http.dataSourceId,
          name: formatMode ? "Formatted HTTP action" : "Blocked HTTP action",
          method: "post",
          url: JSON.stringify(
            formatMode ? "https://mcp-delivery.example/submit" : httpFailureUrl
          ),
        }),
      ])
    );
    const successfulHttp =
      deliveryMode && authorOptions.fail !== true
        ? await call("create-resource", {
            resource: {
              name: redirectMode
                ? "Redirect success action"
                : "Received HTTP action",
              method: "post",
              url:
                authorOptions.actionUrl ??
                "https://mcp-delivery.example/submit",
              headers: [],
            },
            scopeInstanceId: form.id,
            dataSourceName: redirectMode
              ? "Redirect success action"
              : "Received HTTP action",
            exposeAsDataSource: true,
          })
        : undefined;
    const actions = emptyActionMode
      ? []
      : formatMode
        ? [{ dataSourceId: http.dataSourceId, enabled: true }]
        : [
            ...(emailMode
              ? emails
                  .filter(({ name }) =>
                    ["Project recipients", "Visitor email field"].includes(name)
                  )
                  .map(({ dataSourceId }) => ({ dataSourceId, enabled: true }))
              : emailIsolationMode
                ? projectRecipientsResource === undefined
                  ? []
                  : [
                      {
                        dataSourceId: projectRecipientsResource.dataSourceId,
                        enabled: true,
                      },
                    ]
                : redirectMode
                  ? authorOptions.fail === true
                    ? [{ dataSourceId: http.dataSourceId, enabled: true }]
                    : successfulHttp === undefined
                      ? []
                      : [
                          {
                            dataSourceId: successfulHttp.dataSourceId,
                            enabled: true,
                          },
                        ]
                  : [
                      ...(successfulHttp === undefined
                        ? []
                        : [
                            {
                              dataSourceId: successfulHttp.dataSourceId,
                              enabled: true,
                            },
                          ]),
                      { dataSourceId: http.dataSourceId, enabled: true },
                    ]),
          ];
    const updates = [
      {
        instanceId: form.id,
        name: "action",
        type: "json",
        value: actions,
      },
      ...(redirectMode && authorOptions.successRedirect !== undefined
        ? [
            {
              instanceId: form.id,
              name: "successRedirect",
              type: "string",
              value: authorOptions.successRedirect,
            },
          ]
        : []),
    ];
    await call("update-props", {
      updates,
    });
    await call("refresh");
    const inspection = await call("inspect-instance", {
      instanceId: form!.id,
      include: ["props"],
    });
    expect(inspection.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "action",
          value: actions,
        }),
        ...(redirectMode && authorOptions.successRedirect !== undefined
          ? [
              expect.objectContaining({
                name: "successRedirect",
                value: authorOptions.successRedirect,
              }),
            ]
          : []),
        expect.objectContaining({
          name: "onStateChange",
          type: "action",
          value: [
            expect.objectContaining({
              code: `${variableId("formState")} = state`,
            }),
          ],
        }),
        expect.objectContaining({
          name: "onResultChange",
          type: "action",
          value: [
            expect.objectContaining({
              code: expect.stringContaining(
                `${variableId("results")} = result?.results`
              ),
            }),
          ],
        }),
      ])
    );
    const resultCallback = (
      inspection.props as Array<{
        name: string;
        value: Array<{ code?: string }>;
      }>
    ).find(({ name }) => name === "onResultChange");
    expect(resultCallback?.value[0]?.code).toContain(
      `${variableId("errors")} = result?.errors`
    );
    process.stdout.write(
      `${JSON.stringify({
        formId: form.id,
        secondFormId: secondForm?.id,
        resourceId: http.resourceId,
        successfulResourceId: successfulHttp?.resourceId,
        emailResourceIds: emailMode
          ? emails
              .filter(({ name }) =>
                ["Project recipients", "Visitor email field"].includes(name)
              )
              .map(({ id }) => id)
          : undefined,
        emailResourceIdsByForm,
      })}\n`
    );
  } finally {
    await client.close();
    await server.close();
  }
};

await author();
