import { transformSync } from "esbuild";
import { transpileExpression } from "@webstudio-is/expression";
import { expect, test, vi } from "vitest";
import { createScope } from "./scope";
import { encodeDataSourceVariable, SYSTEM_VARIABLE_ID } from "./expression";
import {
  getDefaultFormEmailBodyExpression,
  resolveEmailRecipientsExpression,
  resolveEmailSenderSettingsExpression,
} from "./email-resource";
import { generateManagedFormResources } from "./managed-form-resources-generator";
import {
  loadManagedFormResources,
  validateManagedFormRecipientLimit,
} from "./managed-form-submission";
import type { DataSources } from "./schema/data-sources";
import type { Instance, Instances } from "./schema/instances";
import type { Resources } from "./schema/resources";
import type { Props } from "./schema/props";
import type { ProjectMeta } from "./schema/pages";
import type { ManagedFormResourceGraph } from "./managed-form-submission";
import { createJsonStringifyProxy } from "./to-string";

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

const getGeneratedGraph = (input: {
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
  props?: Props;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
  ownerName?: string;
  systemDataSourceId?: string;
  forms: readonly {
    formId: string;
    destinationDataSourceIds: readonly string[];
  }[];
}) => {
  const source = withEmailResolverImports(
    generateManagedFormResources({
      scope: createScope(),
      ...input,
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
  return module.exports.getManagedFormResourceGraph as (
    formId: string,
    props: { system: unknown; formData: unknown; browserInfo: unknown }
  ) => ManagedFormResourceGraph | undefined;
};

test.each([
  { name: "formData", scopeInstanceId: "other-form" },
  { name: "browserInfo", scopeInstanceId: "other-form" },
  { name: "state", scopeInstanceId: "form" },
  { name: "system", scopeInstanceId: "page" },
])(
  "Preview and published graphs reject unavailable parameter $name in $scopeInstanceId",
  async (parameter) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
    const instances: Instances = new Map([
      [
        "form",
        { id: "form", type: "instance", component: "NativeForm", children: [] },
      ],
    ]);
    const dataSources: DataSources = new Map([
      [
        "destination",
        {
          id: "destination",
          type: "resource",
          name: "Action",
          scopeInstanceId: "form",
          resourceId: "action",
        },
      ],
      ["unavailable", { id: "unavailable", type: "parameter", ...parameter }],
    ]);
    const resources: Resources = new Map([
      [
        "action",
        {
          id: "action",
          name: "Action",
          method: "post",
          url: '"https://example.com"',
          headers: [],
          body: encodeDataSourceVariable("unavailable"),
        },
      ],
    ]);
    const input = {
      formId: "form",
      systemDataSourceId: "page-system",
      destinationDataSourceIds: ["destination"],
      instances,
      dataSources,
      resources,
      props: new Map(),
      system: {
        params: {},
        search: {},
        origin: "https://site.example",
        pathname: "/",
      },
      formData: {},
      browserInfo: {},
      evaluateExpression: () => undefined,
    };
    expect(
      getGeneratedGraph({ ...input, forms: [input] })("form", input)
    ).toBeUndefined();
    const draft = createManagedFormDraftGraph(input);
    expect(() => draft.resources[0].createRequest(new Map())).toThrow(
      "Managed Form form cannot resolve parameter unavailable"
    );
  }
);

test.each([SYSTEM_VARIABLE_ID, "page-system"])(
  "Preview and published graphs resolve System parameter %s",
  async (systemId) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
    const instances: Instances = new Map([
      [
        "page",
        {
          id: "page",
          type: "instance",
          component: "Body",
          children: [{ type: "id", value: "form" }],
        },
      ],
      [
        "form",
        { id: "form", type: "instance", component: "NativeForm", children: [] },
      ],
    ]);
    const dataSources: DataSources = new Map([
      [
        "destination",
        {
          id: "destination",
          type: "resource",
          name: "Action",
          scopeInstanceId: "form",
          resourceId: "action",
        },
      ],
      [
        systemId,
        {
          id: systemId,
          type: "parameter",
          name: "system",
          scopeInstanceId: "page",
        },
      ],
    ]);
    const systemVariable = encodeDataSourceVariable(systemId);
    const resources: Resources = new Map([
      [
        "action",
        {
          id: "action",
          name: "Action",
          method: "post",
          url: `${systemVariable}.origin + "/submit"`,
          headers: [{ name: "x-page", value: `${systemVariable}.pathname` }],
          body: systemVariable,
        },
      ],
    ]);
    const input = {
      formId: "form",
      destinationDataSourceIds: ["destination"],
      systemDataSourceId: "page-system",
      instances,
      dataSources,
      resources,
      props: new Map(),
      system: {
        params: { slug: "contact" },
        search: { locale: "en" },
        origin: "https://site.example",
        pathname: "/contact",
      },
      formData: {},
      browserInfo: {},
      evaluateExpression: evaluateFixtureExpression,
    };
    const draft = createManagedFormDraftGraph(input);
    const published = getGeneratedGraph({ ...input, forms: [input] })(
      "form",
      input
    )!;
    for (const graph of [draft, published]) {
      expect(graph.resources[0].createRequest(new Map())).toEqual({
        name: "Action",
        control: undefined,
        url: "https://site.example/submit",
        searchParams: [],
        method: "post",
        headers: [{ name: "x-page", value: "/contact" }],
        body: input.system,
      });
    }
  }
);

test("a Form-scoped Email Resource gets the automatic form text and a typed email request", () => {
  const dataSources: DataSources = new Map([
    [
      "formData",
      {
        id: "formData",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "browserInfo",
      {
        id: "browserInfo",
        type: "parameter",
        scopeInstanceId: "form",
        name: "browserInfo",
      },
    ],
    [
      "emailDataSource",
      {
        id: "emailDataSource",
        type: "resource",
        scopeInstanceId: "form",
        name: "email",
        resourceId: "email",
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
        email: { subject: '"Custom subject"' },
      },
    ],
  ]);
  const getGraph = getGeneratedGraph({
    instances: new Map([
      [
        "form",
        {
          type: "instance",
          id: "form",
          component: "NativeForm",
          children: [{ type: "id", value: "password-input" }],
        },
      ],
      [
        "password-input",
        {
          type: "instance",
          id: "password-input",
          component: "Input",
          children: [],
        },
      ],
    ]),
    dataSources,
    resources,
    props: new Map([
      [
        "password-name",
        {
          id: "password-name",
          instanceId: "password-input",
          name: "name",
          type: "string",
          value: "password",
        },
      ],
      [
        "password-type",
        {
          id: "password-type",
          instanceId: "password-input",
          name: "type",
          type: "string",
          value: "password",
        },
      ],
    ]),
    forms: [{ formId: "form", destinationDataSourceIds: ["emailDataSource"] }],
    projectMeta: {
      contactEmail: '"Team, West" <team@example.com>',
      emailSender: "owner@example.com",
    },
    ownerName: "Ada Owner",
  });
  const graph = getGraph("form", {
    system: {},
    formData: {
      hidden: "yes",
      name: "Ada",
      password: "secret",
      "ws--form-bot": "internal",
      upload: new File(["abc"], "notes.txt", { type: "text/plain" }),
    },
    browserInfo: { language: "en" },
  });
  expect(graph?.resources[0].control).toBe("email");
  expect(graph?.resources[0].emailRecipientCount).toBe(1);
  expect(graph?.resources[0].createRequest(new Map()).email).toMatchObject({
    subject: "Custom subject",
    body: expect.stringContaining('"hidden": "yes"'),
    recipients: [{ name: "Team, West", address: "team@example.com" }],
    sender: { address: "owner@example.com" },
    fromName: "Ada Owner",
  });
  expect(graph?.resources[0].createRequest(new Map()).email?.body).toContain(
    '"language": "en"'
  );
  expect(
    graph?.resources[0].createRequest(new Map()).email?.body
  ).not.toContain("secret");
  expect(
    graph?.resources[0].createRequest(new Map()).email?.body
  ).not.toContain("ws--form-bot");
  expect(graph?.resources[0].createRequest(new Map()).email?.body).toContain(
    '"name": "notes.txt"'
  );
});

test.each([
  { binding: "formData", lineBreak: "\r" },
  { binding: "formData", lineBreak: "\n" },
  { binding: "formData", lineBreak: "\r\n" },
  { binding: "browserInfo", lineBreak: "\n" },
] as const)(
  "rejects a resolved $binding Email subject containing $lineBreak before destinations dispatch",
  async ({ binding, lineBreak }) => {
    const getGraph = getGeneratedGraph({
      instances: new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      dataSources: new Map([
        [
          "formData",
          {
            id: "formData",
            type: "parameter",
            scopeInstanceId: "form",
            name: "formData",
          },
        ],
        [
          "browserInfo",
          {
            id: "browserInfo",
            type: "parameter",
            scopeInstanceId: "form",
            name: "browserInfo",
          },
        ],
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
          "http-source",
          {
            id: "http-source",
            type: "resource",
            scopeInstanceId: "form",
            name: "HTTP",
            resourceId: "http",
          },
        ],
      ]),
      resources: new Map([
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
              subject: `${encodeDataSourceVariable(binding)}.subject`,
            },
          },
        ],
        [
          "http",
          {
            id: "http",
            name: "HTTP",
            method: "post",
            url: '"https://example.com/destination"',
            headers: [],
          },
        ],
      ]),
      forms: [
        {
          formId: "form",
          destinationDataSourceIds: ["http-source", "email-source"],
        },
      ],
      ownerEmail: "owner@example.com",
    });
    const graph = getGraph("form", {
      system: {},
      formData: { subject: `Hello${lineBreak}Bcc: intruder@example.com` },
      browserInfo: { subject: `Hello${lineBreak}Bcc: intruder@example.com` },
    });
    expect(graph).toBeDefined();
    const fetch = vi.fn<typeof globalThis.fetch>();
    await expect(loadManagedFormResources(fetch, graph!)).rejects.toThrow(
      "Email subject must be text without line breaks"
    );
    expect(fetch).not.toHaveBeenCalled();
  }
);

