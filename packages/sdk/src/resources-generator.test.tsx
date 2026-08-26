import { expect, test } from "vitest";
import {
  renderData,
  $,
  expression,
  ResourceValue,
} from "@webstudio-is/template";
import type { Page } from "./schema/pages";
import { createScope } from "./scope";
import { encodeDataSourceVariable } from "./expression";
import {
  generateResources,
  replaceFormActionsWithResources,
} from "./resources-generator";
import type { DataSource } from "./schema/data-sources";

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
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const resourceName: ResourceRequest = {
        name: "resourceName",
        url: "https://my-json.com",
        searchParams: [
        ],
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("selects only Resources used by the resolved dynamic MDX candidate", () => {
  const generated = generateResources({
    scope: createScope(),
    page: { rootInstanceId: "body" } as Page,
    dataSources: toMap([
      {
        id: "selectedAsset",
        scopeInstanceId: "body",
        type: "variable",
        name: "Selected Asset",
        value: { type: "string", value: "article" },
      },
      {
        id: "articleVariable",
        scopeInstanceId: "article",
        type: "resource",
        name: "Article API",
        resourceId: "articleResource",
      },
      {
        id: "otherVariable",
        scopeInstanceId: "other",
        type: "resource",
        name: "Other API",
        resourceId: "otherResource",
      },
    ]),
    resources: toMap([
      {
        id: "articleResource",
        name: "Article API",
        url: '"https://example.com/article"',
        method: "get",
        headers: [],
      },
      {
        id: "otherResource",
        name: "Other API",
        url: '"https://example.com/other"',
        method: "get",
        headers: [],
      },
    ]),
    props: new Map(),
    contentBlockResourceSelections: [
      {
        sourceExpression: encodeDataSourceVariable("selectedAsset"),
        candidates: [
          { assetId: "article", resourceIds: ["articleResource"] },
          { assetId: "other", resourceIds: ["otherResource"] },
        ],
      },
    ],
  });

  expect(generated).toContain('if (SelectedAsset === "article")');
  expect(generated).toContain('_contentData.set("ArticleAPI", ArticleAPI)');
  expect(generated).toContain('if (SelectedAsset === "other")');
  expect(generated).toContain('_contentData.set("OtherAPI", OtherAPI)');
});

test("does not add dynamic selection inputs to ordinary Resources", () => {
  const generated = generateResources({
    scope: createScope(),
    page: { rootInstanceId: "body" } as Page,
    dataSources: toMap([
      {
        id: "sourceVariable",
        scopeInstanceId: "body",
        type: "resource",
        name: "Source",
        resourceId: "sourceResource",
      },
    ]),
    resources: toMap([
      {
        id: "sourceResource",
        name: "Source",
        url: '"https://example.com/source"',
        method: "get",
        headers: [],
      },
      {
        id: "dependentResource",
        name: "Dependent",
        url: `${encodeDataSourceVariable("sourceVariable")}.url`,
        method: "get",
        headers: [],
      },
    ]),
    props: new Map(),
  });

  expect(generated).not.toContain(" = _props.resources");
});

test("generates a configured Assets request on the standard endpoint", () => {
  const generated = generateResources({
    scope: createScope(),
    page: { rootInstanceId: "body" } as Page,
    dataSources: toMap([
      {
        id: "postsVariable",
        scopeInstanceId: "body",
        type: "resource",
        name: "Posts",
        resourceId: "postsResource",
      },
    ]),
    resources: toMap([
      {
        id: "postsResource",
        name: "Posts",
        control: "system" as const,
        url: '"/$resources/assets"',
        method: "post" as const,
        headers: [],
        body: "{ query: { where: { all: [] }, limit: 20, offset: 0 } }",
      },
    ]),
    props: new Map(),
  });

  expect(generated).toContain('url: "/$resources/assets"');
  expect(generated).not.toContain('resourceId: "postsResource"');
});

test("generate variable and use in resources loader", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
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
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      let AccessToken = "my-token"
      const resourceName: ResourceRequest = {
        name: "resourceName",
        url: "https://my-json.com/",
        searchParams: [
        ],
        method: "post",
        headers: [
          { name: "Authorization", value: "Token " + AccessToken },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("generate page system variable and use in resources loader", () => {
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
          searchParams: [],
          method: "post",
          headers: [{ name: "Content-Type", value: `"application/json"` }],
          body: `{ body: true }`,
        },
      ]),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const system = _props.system
      const resourceName: ResourceRequest = {
        name: "resourceName",
        url: "https://my-json.com/" + system?.params?.slug,
        searchParams: [
        ],
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("generate global system variable and use in resources loader", () => {
  const myResource = new ResourceValue("My Resource", {
    control: "system",
    url: expression`"https://my-json.com/" + $ws$system.params.slug`,
    method: "post",
    headers: [{ name: "Content-Type", value: expression`"application/json"` }],
    body: expression`{ body: true }`,
  });
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "bodyId",
      } as Page,
      ...renderData(
        <$.Body ws:id="bodyId" vars={expression`${myResource}`}></$.Body>
      ),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const system = _props.system
      const MyResource: ResourceRequest = {
        name: "My Resource",
        control: "system",
        url: "https://my-json.com/" + system?.params?.slug,
        searchParams: [
        ],
        method: "post",
        headers: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: { body: true },
      }
      const _data = new Map<string, ResourceRequest>([
        ["MyResource", MyResource],
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
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
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("generate resource loader with search params", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: toMap<DataSource>([
        {
          id: "variableTermId",
          scopeInstanceId: "body",
          type: "variable",
          name: "term",
          value: { type: "string", value: "my-term" },
        },
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
          method: "get",
          url: `"https://my-json.com"`,
          searchParams: [
            {
              name: "search",
              value: `$ws$dataSource$variableTermId`,
            },
          ],
          headers: [],
        },
      ]),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      let term = "my-term"
      const resourceName: ResourceRequest = {
        name: "resourceName",
        url: "https://my-json.com",
        searchParams: [
          { name: "search", value: term },
        ],
        method: "get",
        headers: [
        ],
      }
      const _data = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
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
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
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
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("generate action resource without loading a stale data source", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: {
        rootInstanceId: "body",
        systemDataSourceId: "variableParamsId",
      } as Page,
      dataSources: toMap([
        {
          id: "resourceDataSourceId",
          scopeInstanceId: "body",
          type: "resource",
          name: "resourceDataSource",
          resourceId: "resourceId",
        },
      ]),
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
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const resourceName: ResourceRequest = {
        name: "resourceName",
        url: "https://my-url.com",
        searchParams: [
        ],
        method: "post",
        headers: [
        ],
      }
      const _data = new Map<string, ResourceRequest>([
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
        ["resourceName", resourceName],
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("skip missing resource referenced by data source", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: toMap([
        {
          id: "variableResourceId",
          scopeInstanceId: "body",
          type: "resource",
          name: "missingResource",
          resourceId: "missingResourceId",
        },
      ]),
      resources: new Map(),
      props: new Map(),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("skip missing resource referenced by action prop", () => {
  expect(
    generateResources({
      scope: createScope(),
      page: { rootInstanceId: "body" } as Page,
      dataSources: new Map(),
      resources: new Map(),
      props: toMap([
        {
          id: "propId",
          instanceId: "body",
          name: "myProp",
          type: "resource",
          value: "missingResourceId",
        },
      ]),
    })
  ).toMatchInlineSnapshot(`
    "import type { System, ResourceRequest } from "@webstudio-is/sdk";
    export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
      const _data = new Map<string, ResourceRequest>([
      ])
      const _contentData = new Map<string, ResourceRequest>()
      const _action = new Map<string, ResourceRequest>([
      ])
      return { data: _data, action: _action, contentData: _contentData }
    }
    "
  `);
});

test("replace form action with resource", () => {
  const data = renderData(
    <$.Form ws:id="formId" action="https://my-url.com"></$.Form>
  );
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
        headers: [{ name: "Content-Type", value: `"application/json"` }],
        id: "formId",
        method: "post",
        name: "action",
        url: `"https://my-url.com"`,
      },
    ])
  );
});

test("ignore empty form action", () => {
  const data = renderData(<$.Form ws:id="formId" action=""></$.Form>);
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
