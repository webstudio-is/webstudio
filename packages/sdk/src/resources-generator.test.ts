import { expect, test } from "@jest/globals";
import type { Page } from "./schema/pages";
import { createScope } from "./scope";
import { generateResourcesLoader } from "./resources-generator";

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
  ).toMatchInlineSnapshot(`
"import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
import { sitemap } from "./$resources.sitemap.xml";
export const loadResources = async (_props: { system: System }) => {

    const customFetch: typeof fetch = (input, init) => {
      if (typeof input !== "string") {
        return fetch(input, init);
      }

      if (isLocalResource(input, "sitemap.xml")) {
        // @todo: dynamic import sitemap ???
        const response = new Response(JSON.stringify(sitemap));
        response.headers.set('content-type',  'application/json; charset=utf-8');
        return Promise.resolve(response);
      }

      return fetch(input, init);
    };
    const [
variableName,
] = await Promise.all([
loadResource(customFetch, {
id: "resourceId",
name: "resourceName",
url: "https://my-json.com",
method: "post",
headers: [
{ name: "Content-Type", value: "application/json" },
],
body: { body: true },
}),
])
return {
variableName,
} as Record<string, unknown>
}
"
`);
});

test("generate variable and use in resources loader", () => {
  expect(
    generateResourcesLoader({
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
"import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
import { sitemap } from "./$resources.sitemap.xml";
export const loadResources = async (_props: { system: System }) => {
let AccessToken = "my-token"

    const customFetch: typeof fetch = (input, init) => {
      if (typeof input !== "string") {
        return fetch(input, init);
      }

      if (isLocalResource(input, "sitemap.xml")) {
        // @todo: dynamic import sitemap ???
        const response = new Response(JSON.stringify(sitemap));
        response.headers.set('content-type',  'application/json; charset=utf-8');
        return Promise.resolve(response);
      }

      return fetch(input, init);
    };
    const [
variableName,
] = await Promise.all([
loadResource(customFetch, {
id: "resourceId",
name: "resourceName",
url: "https://my-json.com/",
method: "post",
headers: [
{ name: "Authorization", value: "Token " + AccessToken },
],
body: { body: true },
}),
])
return {
variableName,
} as Record<string, unknown>
}
"
`);
});

test("generate system variable and use in resources loader", () => {
  expect(
    generateResourcesLoader({
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
"import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
import { sitemap } from "./$resources.sitemap.xml";
export const loadResources = async (_props: { system: System }) => {
const system = _props.system

    const customFetch: typeof fetch = (input, init) => {
      if (typeof input !== "string") {
        return fetch(input, init);
      }

      if (isLocalResource(input, "sitemap.xml")) {
        // @todo: dynamic import sitemap ???
        const response = new Response(JSON.stringify(sitemap));
        response.headers.set('content-type',  'application/json; charset=utf-8');
        return Promise.resolve(response);
      }

      return fetch(input, init);
    };
    const [
variableName,
] = await Promise.all([
loadResource(customFetch, {
id: "resourceId",
name: "resourceName",
url: "https://my-json.com/" + system?.params?.slug,
method: "post",
headers: [
{ name: "Content-Type", value: "application/json" },
],
body: { body: true },
}),
])
return {
variableName,
} as Record<string, unknown>
}
"
`);
});

test("generate empty resources loader", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: new Map(),
      resources: new Map(),
    })
  ).toMatchInlineSnapshot(`
"import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
return {
} as Record<string, unknown>
}
"
`);
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
"import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
return {
} as Record<string, unknown>
}
"
`);
});

test("prevent generating unused system variable", () => {
  expect(
    generateResourcesLoader({
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
"import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
return {
} as Record<string, unknown>
}
"
`);
});