test("a translated project body is inherited unless the Email Resource overrides it", () => {
  const getBody = (resourceBody?: string) => {
    const getGraph = getGeneratedGraph({
      instances: new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      dataSources: new Map([
        [
          "formData",
          {
            id: "formData",
            type: "parameter",
            scopeInstanceId: "form",
            name: "formData",
          },
        ],
        [
          "emailDataSource",
          {
            id: "emailDataSource",
            type: "resource",
            scopeInstanceId: "form",
            name: "email",
            resourceId: "email",
          },
        ],
      ]),
      resources: new Map([
        [
          "email",
          {
            id: "email",
            name: "Email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email:
              resourceBody === undefined ? undefined : { body: resourceBody },
          },
        ],
      ]),
      forms: [
        { formId: "form", destinationDataSourceIds: ["emailDataSource"] },
      ],
      projectMeta: {
        contactEmail: "team@example.com",
        emailBody: "Solicitud recibida. Incluiremos los detalles por separado.",
      },
    });
    const graph = getGraph("form", {
      system: {},
      formData: { nombre: "Ana" },
      browserInfo: { language: "es" },
    });
    return graph?.resources[0].createRequest(new Map()).email?.body;
  };
  const projectBody =
    "Solicitud recibida. Incluiremos los detalles por separado.";
  const inherited = getBody();
  expect(inherited).toBe(projectBody);
  expect(inherited).not.toContain("Form data:");
  expect(inherited).not.toContain("Browser info:");
  const override = { body: '"Mensaje del recurso"' };
  expect(getBody(override.body)).toBe("Mensaje del recurso");
});

test("counts project and custom Email recipients across a Form, including duplicate addresses", () => {
  const makeGraph = (projectRecipients: string) => {
    const getGraph = getGeneratedGraph({
      instances: new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      dataSources: new Map([
        [
          "project-source",
          {
            id: "project-source",
            type: "resource",
            name: "Project email",
            resourceId: "project-email",
            scopeInstanceId: "form",
          },
        ],
        [
          "custom-source",
          {
            id: "custom-source",
            type: "resource",
            name: "Custom email",
            resourceId: "custom-email",
            scopeInstanceId: "form",
          },
        ],
      ]),
      resources: new Map([
        [
          "project-email",
          {
            id: "project-email",
            name: "Project email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
          },
        ],
        [
          "custom-email",
          {
            id: "custom-email",
            name: "Custom email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email: {
              recipientMode: "custom",
              recipients:
                "team@example.com, other@example.com, third@example.com",
            },
          },
        ],
      ]),
      forms: [
        {
          formId: "form",
          destinationDataSourceIds: ["project-source", "custom-source"],
        },
      ],
      projectMeta: { contactEmail: projectRecipients },
      ownerEmail: "owner@example.com",
    });
    return getGraph("form", {
      system: {},
      formData: {},
      browserInfo: {},
    });
  };

  const atLimit = makeGraph("team@example.com, team@example.com");
  expect(
    atLimit?.resources.map((resource) => resource.emailRecipientCount)
  ).toEqual([2, 3]);
  expect(() => validateManagedFormRecipientLimit(atLimit!)).not.toThrow();

  const overLimit = makeGraph(
    "team@example.com, team@example.com, fourth@example.com"
  );
  expect(() => validateManagedFormRecipientLimit(overLimit!)).toThrow(
    "Select no more than 5 team email recipients"
  );

  const ownerFallback = makeGraph("");
  expect(ownerFallback?.resources[0].emailRecipientCount).toBe(1);
  expect(makeGraph("not-an-email")).toBeUndefined();
});

