import { expect, test } from "@jest/globals";
import type { Page } from "./schema/pages";
import { createScope } from "./scope";
import { generateResources } from "./resources-generator";

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
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const variableName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-json.com",
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      return new Map<string, ResourceRequest>([
        ["variableName", variableName],
      ])
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
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      let AccessToken = "my-token"
      const variableName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-json.com/",
        method: "post",
        headers: [
          { name: "Authorization", value: "Token " + AccessToken },
        ],
        body: { body: true },
      }
      return new Map<string, ResourceRequest>([
        ["variableName", variableName],
      ])
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
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      const system = _props.system
      const variableName: ResourceRequest = {
        id: "resourceId",
        name: "resourceName",
        url: "https://my-json.com/" + system?.params?.slug,
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      return new Map<string, ResourceRequest>([
        ["variableName", variableName],
      ])
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
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      return new Map<string, ResourceRequest>([
      ])
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
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      return new Map<string, ResourceRequest>([
      ])
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
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System }) => {
      return new Map<string, ResourceRequest>([
      ])
    }
    "
  `);
});
