import { transformSync } from "esbuild";
import { transpileExpression } from "@webstudio-is/expression";
import { expect, test } from "vitest";
import { createManagedFormDraftGraph } from "./managed-form-draft-graph";
import { generateManagedFormResources } from "./managed-form-resources-generator";
import { validateManagedFormRecipientLimit } from "./managed-form-submission";
import {
  emailSettingsInvalidMessage,
  resolveEmailRecipientsExpression,
  resolveEmailSenderSettingsExpression,
} from "./email-resource";
import { createScope } from "./scope";
import { encodeDataSourceVariable } from "./expression";
import { createJsonStringifyProxy } from "./to-string";
import type { ManagedFormResourceGraph } from "./managed-form-submission";
import type { DataSources } from "./schema/data-sources";
import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import type { Resources } from "./schema/resources";

// Static test fixtures also execute the generated published code below.
const evaluateFixtureExpression = (
  expression: string,
  values: ReadonlyMap<string, unknown>
) =>
  new Function(
    ...values.keys(),
    `return (${transpileExpression({ expression, executable: true })})`
  )(...values.values());

const withEmailResolverImports = (source: string) =>
  `import { resolveEmailRecipientsExpression, resolveEmailSenderSettingsExpression } from "@webstudio-is/sdk";\n${source}`;