test("preflights bound Email recipient counts when Resources are referenced", () => {
  const makeGraph = (
    emailSettings: Record<string, string>,
    formData: Record<string, unknown> = {}
  ) => {
    const getGraph = getGeneratedGraph({
      instances: new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      dataSources: new Map([
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
        [
          "form-data-source",
          {
            id: "form-data-source",
            type: "parameter",
            name: "formData",
            scopeInstanceId: "form",
          },
        ],
      ]),
      resources: new Map([
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
              recipients:
                "one@example.com, two@example.com, three@example.com, four@example.com, five@example.com, six@example.com",
              ...emailSettings,
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
      ]),
      forms: [{ formId: "form", destinationDataSourceIds: ["email-source"] }],
      projectMeta: { contactEmail: "owner@example.com" },
    });
    return getGraph("form", { system: {}, formData, browserInfo: {} })!;
  };

  const senderBound = makeGraph({
    senderExpression: encodeDataSourceVariable("lookup-source"),
  });
  const senderBoundEmail = senderBound.resources.find(
    ({ id }) => id === "email"
  )!;
  expect(senderBoundEmail.dependencies).toEqual(["lookup"]);
  expect(senderBoundEmail.emailRecipientCount).toBe(6);
  expect(() => validateManagedFormRecipientLimit(senderBound)).toThrow(
    "Select no more than 5 team email recipients"
  );

  const recipientsBound = makeGraph({
    recipients: "invalid stale value",
    recipientsExpression: encodeDataSourceVariable("lookup-source"),
  });
  const recipientsBoundEmail = recipientsBound.resources.find(
    ({ id }) => id === "email"
  )!;
  expect(recipientsBoundEmail.dependencies).toEqual(["lookup"]);
  expect(recipientsBoundEmail.emailRecipientCount).toBeUndefined();
  expect(() => validateManagedFormRecipientLimit(recipientsBound)).toThrow(
    "Invalid Email Resource recipient count"
  );

  const formDataRecipientSettings = {
    recipients: "invalid stale value",
    recipientsExpression: `${encodeDataSourceVariable("form-data-source")}.recipients`,
  };
  const formDataRecipients = makeGraph(formDataRecipientSettings, {
    recipients: Array.from(
      { length: 6 },
      (_, index) => `person${index}@example.com`
    ).join(", "),
  });
  const formDataRecipientsEmail = formDataRecipients.resources.find(
    ({ id }) => id === "email"
  )!;
  expect(formDataRecipientsEmail.emailRecipientCount).toBeUndefined();
  const resolvedRequest = formDataRecipientsEmail.createRequest(new Map());
  expect(resolvedRequest.email?.recipients).toHaveLength(6);
  expect(() =>
    validateManagedFormRecipientLimit(
      formDataRecipients,
      new Map([["email", resolvedRequest]])
    )
  ).toThrow("Select no more than 5 team email recipients");

  const withinLimitRecipients = makeGraph(formDataRecipientSettings, {
    recipients: Array.from(
      { length: 5 },
      (_, index) => `person${index}@example.com`
    ).join(", "),
  });
  const withinLimitEmail = withinLimitRecipients.resources.find(
    ({ id }) => id === "email"
  )!;
  const withinLimitRequest = withinLimitEmail.createRequest(new Map());
  expect(withinLimitRequest.email?.recipients).toHaveLength(5);
  expect(() =>
    validateManagedFormRecipientLimit(
      withinLimitRecipients,
      new Map([["email", withinLimitRequest]])
    )
  ).not.toThrow();
});

test("counts an Email dependency of a selected HTTP Resource", () => {
  const makeGraph = (recipients: string) =>
    getGeneratedGraph({
      instances: new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      dataSources: new Map([
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
          "http-source",
          {
            id: "http-source",
            type: "resource",
            scopeInstanceId: "form",
            name: "HTTP",
            resourceId: "http",
          },
        ],
      ]),
      resources: new Map([
        [
          "email",
          {
            id: "email",
            name: "Email",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
          },
        ],
        [
          "http",
          {
            id: "http",
            name: "HTTP",
            method: "post",
            url: '"https://example.com/submit"',
            headers: [],
            body: encodeDataSourceVariable("email-source"),
          },
        ],
      ]),
      forms: [{ formId: "form", destinationDataSourceIds: ["http-source"] }],
      projectMeta: { contactEmail: recipients },
    })("form", { system: {}, formData: {}, browserInfo: {} });

  const atLimit = makeGraph(
    "a@example.com,b@example.com,c@example.com,d@example.com,e@example.com"
  );
  expect(atLimit?.rootIds).toEqual(["http"]);
  expect(
    atLimit?.resources.map(({ id, dependencies }) => [id, dependencies])
  ).toEqual([
    ["http", ["email"]],
    ["email", []],
  ]);
  expect(() => validateManagedFormRecipientLimit(atLimit!)).not.toThrow();

  const overLimit = makeGraph(
    "a@example.com,b@example.com,c@example.com,d@example.com,e@example.com,f@example.com"
  );
  expect(() => validateManagedFormRecipientLimit(overLimit!)).toThrow(
    "Select no more than 5 team email recipients"
  );
});

test("an edited default Email body formats Form values and preserves field access", () => {
  const formDataExpression = encodeDataSourceVariable("formData");
  const body = getDefaultFormEmailBodyExpression(
    formDataExpression,
    encodeDataSourceVariable("browserInfo")
  )
    .replace("Form data:", "Submitted fields:")
    .replace(
      "Browser info:",
      `Submitter: \${${formDataExpression}.name}\nUploaded: \${${formDataExpression}.upload.name}\n\nBrowser info:`
    );
  const getGraph = getGeneratedGraph({
    instances: new Map([
      [
        "form",
        {
          type: "instance",
          id: "form",
          component: "NativeForm",
          children: [{ type: "id", value: "password-input" }],
        },
      ],
      [
        "password-input",
        {
          type: "instance",
          id: "password-input",
          component: "Input",
          children: [],
        },
      ],
    ]),
    dataSources: new Map([
      [
        "formData",
        {
          id: "formData",
          type: "parameter",
          scopeInstanceId: "form",
          name: "formData",
        },
      ],
      [
        "browserInfo",
        {
          id: "browserInfo",
          type: "parameter",
          scopeInstanceId: "form",
          name: "browserInfo",
        },
      ],
      [
        "emailDataSource",
        {
          id: "emailDataSource",
          type: "resource",
          scopeInstanceId: "form",
          name: "email",
          resourceId: "email",
        },
      ],
    ]),
    resources: new Map([
      [
        "email",
        {
          id: "email",
          name: "Email",
          control: "email",
          method: "post",
          url: '""',
          headers: [],
          email: { body },
        },
      ],
    ]),
    props: new Map([
      [
        "password-name",
        {
          id: "password-name",
          instanceId: "password-input",
          name: "name",
          type: "string",
          value: "password",
        },
      ],
      [
        "password-type",
        {
          id: "password-type",
          instanceId: "password-input",
          name: "type",
          type: "string",
          value: "password",
        },
      ],
    ]),
    forms: [{ formId: "form", destinationDataSourceIds: ["emailDataSource"] }],
  });
  const request = getGraph("form", {
    system: {},
    formData: {
      name: "Ada",
      password: "secret",
      upload: new File(["abc"], "notes.txt"),
    },
    browserInfo: { language: "en" },
  })?.resources[0].createRequest(new Map());
  expect(request?.email?.body).toContain('"name": "Ada"');
  expect(request?.email?.body).toContain('"name": "notes.txt"');
  expect(request?.email?.body).toContain('"language": "en"');
  expect(request?.email?.body).toContain("Submitter: Ada");
  expect(request?.email?.body).toContain("Uploaded: notes.txt");
  expect(request?.email?.body).not.toContain("[object Object]");
  expect(request?.email?.body).not.toContain("secret");
});

