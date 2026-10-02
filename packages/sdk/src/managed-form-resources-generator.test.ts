import { transformSync } from "esbuild";
import { expect, test } from "vitest";
import { createScope } from "./scope";
import { encodeDataSourceVariable } from "./expression";
import { generateManagedFormResources } from "./managed-form-resources-generator";
import type { DataSources } from "./schema/data-sources";
import type { Instances } from "./schema/instances";
import type { Resources } from "./schema/resources";
import type { ResourceRequestGraph } from "./resource-loader";

const getGeneratedGraph = (input: {
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
  forms: readonly {
    formId: string;
    destinationDataSourceIds: readonly string[];
  }[];
}) => {
  const source = generateManagedFormResources({
    scope: createScope(),
    ...input,
  });
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", code)(module, module.exports);
  return module.exports.getManagedFormResourceGraph as (
    formId: string,
    props: { system: unknown; formData: unknown; browserInfo: unknown }
  ) => ResourceRequestGraph | undefined;
};

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
          headers: [
            {
              name: "X-Language",
              value: `${encodeDataSourceVariable("browserInfo")}.language`,
            },
            { name: "X-Token", value: encodeDataSourceVariable("token") },
          ],
          body: `({ fields: ${encodeDataSourceVariable("formData")}, previous: ${encodeDataSourceVariable("previous")}.data })`,
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
        scopeInstanceId: "other",
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
    scopeInstanceId: "other",
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

test("a Form-scoped destination defaults its POST body to all formData", () => {
  const formData = { name: "Ada", interests: ["design", "code"] };
  const graph = getGeneratedGraph({
    instances: new Map([
      [
        "form",
        { type: "instance", id: "form", component: "NativeForm", children: [] },
      ],
    ]),
    dataSources: new Map([
      [
        "destination",
        {
          id: "destination",
          type: "resource",
          scopeInstanceId: "form",
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
        },
      ],
    ]),
    forms: [{ formId: "form", destinationDataSourceIds: ["destination"] }],
  })("form", { system: {}, formData, browserInfo: {} });

  expect(graph?.resources[0].createRequest(new Map())).toMatchObject({
    method: "post",
    body: formData,
  });
});

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