test("draft Form graph resolves HTTP and Email bindings like the published generator", () => {
  const instances: Instances = new Map([
    [
      "form",
      {
        type: "instance",
        id: "form",
        component: "NativeForm",
        children: [
          { type: "id", value: "password" },
          { type: "id", value: "email-input" },
        ],
      },
    ],
    [
      "password",
      { type: "instance", id: "password", component: "Input", children: [] },
    ],
    [
      "email-input",
      { type: "instance", id: "email-input", component: "Input", children: [] },
    ],
  ]);
  const props: Props = new Map([
    [
      "password-name",
      {
        id: "password-name",
        instanceId: "password",
        name: "name",
        type: "string",
        value: "password",
      },
    ],
    [
      "password-type",
      {
        id: "password-type",
        instanceId: "password",
        name: "type",
        type: "string",
        value: "password",
      },
    ],
    [
      "email-name",
      {
        id: "email-name",
        instanceId: "email-input",
        name: "name",
        type: "string",
        value: "email",
      },
    ],
    [
      "email-type",
      {
        id: "email-type",
        instanceId: "email-input",
        name: "type",
        type: "string",
        value: "email",
      },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "http-source",
      {
        id: "http-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "webhook",
        resourceId: "http",
      },
    ],
    [
      "email-source",
      {
        id: "email-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "email",
        resourceId: "email",
      },
    ],
    [
      "form-data",
      {
        id: "form-data",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "browser-info",
      {
        id: "browser-info",
        type: "parameter",
        scopeInstanceId: "form",
        name: "browserInfo",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "http",
      {
        id: "http",
        name: "Webhook",
        method: "post",
        url: '"https://example.org/submit"',
        headers: [],
        body: "({ email: $ws$dataSource$form__DASH__data.email, tags: $ws$dataSource$form__DASH__data.tags })",
      },
    ],
    [
      "email",
      {
        id: "email",
        name: "Email",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
        email: { recipientMode: "visitor", visitorEmailField: "email" },
      },
    ],
  ]);
  const formData = {
    email: "ada@example.com",
    tags: ["a", "b"],
    password: "secret",
  };
  const browserInfo = { language: "en" };
  const system = {
    params: {},
    search: {},
    pathname: "/",
    origin: "https://site.example",
  };
  const projectMeta = { contactEmail: "team@example.com" };
  const input = {
    formId: "form",
    destinationDataSourceIds: ["email-source", "http-source"],
    instances,
    dataSources,
    resources,
    props,
    projectMeta,
    system,
    formData,
    browserInfo,
    evaluateExpression: evaluateFixtureExpression,
  };
  const draft = createManagedFormDraftGraph(input);
  const source = withEmailResolverImports(
    generateManagedFormResources({
      scope: createScope(),
      instances,
      dataSources,
      resources,
      props,
      projectMeta,
      forms: [
        {
          formId: "form",
          destinationDataSourceIds: input.destinationDataSourceIds,
        },
      ],
    })
  );
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", "require", code)(
    module,
    module.exports,
    (specifier: string) => {
      if (specifier === "@webstudio-is/sdk/to-string") {
        return { createJsonStringifyProxy };
      }
      if (specifier === "@webstudio-is/sdk") {
        return {
          resolveEmailRecipientsExpression,
          resolveEmailSenderSettingsExpression,
        };
      }
      throw new Error(`Unexpected import ${specifier}`);
    }
  );
  const generated = (
    module.exports.getManagedFormResourceGraph as (
      id: string,
      values: { system: unknown; formData: unknown; browserInfo: unknown }
    ) => ManagedFormResourceGraph | undefined
  )("form", { system, formData, browserInfo })!;
  expect(draft.rootIds).toEqual(["email", "http"]);
  expect(generated.rootIds).toEqual(["email", "http"]);
  for (const graph of [draft, generated]) {
    expect(
      graph.resources.find((resource) => resource.id === "email")?.name
    ).toBe("Email");
    expect(
      graph.resources.find((resource) => resource.id === "http")?.name
    ).toBe("Webhook");
  }
  for (const id of draft.rootIds) {
    const draftRequest = draft.resources
      .find((resource) => resource.id === id)!
      .createRequest(new Map());
    const generatedRequest = generated.resources
      .find((resource) => resource.id === id)!
      .createRequest(new Map());
    expect(draftRequest).toEqual(generatedRequest);
  }
  const email = draft.resources
    .find((resource) => resource.id === "email")!
    .createRequest(new Map());
  expect(email.email).toMatchObject({
    recipientMode: "visitor",
    visitorEmailField: "email",
    recipients: [],
    body: "",
    includeAttachments: true,
  });
  expect(
    draft.resources.find((resource) => resource.id === "email")?.nonfatal
  ).toBe(true);
  expect(
    generated.resources.find((resource) => resource.id === "email")?.nonfatal
  ).toBe(true);
  const invalidResources: Resources = new Map(resources);
  invalidResources.set("email", {
    ...resources.get("email")!,
    email: { recipientMode: "visitor", visitorEmailField: "unrelated" },
  });
  expect(() =>
    createManagedFormDraftGraph({ ...input, resources: invalidResources })
      .resources.find((resource) => resource.id === "email")!
      .createRequest(new Map())
  ).toThrow("invalid visitor email field");
  expect(
    generateManagedFormResources({
      scope: createScope(),
      instances,
      dataSources,
      resources: invalidResources,
      props,
      forms: [
        {
          formId: "form",
          destinationDataSourceIds: input.destinationDataSourceIds,
        },
      ],
    })
  ).toContain(
    'throw new Error("Managed Form Email Resource email has invalid visitor email field")'
  );
});

test("draft graph leaves Resource-output-bound recipient counts unknown for preflight", () => {
  const instances: Instances = new Map([
    [
      "form",
      {
        type: "instance",
        id: "form",
        component: "NativeForm",
        children: [],
      },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "email-source",
      {
        id: "email-source",
        type: "resource",
        name: "Notify",
        resourceId: "email",
        scopeInstanceId: "form",
      },
    ],
    [
      "lookup-source",
      {
        id: "lookup-source",
        type: "resource",
        name: "Lookup",
        resourceId: "lookup",
        scopeInstanceId: "form",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "email",
      {
        id: "email",
        name: "Notify",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
        email: {
          recipientMode: "custom",
          recipients: "fallback@example.com",
          recipientsExpression: encodeDataSourceVariable("lookup-source"),
        },
      },
    ],
    [
      "lookup",
      {
        id: "lookup",
        name: "Lookup",
        method: "get",
        url: '"https://example.com/lookup"',
        headers: [],
      },
    ],
  ]);
  const graph = createManagedFormDraftGraph({
    formId: "form",
    destinationDataSourceIds: ["email-source"],
    instances,
    dataSources,
    resources,
    props: new Map(),
    projectMeta: { contactEmail: "owner@example.com" },
    system: {
      params: {},
      search: {},
      pathname: "/",
      origin: "https://site.example",
    },
    formData: {},
    browserInfo: {},
    evaluateExpression: evaluateFixtureExpression,
  });
  const email = graph.resources.find(({ id }) => id === "email")!;
  expect(email.dependencies).toEqual(["lookup"]);
  expect(email.emailRecipientCount).toBeUndefined();
  expect(() => validateManagedFormRecipientLimit(graph)).toThrow(
    "Invalid Email Resource recipient count"
  );
});

test("draft graph counts resolved formData-bound recipients instead of stale text", () => {
  const instances: Instances = new Map([
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "email-source",
      {
        id: "email-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "Email",
        resourceId: "email",
      },
    ],
    [
      "form-data-source",
      {
        id: "form-data-source",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "email",
      {
        id: "email",
        name: "Email",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
        email: {
          recipientMode: "custom",
          recipients: "invalid stale value",
          recipientsExpression: `${encodeDataSourceVariable("form-data-source")}.recipients`,
        },
      },
    ],
  ]);
  const formData = {
    recipients: Array.from(
      { length: 6 },
      (_, index) => `person${index}@example.com`
    ).join(", "),
  };
  const graph = createManagedFormDraftGraph({
    formId: "form",
    destinationDataSourceIds: ["email-source"],
    instances,
    dataSources,
    resources,
    props: new Map(),
    system: {
      params: {},
      search: {},
      pathname: "/",
      origin: "https://site.example",
    },
    formData,
    browserInfo: {},
    evaluateExpression: evaluateFixtureExpression,
  });
  const email = graph.resources.find(({ id }) => id === "email")!;
  expect(email.emailRecipientCount).toBeUndefined();
  const request = email.createRequest(new Map());
  expect(request.email?.recipients).toHaveLength(6);
  expect(() =>
    validateManagedFormRecipientLimit(graph, new Map([["email", request]]))
  ).toThrow("Select no more than 5 team email recipients");
});

test("Email Sender and custom recipients bindings resolve and validate before dispatch", () => {
  const instances: Instances = new Map([
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "email-source",
      {
        id: "email-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "Notify",
        resourceId: "email",
      },
    ],
    [
      "sender-value",
      {
        id: "sender-value",
        type: "variable",
        scopeInstanceId: "form",
        name: "senderValue",
        value: { type: "string", value: "Acme <sender@example.com>" },
      },
    ],
    [
      "recipients-value",
      {
        id: "recipients-value",
        type: "variable",
        scopeInstanceId: "form",
        name: "recipientsValue",
        value: {
          type: "string",
          value: "one@example.com, Two <two@example.com>",
        },
      },
    ],
  ]);
  const resources = new Map([
    [
      "email",
      {
        id: "email",
        name: "Notify",
        control: "email" as const,
        method: "post" as const,
        url: '""',
        headers: [],
        email: {
          recipientMode: "custom" as const,
          senderExpression: encodeDataSourceVariable("sender-value"),
          recipientsExpression: encodeDataSourceVariable("recipients-value"),
          subject: '"Subject"',
          body: '"Body"',
        },
      },
    ],
  ]);
  const props: Props = new Map();
  const baseInput = {
    formId: "form",
    destinationDataSourceIds: ["email-source"],
    instances,
    dataSources,
    resources,
    props,
    projectMeta: { contactEmail: "team@example.com" },
    system: {
      params: {},
      search: {},
      pathname: "/",
      origin: "https://site.example",
    },
    formData: {},
    browserInfo: {},
    evaluateExpression: evaluateFixtureExpression,
  };
  const draft = createManagedFormDraftGraph(baseInput);
  const source = withEmailResolverImports(
    generateManagedFormResources({
      scope: createScope(),
      instances,
      dataSources,
      resources,
      props,
      projectMeta: baseInput.projectMeta,
      forms: [{ formId: "form", destinationDataSourceIds: ["email-source"] }],
    })
  );
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", "require", code)(
    module,
    module.exports,
    (specifier: string) => {
      if (specifier === "@webstudio-is/sdk/to-string") {
        return { createJsonStringifyProxy };
      }
      if (specifier === "@webstudio-is/sdk") {
        return {
          resolveEmailRecipientsExpression,
          resolveEmailSenderSettingsExpression,
        };
      }
      throw new Error(`Unexpected import ${specifier}`);
    }
  );
  const published = (
    module.exports.getManagedFormResourceGraph as (
      id: string,
      values: { system: unknown; formData: unknown; browserInfo: unknown }
    ) => ManagedFormResourceGraph | undefined
  )("form", { system: baseInput.system, formData: {}, browserInfo: {} })!;
  for (const graph of [draft, published]) {
    expect(graph.resources[0].createRequest(new Map()).email).toMatchObject({
      sender: { name: "Acme", address: "sender@example.com" },
      recipients: [
        { address: "one@example.com" },
        { name: "Two", address: "two@example.com" },
      ],
    });
  }

  for (const [sourceId, value] of [
    ["sender-value", { type: "string", value: "" }],
    ["sender-value", { type: "number", value: 42 }],
    ["sender-value", { type: "string", value: "not-an-email" }],
    [
      "sender-value",
      { type: "string", value: "one@example.com, two@example.com" },
    ],
    ["recipients-value", { type: "string", value: "" }],
    ["recipients-value", { type: "json", value: ["one@example.com"] }],
    ["recipients-value", { type: "string", value: "not-an-email" }],
  ] as const) {
    const invalidSources = new Map(dataSources);
    const original = dataSources.get(sourceId)!;
    invalidSources.set(sourceId, {
      ...original,
      type: "variable",
      value,
    });
    const invalidGraph = createManagedFormDraftGraph({
      ...baseInput,
      dataSources: invalidSources,
    });
    expect(() => invalidGraph.resources[0].createRequest(new Map())).toThrow(
      emailSettingsInvalidMessage
    );
  }
});

