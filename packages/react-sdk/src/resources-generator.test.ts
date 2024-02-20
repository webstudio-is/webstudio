import { expect, test } from "@jest/globals";
import stripIndent from "strip-indent";
import { createScope, type Page } from "@webstudio-is/sdk";
import { generateResourcesLoader } from "./resources-generator";

const clear = (input: string) =>
  stripIndent(input).trimStart().replace(/ +$/, "");

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

test("generate resources loader", () => {
  expect(
    generateResourcesLoader({
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
  ).toEqual(
    clear(`
      import { loadResource } from "@webstudio-is/sdk";
      type Params = Record<string, string | undefined>
      export const loadResources = async (_props: { params: Params }) => {
      const [
      variableName,
      ] = await Promise.all([
      loadResource({
      id: "resourceId",
      name: "resourceName",
      url: "https://my-json.com",
      method: "post",
      headers: [
      { name: "Content-Type", value: "application/json" },
      ],
      body: {body: true},
      }),
      ])
      return {
      variableName,
      } as Record<string, unknown>
      }
    `)
  );
});

test("generate variable and use in resources loader", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        pathParamsDataSourceId: "variableParamsId",
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
  ).toEqual(
    clear(`
      import { loadResource } from "@webstudio-is/sdk";
      type Params = Record<string, string | undefined>
      export const loadResources = async (_props: { params: Params }) => {
      let AccessToken = "my-token"
      const [
      variableName,
      ] = await Promise.all([
      loadResource({
      id: "resourceId",
      name: "resourceName",
      url: "https://my-json.com/",
      method: "post",
      headers: [
      { name: "Authorization", value: "Token " + AccessToken },
      ],
      body: {body: true},
      }),
      ])
      return {
      variableName,
      } as Record<string, unknown>
      }
    `)
  );
});

test("generate path params variable and use in resources loader", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        pathParamsDataSourceId: "variableParamsId",
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
          id: "variableParamsId",
          scopeInstanceId: "body",
          name: "Path Params",
          type: "parameter",
        },
      ]),
      resources: toMap([
        {
          id: "resourceId",
          name: "resourceName",
          url: `"https://my-json.com/" + $ws$dataSource$variableParamsId.slug`,
          method: "post",
          headers: [{ name: "Content-Type", value: `"application/json"` }],
          body: `{ body: true }`,
        },
      ]),
    })
  ).toEqual(
    clear(`
      import { loadResource } from "@webstudio-is/sdk";
      type Params = Record<string, string | undefined>
      export const loadResources = async (_props: { params: Params }) => {
      const PathParams = _props.params
      const [
      variableName,
      ] = await Promise.all([
      loadResource({
      id: "resourceId",
      name: "resourceName",
      url: "https://my-json.com/" + PathParams?.slug,
      method: "post",
      headers: [
      { name: "Content-Type", value: "application/json" },
      ],
      body: {body: true},
      }),
      ])
      return {
      variableName,
      } as Record<string, unknown>
      }
    `)
  );
});

test("generate empty resources loader", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: new Map(),
      resources: new Map(),
    })
  ).toEqual(
    clear(`
      type Params = Record<string, string | undefined>
      export const loadResources = async (_props: { params: Params }) => {
      return {
      } as Record<string, unknown>
      }
    `)
  );
});

test("prevent generating unused variables", () => {
  expect(
    generateResourcesLoader({
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
"type Params = Record<string, string | undefined>
export const loadResources = async (_props: { params: Params }) => {
return {
} as Record<string, unknown>
}
"
`);
});

test("prevent generating unused path params variable", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        pathParamsDataSourceId: "variableParamsId",
      } as Page,
      dataSources: toMap([
        {
          id: "variableParamsId",
          scopeInstanceId: "body",
          name: "Unused Path Params",
          type: "parameter",
        },
      ]),
      resources: new Map(),
    })
  ).toMatchInlineSnapshot(`
"type Params = Record<string, string | undefined>
export const loadResources = async (_props: { params: Params }) => {
return {
} as Record<string, unknown>
}
"
`);
});