test("Visitor Email keeps its empty receipt body instead of the submitted-fields default", async () => {
  const { createManagedFormDraftGraph } =
    await import("./managed-form-draft-graph");
  const instances: Instances = new Map([
    [
      "form",
      {
        type: "instance",
        id: "form",
        component: "NativeForm",
        children: [{ type: "id", value: "email-input" }],
      },
    ],
    [
      "email-input",
      { type: "instance", id: "email-input", component: "Input", children: [] },
    ],
  ]);
  const props: Props = new Map([
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
      "formData",
      {
        id: "formData",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "browserInfo",
      {
        id: "browserInfo",
        type: "parameter",
        scopeInstanceId: "form",
        name: "browserInfo",
      },
    ],
    [
      "email-source",
      {
        id: "email-source",
        type: "resource",
        scopeInstanceId: "form",
        name: "Notify visitor",
        resourceId: "email",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "email",
      {
        id: "email",
        name: "Notify visitor",
        control: "email",
        method: "post",
        url: '""',
        headers: [],
        email: {
          recipientMode: "visitor",
          visitorEmailField: "email",
        },
      },
    ],
  ]);
  const input = {
    formId: "form",
    destinationDataSourceIds: ["email-source"],
    instances,
    dataSources,
    resources,
    props,
    projectMeta: {
      contactEmail: "team@example.com",
      emailBody: "Project body override is not used for Visitor receipts",
    },
    system: {
      params: {},
      search: {},
      pathname: "/",
      origin: "https://site.example",
    },
    formData: { email: "visitor@example.com", message: "submitted value" },
    browserInfo: { language: "en" },
    evaluateExpression: evaluateFixtureExpression,
  };
  const draft = createManagedFormDraftGraph(input);
  const getPublishedGraph = getGeneratedGraph({
    ...input,
    forms: [
      {
        formId: input.formId,
        destinationDataSourceIds: input.destinationDataSourceIds,
      },
    ],
  });
  const published = getPublishedGraph(input.formId, input)!;

  for (const graph of [draft, published]) {
    const resource = graph.resources.find(({ id }) => id === "email")!;
    const request = resource.createRequest(new Map());
    expect(request.email?.recipientMode).toBe("visitor");
    expect(request.email?.body).toBe("");
    expect(request.email?.body).not.toContain("submitted value");
    expect(request.email?.body).not.toContain("language");
  }

  resources.get("email")!.email!.body = '"Resource receipt"';
  const overriddenDraft = createManagedFormDraftGraph(input);
  const overriddenPublished = getGeneratedGraph({ ...input, forms: [input] })(
    input.formId,
    input
  )!;
  for (const graph of [overriddenDraft, overriddenPublished]) {
    expect(graph.resources[0].createRequest(new Map()).email?.body).toBe(
      "Resource receipt"
    );
  }
});

test.each([
  ["Form", "form"],
  ["ancestor", "ancestor"],
  ["global", undefined],
] as const)(
  "selected Email Resource at %s scope gets the submitted-fields default in draft and published graphs",
  async (_scopeName, scopeInstanceId) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
    const instances: Instances = new Map([
      [
        "page",
        {
          type: "instance",
          id: "page",
          component: "Body",
          children: [{ type: "id", value: "ancestor" }],
        },
      ],
      [
        "ancestor",
        {
          type: "instance",
          id: "ancestor",
          component: "Box",
          children: [{ type: "id", value: "form" }],
        },
      ],
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
        "formData",
        {
          id: "formData",
          type: "parameter",
          scopeInstanceId: "form",
          name: "formData",
        },
      ],
      [
        "browserInfo",
        {
          id: "browserInfo",
          type: "parameter",
          scopeInstanceId: "form",
          name: "browserInfo",
        },
      ],
      [
        "email-source",
        {
          id: "email-source",
          type: "resource",
          scopeInstanceId,
          name: "Notify",
          resourceId: "email",
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
        },
      ],
    ]);
    const projectMeta: ProjectMeta = { contactEmail: "owner@example.com" };
    const input = {
      formId: "form",
      destinationDataSourceIds: ["email-source"],
      instances,
      dataSources,
      resources,
      props: new Map(),
      projectMeta,
      system: {
        params: {},
        search: {},
        pathname: "/",
        origin: "https://site.example",
      },
      formData: { name: "Ada" },
      browserInfo: { language: "en" },
      evaluateExpression: evaluateFixtureExpression,
    };
    const buildGraphs = (graphInput: typeof input) => {
      const published = getGeneratedGraph({
        ...graphInput,
        forms: [
          {
            formId: graphInput.formId,
            destinationDataSourceIds: graphInput.destinationDataSourceIds,
          },
        ],
      })(graphInput.formId, graphInput)!;
      const draft = createManagedFormDraftGraph(graphInput);
      return [draft, published];
    };
    const graphs = buildGraphs(input);
    for (const graph of graphs) {
      const body = graph.resources[0].createRequest(new Map()).email?.body;
      expect(body).toContain('"name": "Ada"');
      expect(body).toContain('"language": "en"');
    }
    const projectOverrideGraphs = buildGraphs({
      ...input,
      projectMeta: {
        ...input.projectMeta,
        emailBody: "Project override",
      },
    });
    for (const graph of projectOverrideGraphs) {
      expect(graph.resources[0].createRequest(new Map()).email?.body).toBe(
        "Project override"
      );
    }
    const resourceOverrideGraphs = buildGraphs({
      ...input,
      projectMeta: { ...input.projectMeta, emailBody: "Project override" },
      resources: new Map([
        [
          "email",
          {
            ...resources.get("email")!,
            email: { body: '"Resource override"' },
          },
        ],
      ]),
    });
    for (const graph of resourceOverrideGraphs) {
      expect(graph.resources[0].createRequest(new Map()).email?.body).toBe(
        "Resource override"
      );
    }
    const emptyResourceOverrideGraphs = buildGraphs({
      ...input,
      resources: new Map([
        [
          "email",
          {
            ...resources.get("email")!,
            email: { body: '""' },
          },
        ],
      ]),
    });
    for (const graph of emptyResourceOverrideGraphs) {
      expect(graph.resources[0].createRequest(new Map()).email?.body).toBe("");
    }
  }
);