test("draft graph keeps scoped dependencies and external Resource roots in published order", () => {
  const instances: Instances = new Map([
    [
      "page",
      {
        type: "instance",
        id: "page",
        component: "Body",
        children: [{ type: "id", value: "form" }],
      },
    ],
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "outer-source",
      {
        id: "outer-source",
        type: "resource",
        scopeInstanceId: "page",
        name: "outer",
        resourceId: "outer",
      },
    ],
    [
      "inner-source",
      {
        id: "inner-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "inner",
        resourceId: "inner",
      },
    ],
    [
      "dependency-source",
      {
        id: "dependency-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "dependency",
        resourceId: "dependency",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "outer",
      {
        id: "outer",
        name: "Outer",
        method: "post",
        url: '"https://outer.example/submit"',
        headers: [],
        body: '({ source: "outside" })',
      },
    ],
    [
      "inner",
      {
        id: "inner",
        name: "Inner",
        method: "post",
        url: '"https://inner.example/submit"',
        headers: [],
        body: "({ token: $ws$dataSource$dependency__DASH__source.token })",
      },
    ],
    [
      "dependency",
      {
        id: "dependency",
        name: "Dependency",
        method: "get",
        url: '"https://dependency.example/token"',
        headers: [],
      },
    ],
  ]);
  const destinationDataSourceIds = ["outer-source", "inner-source"];
  const system = {
    params: {},
    search: {},
    pathname: "/",
    origin: "https://site.example",
  };
  const input = {
    formId: "form",
    destinationDataSourceIds,
    instances,
    dataSources,
    resources,
    props: new Map() as Props,
    system,
    formData: {},
    browserInfo: {},
    evaluateExpression: evaluateFixtureExpression,
  };
  const draft = createManagedFormDraftGraph(input);
  const source = withEmailResolverImports(
    generateManagedFormResources({
      scope: createScope(),
      instances,
      dataSources,
      resources,
      props: input.props,
      forms: [{ formId: "form", destinationDataSourceIds }],
    })
  );
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", "require", code)(
    module,
    module.exports,
    (specifier: string) => {
      if (specifier === "@webstudio-is/sdk/to-string") {
        return { createJsonStringifyProxy };
      }
      if (specifier === "@webstudio-is/sdk") {
        return {
          resolveEmailRecipientsExpression,
          resolveEmailSenderSettingsExpression,
        };
      }
      throw new Error(`Unexpected import ${specifier}`);
    }
  );
  const published = (
    module.exports.getManagedFormResourceGraph as (
      id: string,
      values: { system: unknown; formData: unknown; browserInfo: unknown }
    ) => ManagedFormResourceGraph | undefined
  )("form", { system, formData: {}, browserInfo: {} })!;
  expect(draft.rootIds).toEqual(["outer", "inner"]);
  expect(draft.rootIds).toEqual(published.rootIds);
  for (const id of ["outer", "inner", "dependency"]) {
    const draftResource = draft.resources.find(
      (resource) => resource.id === id
    )!;
    const publishedResource = published.resources.find(
      (resource) => resource.id === id
    )!;
    expect(draftResource.dependencies).toEqual(publishedResource.dependencies);
    const documents = new Map([["dependency", { token: "draft-token" }]]);
    expect(draftResource.createRequest(documents)).toEqual(
      publishedResource.createRequest(documents)
    );
  }
});

test("an external Resource cannot bind formData in Builder Preview", () => {
  const instances: Instances = new Map([
    [
      "page",
      {
        type: "instance",
        id: "page",
        component: "Body",
        children: [{ type: "id", value: "form" }],
      },
    ],
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "destination",
      {
        id: "destination",
        type: "resource",
        scopeInstanceId: "page",
        name: "external",
        resourceId: "external",
      },
    ],
    [
      "form-data",
      {
        id: "form-data",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "external",
      {
        id: "external",
        name: "External",
        method: "post",
        url: '"https://example.org"',
        headers: [],
        body: "$ws$dataSource$form__DASH__data.email",
      },
    ],
  ]);
  expect(() =>
    createManagedFormDraftGraph({
      formId: "form",
      destinationDataSourceIds: ["destination"],
      instances,
      dataSources,
      resources,
      props: new Map(),
      system: {
        params: {},
        search: {},
        pathname: "/",
        origin: "https://site.example",
      },
      formData: { email: "ada@example.com" },
      browserInfo: {},
      evaluateExpression: evaluateFixtureExpression,
    })
  ).toThrow(/cannot bind Form data/);
});
