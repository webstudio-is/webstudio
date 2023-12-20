import { expect, test } from "@jest/globals";
import stripIndent from "strip-indent";
import { createScope, type Page } from "@webstudio-is/sdk";
import { generateResourcesLoader } from "./resources-generator";

const clear = (input: string) =>
  stripIndent(input).trimStart().replace(/ +$/, "");

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

test("generate getjson resource loader", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: toMap([
        {
          id: "variableResourceId",
          scopeInstanceId: "body",
          type: "resource",
          name: "resourceName",
          resourceId: "resourceId",
        },
      ]),
      resources: toMap([
        {
          id: "resourceId",
          instanceId: "body",
          type: "getjson",
          url: `"https://my-json.com"`,
        },
      ]),
    })
  ).toEqual(
    clear(`
      const _getjson = async (url: string) => {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          return data;
        }
        return {
          error: await response.text()
        }
      }
      type Params = Record<string, string | undefined>
      export const loadResources = async (_props: { params: Params }) => {
      const [
      resourceName,
      ] = await Promise.all([
      _getjson("https://my-json.com"),
      ])
      return {
      resourceName,
      } as Record<string, unknown>
      }
    `)
  );
});

test("generate page params variable and use it resources", () => {
  expect(
    generateResourcesLoader({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        pathVariableId: "variableParamsId",
      } as Page,
      dataSources: toMap([
        {
          id: "variableResourceId",
          scopeInstanceId: "body",
          name: "resourceName",
          type: "resource",
          resourceId: "resourceId",
        },
        {
          id: "variableParamsId",
          scopeInstanceId: "body",
          name: "Page params",
          type: "parameter",
        },
      ]),
      resources: toMap([
        {
          id: "resourceId",
          instanceId: "body",
          type: "getjson",
          url: `"https://my-json.com/" + $ws$dataSource$variableParamsId.slug`,
        },
      ]),
    })
  ).toEqual(
    clear(`
      const _getjson = async (url: string) => {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          return data;
        }
        return {
          error: await response.text()
        }
      }
      type Params = Record<string, string | undefined>
      export const loadResources = async (_props: { params: Params }) => {
      const Pageparams = _props.params
      const [
      resourceName,
      ] = await Promise.all([
      _getjson("https://my-json.com/" + Pageparams?.slug),
      ])
      return {
      resourceName,
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
      const [
      ] = await Promise.all([
      ])
      return {
      } as Record<string, unknown>
      }
    `)
  );
});