test("automatic Email body redacts Element passwords and unknown input types", () => {
  const dataSources: DataSources = new Map([
    [
      "formData",
      {
        id: "formData",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "emailDataSource",
      {
        id: "emailDataSource",
        type: "resource",
        scopeInstanceId: "form",
        name: "email",
        resourceId: "email",
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
      },
    ],
  ]);
  const getBody = (input: {
    instance: Instance;
    inputProps: Props;
    editedBody?: string;
  }) => {
    const graph = getGeneratedGraph({
      instances: new Map([
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [{ type: "id", value: "input" }],
          },
        ],
        ["input", input.instance],
      ]),
      dataSources,
      resources:
        input.editedBody === undefined
          ? resources
          : new Map([
              [
                "email",
                {
                  ...resources.get("email")!,
                  email: { body: input.editedBody },
                },
              ],
            ]),
      props: input.inputProps,
      forms: [
        { formId: "form", destinationDataSourceIds: ["emailDataSource"] },
      ],
    })("form", {
      system: {},
      formData: { name: "Ada", password: "secret" },
      browserInfo: {},
    });
    return graph?.resources[0].createRequest(new Map()).email?.body;
  };
  const elementBody = getBody({
    instance: {
      type: "instance",
      id: "input",
      component: "Element",
      tag: "input",
      children: [],
    },
    inputProps: new Map([
      [
        "name",
        {
          id: "name",
          instanceId: "input",
          name: "name",
          type: "string",
          value: "password",
        },
      ],
      [
        "type",
        {
          id: "type",
          instanceId: "input",
          name: "type",
          type: "string",
          value: "password",
        },
      ],
    ]),
  });
  expect(elementBody).toContain('"name": "Ada"');
  expect(elementBody).not.toContain("secret");

  const dynamicTypeBody = getBody({
    instance: {
      type: "instance",
      id: "input",
      component: "Input",
      children: [],
    },
    inputProps: new Map([
      [
        "name",
        {
          id: "name",
          instanceId: "input",
          name: "name",
          type: "string",
          value: "password",
        },
      ],
      [
        "type",
        {
          id: "type",
          instanceId: "input",
          name: "type",
          type: "parameter",
          value: "inputType",
        },
      ],
    ]),
  });
  expect(dynamicTypeBody).toContain("Form fields omitted");
  expect(dynamicTypeBody).not.toContain("Ada");
  expect(dynamicTypeBody).not.toContain("secret");
  const editedBody = getDefaultFormEmailBodyExpression(
    encodeDataSourceVariable("formData")
  ).replace("Form data:", "Edited fields:");
  const editedDynamicTypeBody = getBody({
    instance: {
      type: "instance",
      id: "input",
      component: "Input",
      children: [],
    },
    inputProps: new Map([
      [
        "name",
        {
          id: "name",
          instanceId: "input",
          name: "name",
          type: "string",
          value: "password",
        },
      ],
      [
        "type",
        {
          id: "type",
          instanceId: "input",
          name: "type",
          type: "parameter",
          value: "inputType",
        },
      ],
    ]),
    editedBody,
  });
  expect(editedDynamicTypeBody).toContain("Edited fields:");
  expect(editedDynamicTypeBody).toContain("Form fields omitted");
  expect(editedDynamicTypeBody).not.toContain("Ada");
  expect(editedDynamicTypeBody).not.toContain("secret");
  const editedDynamicNameBody = getBody({
    instance: {
      type: "instance",
      id: "input",
      component: "Input",
      children: [],
    },
    inputProps: new Map([
      [
        "name",
        {
          id: "name",
          instanceId: "input",
          name: "name",
          type: "parameter",
          value: "inputName",
        },
      ],
      [
        "type",
        {
          id: "type",
          instanceId: "input",
          name: "type",
          type: "string",
          value: "password",
        },
      ],
    ]),
    editedBody,
  });
  expect(editedDynamicNameBody).toContain("Form fields omitted");
  expect(editedDynamicNameBody).not.toContain("Ada");
  expect(editedDynamicNameBody).not.toContain("secret");
});

test("an external Email Resource cannot read a Form-only binding", () => {
  const graph = getGeneratedGraph({
    instances: new Map([
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ]),
    dataSources: new Map([
      [
        "formData",
        {
          id: "formData",
          type: "parameter",
          scopeInstanceId: "form",
          name: "formData",
        },
      ],
      [
        "external",
        {
          id: "external",
          type: "resource",
          scopeInstanceId: "other",
          name: "External email",
          resourceId: "email",
        },
      ],
    ]),
    resources: new Map([
      [
        "email",
        {
          id: "email",
          name: "Email",
          control: "email",
          method: "post",
          url: '""',
          headers: [],
          email: { body: encodeDataSourceVariable("formData") },
        },
      ],
    ]),
    forms: [{ formId: "form", destinationDataSourceIds: ["external"] }],
  });
  expect(
    graph("form", { system: {}, formData: { secret: "no" }, browserInfo: {} })
  ).toBeUndefined();
});

