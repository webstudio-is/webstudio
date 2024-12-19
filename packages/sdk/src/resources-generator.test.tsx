import { expect, test } from "vitest";
import { renderJsx, $ } from "@webstudio-is/template";
import type { Page } from "./schema/pages";
import { createScope } from "./scope";
import {
  generateResources,
  replaceFormActionsWithResources,
} from "./resources-generator";
import type { Resource } from "./schema/resources";

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

test("generate resources loader", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: toMap([
        {
          id: "variableResourceId",
          scopeInstanceId: "body",
          type: "resource",
          name: "variableName",
          resourceId: "resourceId",
        },
      ]),
      resources: toMap([
        {
          id: "resourceId",
          name: "resourceName",
          url: `"https://my-json.com"`,
          method: "post",
          headers: [{ name: "Content-Type", value: `"application/json"` }],
          body: `{ body: true }`,
        },
      ]),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const resourceName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-json.com",
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("generate variable and use in resources loader", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        systemDataSourceId: "variableSystemId",
      } as Page,
      dataSources: toMap([
        {
          id: "variableResourceId",
          scopeInstanceId: "body",
          name: "variableName",
          type: "resource",
          resourceId: "resourceId",
        },
        {
          id: "variableTokenId",
          scopeInstanceId: "body",
          name: "Access Token",
          type: "variable",
          value: { type: "string", value: "my-token" },
        },
      ]),
      resources: toMap([
        {
          id: "resourceId",
          name: "resourceName",
          url: `"https://my-json.com/"`,
          method: "post",
          headers: [
            {
              name: "Authorization",
              value: `"Token " + $ws$dataSource$variableTokenId`,
            },
          ],
          body: `{ body: true }`,
        },
      ]),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      let AccessToken = "my-token"
      const resourceName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-json.com/",
        method: "post",
        headers: [
          { name: "Authorization", value: "Token " + AccessToken },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("generate system variable and use in resources loader", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        systemDataSourceId: "variableSystemId",
      } as Page,
      dataSources: toMap([
        {
          id: "variableResourceId",
          scopeInstanceId: "body",
          name: "variableName",
          type: "resource",
          resourceId: "resourceId",
        },
        {
          id: "variableSystemId",
          scopeInstanceId: "body",
          name: "system",
          type: "parameter",
        },
      ]),
      resources: toMap([
        {
          id: "resourceId",
          name: "resourceName",
          url: `"https://my-json.com/" + $ws$dataSource$variableSystemId.params.slug`,
          method: "post",
          headers: [{ name: "Content-Type", value: `"application/json"` }],
          body: `{ body: true }`,
        },
      ]),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const system = _props.system
      const resourceName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-json.com/" + system?.params?.slug,
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("generate empty resources loader", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: new Map(),
      resources: new Map(),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("prevent generating unused variables", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: toMap([
        {
          id: "unuseVariableId",
          scopeInstanceId: "body",
          name: "Unused Variable",
          type: "variable",
          value: { type: "string", value: "" },
        },
      ]),
      resources: new Map(),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("prevent generating unused system variable", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        systemDataSourceId: "variableParamsId",
      } as Page,
      dataSources: toMap([
        {
          id: "variableParamsId",
          scopeInstanceId: "body",
          name: "Unused System",
          type: "parameter",
        },
      ]),
      resources: new Map(),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("generate action resource", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        systemDataSourceId: "variableParamsId",
      } as Page,
      dataSources: new Map(),
      resources: toMap([
        {
          id: "resourceId",
          name: "resourceName",
          url: `"https://my-url.com"`,
          method: "post",
          headers: [],
        },
      ]),
      props: toMap([
        {
          id: "propId",
          instanceId: "body",
          name: "myProp",
          type: "resource",
          value: "resourceId",
        },
      ]),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const resourceName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-url.com",
        method: "post",
        headers: [
        ],
      }
      const _data = new Map<string, ResourceRequest>([
      ])
      const _action = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      return { data: _data, action: _action }
    }
    "
  `);
});

test("replace form action with resource", () => {
  const data = {
    resources: toMap<Resource>([]),
    ...renderJsx(<$.Form ws:id="formId" action="https://my-url.com"></$.Form>),
  };
  replaceFormActionsWithResources(data);
  expect(data.props).toEqual(
    toMap([
      {
        id: "formId:action",
        instanceId: "formId",
        name: "action",
        type: "resource",
        value: "formId",
      },
    ])
  );
  expect(data.resources).toEqual(
    toMap([
      {
        headers: [],
        id: "formId",
        method: "post",
        name: "action",
        url: `"https://my-url.com"`,
      },
    ])
  );
});

test("ignore empty form action", () => {
  const data = {
    resources: toMap<Resource>([]),
    ...renderJsx(<$.Form ws:id="formId" action=""></$.Form>),
  };
  replaceFormActionsWithResources(data);
  expect(data.props).toEqual(
    toMap([
      {
        id: "formId:action",
        instanceId: "formId",
        name: "action",
        type: "string",
        value: "",
      },
    ])
  );
  expect(data.resources).toEqual(new Map());
});