test("builds a submit-time graph with Form bindings and dependent Resource results", () => {
  const formData = { name: "Ada" };
  const browserInfo = { language: "en" };
  const getGraph = getGeneratedGraph({
    instances: new Map([
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ]),
    dataSources: new Map([
      [
        "formData",
        {
          id: "formData",
          type: "parameter",
          scopeInstanceId: "form",
          name: "formData",
        },
      ],
      [
        "browserInfo",
        {
          id: "browserInfo",
          type: "parameter",
          scopeInstanceId: "form",
          name: "browserInfo",
        },
      ],
      [
        "token",
        {
          id: "token",
          type: "variable",
          scopeInstanceId: "form",
          name: "token",
          value: { type: "string", value: "builder-token" },
        },
      ],
      [
        "previous",
        {
          id: "previous",
          type: "resource",
          scopeInstanceId: "form",
          name: "previous",
          resourceId: "lookup",
        },
      ],
      [
        "destination",
        {
          id: "destination",
          type: "resource",
          scopeInstanceId: "form",
          name: "destination",
          resourceId: "send",
        },
      ],
    ]),
    resources: new Map([
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
      [
        "send",
        {
          id: "send",
          name: "Send",
          method: "get",
          url: '"https://example.com/send"',
          bodyFormat: "json",
          headers: [
            {
              name: "X-Language",
              value: `${encodeDataSourceVariable("browserInfo")}.language`,
            },
            { name: "X-Token", value: encodeDataSourceVariable("token") },
          ],
          body: `({ fields: ${encodeDataSourceVariable(
            "formData"
          )}, previous: ${encodeDataSourceVariable("previous")}.data })`,
        },
      ],
    ]),
    forms: [{ formId: "form", destinationDataSourceIds: ["destination"] }],
  });

  const graph = getGraph("form", { system: {}, formData, browserInfo });
  expect(graph?.rootIds).toEqual(["send"]);
  expect(
    graph?.resources.map(({ id, dependencies }) => [id, dependencies])
  ).toEqual([
    ["send", ["lookup"]],
    ["lookup", []],
  ]);
  const lookup = graph?.resources.find(({ id }) => id === "lookup");
  const send = graph?.resources.find(({ id }) => id === "send");
  expect(send?.bodyFormat).toBe("json");
  expect(send?.usesDefaultFormBody).toBeUndefined();
  expect(lookup?.createRequest(new Map()).method).toBe("get");
  expect(
    send?.createRequest(new Map([["lookup", { data: { id: 1 } }]]))
  ).toMatchObject({
    method: "post",
    body: { fields: formData, previous: { id: 1 } },
    headers: [
      { name: "X-Language", value: "en" },
      { name: "X-Token", value: "builder-token" },
    ],
  });
  expect(
    getGraph("unknown", { system: {}, formData, browserInfo })
  ).toBeUndefined();
});

test("an external Resource can be selected without gaining access to Form data", () => {
  const instances: Instances = new Map([
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "formData",
      {
        id: "formData",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "external",
      {
        id: "external",
        type: "resource",
        scopeInstanceId: undefined,
        name: "external",
        resourceId: "send",
      },
    ],
  ]);
  const forms = [{ formId: "form", destinationDataSourceIds: ["external"] }];
  const resources: Resources = new Map([
    [
      "send",
      {
        id: "send",
        name: "Send",
        method: "post",
        url: '"https://example.com/send"',
        headers: [],
        body: '"fixed"',
      },
    ],
  ]);
  const graph = getGeneratedGraph({ instances, dataSources, resources, forms })(
    "form",
    { system: {}, formData: { private: true }, browserInfo: {} }
  );
  expect(graph?.resources[0].createRequest(new Map()).body).toBe("fixed");

  resources.set("send", {
    ...resources.get("send")!,
    body: encodeDataSourceVariable("formData"),
  });
  expect(
    getGeneratedGraph({ instances, dataSources, resources, forms })("form", {
      system: {},
      formData: {},
      browserInfo: {},
    })
  ).toBeUndefined();

  dataSources.set("otherParam", {
    id: "otherParam",
    type: "parameter",
    scopeInstanceId: undefined,
    name: "otherParam",
  });
  resources.set("send", {
    ...resources.get("send")!,
    body: encodeDataSourceVariable("otherParam"),
  });
  expect(
    getGeneratedGraph({ instances, dataSources, resources, forms })("form", {
      system: {},
      formData: {},
      browserInfo: {},
    })
  ).toBeUndefined();
});

test.each(["form", "page", undefined])(
  "an Action defined on %s defaults its POST body to submitted formData in draft and published graphs",
  async (scopeInstanceId) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
    const formData = { name: "Ada", interests: ["design", "code"] };
    const input: Parameters<typeof getGeneratedGraph>[0] = {
      instances: new Map([
        [
          "page",
          {
            type: "instance" as const,
            id: "page",
            component: "Body",
            children: [{ type: "id" as const, value: "form" }],
          },
        ],
        [
          "form",
          {
            type: "instance",
            id: "form",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      dataSources: new Map([
        [
          "destination",
          {
            id: "destination",
            type: "resource",
            scopeInstanceId,
            name: "Destination",
            resourceId: "submit",
          },
        ],
      ]),
      resources: new Map([
        [
          "submit",
          {
            id: "submit",
            name: "Submit",
            method: "get",
            url: '"https://example.com/submit"',
            headers: [],
            bodyFormat: "json",
          },
        ],
      ]),
      forms: [{ formId: "form", destinationDataSourceIds: ["destination"] }],
    };
    const system = {
      params: {},
      search: {},
      origin: "https://site.example",
      pathname: "/",
    };
    const graph = getGeneratedGraph(input)("form", {
      system,
      formData,
      browserInfo: {},
    });
    const draft = createManagedFormDraftGraph({
      ...input,
      formId: "form",
      destinationDataSourceIds: ["destination"],
      props: new Map(),
      system,
      formData,
      browserInfo: {},
      evaluateExpression: (expression) => JSON.parse(expression),
    });

    for (const current of [graph, draft]) {
      expect(current?.resources[0].createRequest(new Map())).toMatchObject({
        method: "post",
        body: formData,
      });
      expect(current?.resources[0].usesDefaultFormBody).toBe(true);
    }
  }
);

test("a shared outside alias cannot promote a Resource into Form scope", () => {
  const instances: Instances = new Map([
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "formData",
      {
        id: "formData",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "inside",
      {
        id: "inside",
        type: "resource",
        scopeInstanceId: "form",
        name: "inside",
        resourceId: "shared",
      },
    ],
    [
      "outside",
      {
        id: "outside",
        type: "resource",
        scopeInstanceId: "other",
        name: "outside",
        resourceId: "shared",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "shared",
      {
        id: "shared",
        name: "Shared",
        method: "post",
        url: '"https://example.com/send"',
        headers: [],
        body: encodeDataSourceVariable("formData"),
      },
    ],
  ]);
  const getGraph = getGeneratedGraph({
    instances,
    dataSources,
    resources,
    forms: [{ formId: "form", destinationDataSourceIds: ["inside"] }],
  });
  expect(
    getGraph("form", { system: {}, formData: {}, browserInfo: {} })
  ).toBeUndefined();
});

test("an invalid Form graph does not prevent another Form from building", () => {
  const instances: Instances = new Map([
    [
      "invalidForm",
      {
        type: "instance",
        id: "invalidForm",
        component: "NativeForm",
        children: [],
      },
    ],
    [
      "validForm",
      {
        type: "instance",
        id: "validForm",
        component: "NativeForm",
        children: [],
      },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "invalid",
      {
        id: "invalid",
        type: "resource",
        scopeInstanceId: "invalidForm",
        name: "invalid",
        resourceId: "missingDependency",
      },
    ],
    [
      "valid",
      {
        id: "valid",
        type: "resource",
        scopeInstanceId: "validForm",
        name: "valid",
        resourceId: "working",
      },
    ],
    [
      "dependency",
      {
        id: "dependency",
        type: "resource",
        scopeInstanceId: "invalidForm",
        name: "dependency",
        resourceId: "gone",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "missingDependency",
      {
        id: "missingDependency",
        name: "Missing dependency",
        method: "post",
        url: '"https://example.com/invalid"',
        headers: [],
        body: encodeDataSourceVariable("dependency"),
      },
    ],
    [
      "working",
      {
        id: "working",
        name: "Working",
        method: "post",
        url: '"https://example.com/valid"',
        headers: [],
      },
    ],
  ]);
  const getGraph = getGeneratedGraph({
    instances,
    dataSources,
    resources,
    forms: [
      { formId: "invalidForm", destinationDataSourceIds: ["invalid"] },
      { formId: "validForm", destinationDataSourceIds: ["valid"] },
    ],
  });
  expect(
    getGraph("invalidForm", { system: {}, formData: {}, browserInfo: {} })
  ).toBeUndefined();
  expect(
    getGraph("validForm", { system: {}, formData: {}, browserInfo: {} })
      ?.rootIds
  ).toEqual(["working"]);
});

test("deduplicates Resource roots while preserving selection order", () => {
  const getGraph = getGeneratedGraph({
    instances: new Map([
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ]),
    dataSources: new Map([
      [
        "first",
        {
          id: "first",
          type: "resource",
          scopeInstanceId: "form",
          name: "first",
          resourceId: "firstRequest",
        },
      ],
      [
        "second",
        {
          id: "second",
          type: "resource",
          scopeInstanceId: "form",
          name: "second",
          resourceId: "secondRequest",
        },
      ],
      [
        "alias",
        {
          id: "alias",
          type: "resource",
          scopeInstanceId: "form",
          name: "alias",
          resourceId: "firstRequest",
        },
      ],
    ]),
    resources: new Map([
      [
        "firstRequest",
        {
          id: "firstRequest",
          name: "First",
          method: "get",
          url: '"https://example.com/first"',
          headers: [],
        },
      ],
      [
        "secondRequest",
        {
          id: "secondRequest",
          name: "Second",
          method: "get",
          url: '"https://example.com/second"',
          headers: [],
        },
      ],
    ]),
    forms: [
      {
        formId: "form",
        destinationDataSourceIds: ["second", "first", "alias"],
      },
    ],
  });
  expect(
    getGraph("form", { system: {}, formData: {}, browserInfo: {} })?.rootIds
  ).toEqual(["secondRequest", "firstRequest"]);
});

test("an external dependency cannot read Form data through an internal destination", () => {
  const instances: Instances = new Map([
    [
      "form",
      { type: "instance", id: "form", component: "NativeForm", children: [] },
    ],
  ]);
  const dataSources: DataSources = new Map([
    [
      "formData",
      {
        id: "formData",
        type: "parameter",
        scopeInstanceId: "form",
        name: "formData",
      },
    ],
    [
      "previous",
      {
        id: "previous",
        type: "resource",
        scopeInstanceId: "elsewhere",
        name: "previous",
        resourceId: "lookup",
      },
    ],
    [
      "destination",
      {
        id: "destination",
        type: "resource",
        scopeInstanceId: "form",
        name: "destination",
        resourceId: "send",
      },
    ],
  ]);
  const resources: Resources = new Map([
    [
      "lookup",
      {
        id: "lookup",
        name: "Lookup",
        method: "get",
        url: '"https://example.com/lookup"',
        headers: [],
        body: encodeDataSourceVariable("formData"),
      },
    ],
    [
      "send",
      {
        id: "send",
        name: "Send",
        method: "post",
        url: '"https://example.com/send"',
        headers: [],
        body: encodeDataSourceVariable("previous"),
      },
    ],
  ]);
  expect(
    getGeneratedGraph({
      instances,
      dataSources,
      resources,
      forms: [{ formId: "form", destinationDataSourceIds: ["destination"] }],
    })("form", { system: {}, formData: {}, browserInfo: {} })
  ).toBeUndefined();
});

test.each([
  ["form", true],
  ["page", true],
  [undefined, true],
  ["sibling", false],
  ["child", false],
  ["unrelated", false],
] as const)(
  "draft and published Actions enforce scope %s",
  async (scopeInstanceId, allowed) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
    const instances: Instances = new Map([
      [
        "page",
        {
          type: "instance",
          id: "page",
          component: "Body",
          children: [
            { type: "id", value: "form" },
            { type: "id", value: "sibling" },
          ],
        },
      ],
      [
        "form",
        {
          type: "instance",
          id: "form",
          component: "NativeForm",
          children: [{ type: "id", value: "child" }],
        },
      ],
      [
        "sibling",
        { type: "instance", id: "sibling", component: "Box", children: [] },
      ],
      [
        "child",
        { type: "instance", id: "child", component: "Box", children: [] },
      ],
    ]);
    const dataSources: DataSources = new Map([
      [
        "source",
        {
          id: "source",
          type: "resource",
          name: "Action",
          scopeInstanceId,
          resourceId: "send",
        },
      ],
    ]);
    const resources: Resources = new Map([
      [
        "send",
        {
          id: "send",
          name: "Send",
          method: "post",
          url: '"https://example.com"',
          headers: [],
        },
      ],
    ]);
    const input = {
      formId: "form",
      destinationDataSourceIds: ["source"],
      instances,
      dataSources,
      resources,
      props: new Map(),
      system: {
        params: {},
        search: {},
        origin: "https://site.example",
        pathname: "/",
      },
      formData: {},
      browserInfo: {},
      evaluateExpression: (expression: string) => JSON.parse(expression),
    };
    const published = getGeneratedGraph({
      instances,
      dataSources,
      resources,
      forms: [input],
    })("form", input);
    if (allowed) {
      expect(createManagedFormDraftGraph(input).rootIds).toEqual(["send"]);
      expect(published?.rootIds).toEqual(["send"]);
    } else {
      expect(() => createManagedFormDraftGraph(input)).toThrow(
        "Resource destination not found in Form scope"
      );
      expect(published).toBeUndefined();
    }
  }
);

test.each([
  "field",
  "external-binding",
  "missing-dependency",
  "unsupported-parameter",
])(
  "draft and published visitor %s configuration fails only that action",
  async (failure) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
    const { handleManagedFormSubmission } =
      await import("./managed-form-handler");
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
        "http-source",
        {
          id: "http-source",
          name: "http",
          type: "resource",
          resourceId: "http",
          scopeInstanceId: "form",
        },
      ],
      [
        "visitor-source",
        {
          id: "visitor-source",
          name: "visitor",
          type: "resource",
          resourceId: "visitor",
          scopeInstanceId: failure === "external-binding" ? "page" : "form",
        },
      ],
      [
        "formData",
        {
          id: "formData",
          name: "formData",
          type: "parameter",
          scopeInstanceId: "form",
        },
      ],
      [
        "missing",
        {
          id: "missing",
          name: "missing",
          type: "resource",
          resourceId: "missing",
          scopeInstanceId: "form",
        },
      ],
    ]);
    dataSources.set("unsupported", {
      id: "unsupported",
      name: "unsupported",
      type: "parameter",
      scopeInstanceId: "page",
    });
    const resources: Resources = new Map([
      [
        "http",
        {
          id: "http",
          name: "HTTP",
          method: "post",
          url: '"https://example.com"',
          headers: [],
        },
      ],
      [
        "visitor",
        {
          id: "visitor",
          name: "Receipt",
          method: "post",
          url: '""',
          headers: [],
          control: "email",
          email: {
            recipientMode: "visitor",
            visitorEmailField:
              failure === "unsupported-parameter" ? "email" : "missing-field",
            body:
              failure === "external-binding"
                ? encodeDataSourceVariable("formData")
                : failure === "missing-dependency"
                  ? encodeDataSourceVariable("missing")
                  : failure === "unsupported-parameter"
                    ? encodeDataSourceVariable("unsupported")
                    : '""',
          },
        },
      ],
    ]);
    instances.set("email-input", {
      type: "instance",
      id: "email-input",
      component: "Input",
      children: [],
    });
    instances.get("form")!.children.push({ type: "id", value: "email-input" });
    const props: Props = new Map([
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
    const input = {
      formId: "form",
      destinationDataSourceIds: ["http-source", "visitor-source"],
      instances,
      dataSources,
      resources,
      props,
      system: {
        params: {},
        search: {},
        origin: "https://site.example",
        pathname: "/",
      },
      formData: {},
      browserInfo: {},
      evaluateExpression: (expression: string) => JSON.parse(expression),
    };
    const graphs = [
      createManagedFormDraftGraph(input),
      getGeneratedGraph({ ...input, forms: [input] })("form", input)!,
    ];
    for (const graph of graphs) {
      const data = new FormData();
      data.set("email", "visitor@example.com");
      data.set("ws--managed-form-id", "form");
      data.set("ws--managed-form-array-names", "[]");
      data.set("ws--form-bot", Date.now().toString(16));
      const resourceFetch = vi.fn(async () => Response.json({ ok: true }));
      const sendEmail = vi.fn();
      const result = await handleManagedFormSubmission({
        request: new Request("https://site.example", {
          method: "POST",
          body: data,
        }),
        system: input.system,
        configuration: () => ({
          action: input.destinationDataSourceIds.map((dataSourceId) => ({
            dataSourceId,
            enabled: true,
          })),
          resourceIds: ["http", "visitor"],
        }),
        getGraph: () => graph,
        resourceFetch,
        createEmailSender: () => sendEmail,
      });
      expect(result).toMatchObject({
        success: true,
        results: [
          { resourceId: "http", status: 200 },
          { resourceId: "visitor", status: 400 },
        ],
        errors: [{ resourceId: "visitor", status: 400 }],
      });
      expect(resourceFetch).toHaveBeenCalledOnce();
      expect(sendEmail).not.toHaveBeenCalled();
      if (failure === "unsupported-parameter") {
        expect(result.errors[0].message).toContain(
          "cannot resolve parameter unsupported"
        );
      }
    }
  }
);

test.each(["http", "email", "visitor"] as const)(
  "an ancestor %s Action alias cannot inherit Form bindings from a local alias",
  async (kind) => {
    const { createManagedFormDraftGraph } =
      await import("./managed-form-draft-graph");
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
        {
          type: "instance",
          id: "form",
          component: "NativeForm",
          children: [{ type: "id", value: "input" }],
        },
      ],
      [
        "input",
        { type: "instance", id: "input", component: "Input", children: [] },
      ],
    ]);
    const props: Props = new Map([
      [
        "name",
        {
          id: "name",
          type: "string",
          instanceId: "input",
          name: "name",
          value: "email",
        },
      ],
      [
        "type",
        {
          id: "type",
          type: "string",
          instanceId: "input",
          name: "type",
          value: "email",
        },
      ],
    ]);
    const dataSources: DataSources = new Map([
      [
        "external",
        {
          id: "external",
          type: "resource",
          name: "External",
          scopeInstanceId: "page",
          resourceId: "send",
        },
      ],
      [
        "local",
        {
          id: "local",
          type: "resource",
          name: "Local",
          scopeInstanceId: "form",
          resourceId: "send",
        },
      ],
      [
        "formData",
        {
          id: "formData",
          type: "parameter",
          name: "formData",
          scopeInstanceId: "form",
        },
      ],
    ]);
    const resources: Resources = new Map([
      [
        "send",
        {
          id: "send",
          name: "Send",
          method: "post",
          url: '"https://example.com"',
          headers: [],
          ...(kind === "http" ? {} : { control: "email" as const }),
          ...(kind === "visitor"
            ? {
                email: {
                  recipientMode: "visitor" as const,
                  visitorEmailField: "email",
                },
              }
            : {}),
        },
      ],
    ]);
    const input = {
      formId: "form",
      destinationDataSourceIds: ["external"],
      instances,
      props,
      dataSources,
      resources,
      projectMeta: { contactEmail: "owner@example.com" },
      system: {
        params: {},
        search: {},
        origin: "https://site.example",
        pathname: "/",
      },
      formData: {
        email: "visitor@example.com",
        private: "submitted value",
      },
      browserInfo: {},
      evaluateExpression: evaluateFixtureExpression,
    };
    const graphs = [
      createManagedFormDraftGraph(input),
      getGeneratedGraph({ ...input, forms: [input] })("form", input),
    ];
    for (const graph of graphs) {
      expect(graph?.rootIds).toEqual(["send"]);
      const resource = graph!.resources.find(
        (resource) => resource.id === "send"
      )!;
      if (kind === "visitor") {
        expect(resource.nonfatal).toBe(true);
        expect(() => resource.createRequest(new Map())).toThrow(
          "invalid visitor email field"
        );
      } else {
        const request = resource.createRequest(new Map());
        expect(request.body).toEqual(
          kind === "http" ? input.formData : undefined
        );
        expect(Boolean(resource.usesDefaultFormBody)).toBe(kind === "http");
        if (kind === "email") {
          expect(request.email?.body).toContain(
            '"email": "visitor@example.com"'
          );
          expect(request.email?.body).toContain("submitted value");
        }
      }
    }
  }
);
