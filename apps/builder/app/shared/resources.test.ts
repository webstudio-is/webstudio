import { describe, test, expect } from "vitest";
import {
  createResourceUpsertPatchPayload,
  createResource,
  createResourceCreatePayload,
  createResourceDeletePayload,
  createResourceUpdatePayload,
  findResource,
  getResourceExpressionErrors,
  getResourceKey,
  resourceFieldsInput,
  resourceFieldsUpdateInput,
  serializeResources,
  upsertResourceMutable,
} from "./resource-utils";
import {
  encodeDataVariableId,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
  type ResourceRequest,
} from "@webstudio-is/sdk";

describe("createResource", () => {
  test("parse resource create and update inputs used by the API", () => {
    expect(
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [{ name: "page", value: '"1"' }],
        headers: [{ name: "Accept", value: '"application/json"' }],
        control: "system",
      })
    ).toEqual({
      name: "Users",
      method: "get",
      url: '"https://example.com/users"',
      searchParams: [{ name: "page", value: '"1"' }],
      headers: [{ name: "Accept", value: '"application/json"' }],
      control: "system",
    });

    expect(resourceFieldsUpdateInput.parse({ name: "Updated" })).toEqual({
      name: "Updated",
    });
  });

  test("reject invalid resource controls", () => {
    expect(() =>
      resourceFieldsInput.parse({
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [],
        headers: [],
        control: "manual",
      })
    ).toThrow();
  });

  test("creates resource values through the sdk schema", () => {
    expect(
      createResource({
        id: "resource-id",
        name: "Users",
        method: "post",
        url: '"https://example.com/users"',
        searchParams: [{ name: "page", value: '"1"' }],
        headers: [{ name: "Authorization", value: '"Bearer token"' }],
        body: '"body"',
      })
    ).toEqual({
      id: "resource-id",
      name: "Users",
      method: "post",
      url: '"https://example.com/users"',
      searchParams: [{ name: "page", value: '"1"' }],
      headers: [{ name: "Authorization", value: '"Bearer token"' }],
      body: '"body"',
    });
  });

  test("omits empty body values", () => {
    expect(
      createResource({
        id: "resource-id",
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [],
        headers: [],
        body: "",
      })
    ).toHaveProperty("body", undefined);
  });
});

describe("findResource", () => {
  test("finds resources by id", () => {
    expect(
      findResource(
        [
          {
            id: "resource-id",
            name: "Users",
            method: "get",
            url: '"https://example.com/users"',
            searchParams: [],
            headers: [],
          },
        ],
        "resource-id"
      )?.name
    ).toBe("Users");
    expect(findResource([], "missing")).toBeUndefined();
  });
});

describe("serializeResources", () => {
  test("reports resource exposure and filters by scoped data source", () => {
    const resources: Resource[] = [
      {
        id: "resource-1",
        name: "Users",
        method: "get",
        url: '"https://example.com/users"',
        searchParams: [],
        headers: [],
      },
      {
        id: "resource-2",
        name: "Posts",
        method: "post",
        url: '"https://example.com/posts"',
        searchParams: [],
        headers: [],
      },
    ];
    const dataSources: DataSource[] = [
      {
        id: "data-source-other-scope",
        scopeInstanceId: "other-box",
        name: "usersOther",
        type: "resource",
        resourceId: "resource-1",
      },
      {
        id: "data-source-1",
        scopeInstanceId: "box",
        name: "users",
        type: "resource",
        resourceId: "resource-1",
      },
    ];

    expect(serializeResources({ resources, dataSources })).toEqual({
      resources: [
        {
          id: "resource-1",
          name: "Users",
          method: "get",
          url: '"https://example.com/users"',
          scopeInstanceId: "other-box",
          exposedAsDataSource: true,
          dataSourceId: "data-source-other-scope",
        },
        {
          id: "resource-2",
          name: "Posts",
          method: "post",
          url: '"https://example.com/posts"',
          scopeInstanceId: undefined,
          exposedAsDataSource: false,
          dataSourceId: undefined,
        },
      ],
    });
    expect(
      serializeResources({ resources, dataSources, scopeInstanceId: "box" })
    ).toEqual({
      resources: [
        {
          id: "resource-1",
          name: "Users",
          method: "get",
          url: '"https://example.com/users"',
          scopeInstanceId: "box",
          exposedAsDataSource: true,
          dataSourceId: "data-source-1",
        },
      ],
    });
  });
});

describe("resource patch helpers", () => {
  const resource: Resource = {
    id: "resource",
    name: "Users",
    method: "get",
    url: '"https://example.com/users"',
    searchParams: [],
    headers: [],
  };

  test("upserts resource variables and rebinds expressions", () => {
    const body: Instance = {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "box" }],
    };
    const box: Instance = {
      type: "instance",
      id: "box",
      component: "Box",
      children: [
        { type: "expression", value: encodeDataVariableId("body-var") },
      ],
    };
    const data = {
      pages: undefined,
      instances: new Map([
        [body.id, body],
        [box.id, box],
      ]),
      props: new Map(),
      dataSources: new Map<DataSource["id"], DataSource>([
        [
          "body-var",
          {
            id: "body-var",
            scopeInstanceId: "body",
            name: "Users",
            type: "variable",
            value: { type: "string", value: "fallback" },
          },
        ],
      ]),
      resources: new Map<Resource["id"], Resource>(),
    };

    upsertResourceMutable({
      data,
      resource,
      dataSourceId: "resource-var",
      scopeInstanceId: "box",
      dataSourceName: "Users",
    });

    expect(data.resources.get("resource")).toEqual(resource);
    expect(data.dataSources.get("resource-var")).toEqual({
      id: "resource-var",
      scopeInstanceId: "box",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    });
    expect(data.instances.get("box")?.children).toEqual([
      { type: "expression", value: encodeDataVariableId("resource-var") },
    ]);
  });

  test("creates resource upsert patches from builder data", () => {
    const body: Instance = {
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "box" }],
    };
    const box: Instance = {
      type: "instance",
      id: "box",
      component: "Box",
      children: [
        { type: "expression", value: encodeDataVariableId("body-var") },
      ],
    };

    expect(
      createResourceUpsertPatchPayload({
        build: {
          pages: {
            homePageId: "page",
            rootFolderId: "root-folder",
            pages: new Map([
              [
                "page",
                {
                  id: "page",
                  name: "Home",
                  path: "",
                  title: "Home",
                  rootInstanceId: "body",
                  meta: {},
                },
              ],
            ]),
            folders: new Map([
              [
                "root-folder",
                {
                  id: "root-folder",
                  name: "Root",
                  slug: "",
                  children: ["page"],
                },
              ],
            ]),
          },
          instances: [body, box],
          props: [],
          dataSources: [
            {
              id: "body-var",
              scopeInstanceId: "body",
              name: "Users",
              type: "variable",
              value: { type: "string", value: "fallback" },
            },
          ],
          resources: [],
          breakpoints: [],
          styleSources: [],
          styleSourceSelections: [],
          styles: [],
        },
        resource,
        dataSourceId: "resource-var",
        scopeInstanceId: "box",
        dataSourceName: "Users",
      })
    ).toEqual([
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["box"],
            value: {
              ...box,
              children: [
                {
                  type: "expression",
                  value: encodeDataVariableId("resource-var"),
                },
              ],
            },
          },
        ],
      },
      {
        namespace: "dataSources",
        patches: [
          {
            op: "add",
            path: ["resource-var"],
            value: {
              id: "resource-var",
              scopeInstanceId: "box",
              name: "Users",
              type: "resource",
              resourceId: "resource",
            },
          },
        ],
      },
      {
        namespace: "resources",
        patches: [{ op: "add", path: ["resource"], value: resource }],
      },
    ]);
  });

  test("creates resource and optional data source patches", () => {
    expect(
      createResourceCreatePayload({
        resourceId: "resource",
        resource,
        resources: [],
        dataSources: [],
        dataSourceId: "data-source",
        scopeInstanceId: "box",
      })
    ).toEqual({
      payload: [
        {
          namespace: "resources",
          patches: [{ op: "add", path: ["resource"], value: resource }],
        },
        {
          namespace: "dataSources",
          patches: [
            {
              op: "add",
              path: ["data-source"],
              value: {
                id: "data-source",
                scopeInstanceId: "box",
                name: "Users",
                type: "resource",
                resourceId: "resource",
              },
            },
          ],
        },
      ],
      dataSourceId: "data-source",
      errors: [],
    });
  });

  test("reports resource create id conflicts", () => {
    expect(
      createResourceCreatePayload({
        resourceId: "resource",
        resource,
        resources: [resource],
        dataSources: [
          {
            id: "data-source",
            scopeInstanceId: "box",
            name: "Users",
            type: "resource",
            resourceId: "resource",
          },
        ],
        dataSourceId: "data-source",
        scopeInstanceId: "box",
      }).errors
    ).toEqual([
      { type: "duplicate-resource-id", resourceId: "resource" },
      { type: "duplicate-data-source-id", dataSourceId: "data-source" },
    ]);
  });

  test("creates resource update patches with data source metadata", () => {
    const dataSource: DataSource = {
      id: "data-source",
      scopeInstanceId: "box",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    };

    expect(
      createResourceUpdatePayload({
        resource,
        values: { name: "Updated" },
        dataSources: [dataSource],
        dataSourceName: "Updated source",
        scopeInstanceId: "root",
      })
    ).toEqual([
      {
        namespace: "resources",
        patches: [
          { op: "replace", path: ["resource", "name"], value: "Updated" },
        ],
      },
      {
        namespace: "dataSources",
        patches: [
          {
            op: "replace",
            path: ["data-source", "name"],
            value: "Updated source",
          },
          {
            op: "replace",
            path: ["data-source", "scopeInstanceId"],
            value: "root",
          },
        ],
      },
    ]);
  });

  test("creates resource delete payload and guards prop usages", () => {
    const prop: Prop = {
      id: "prop",
      instanceId: "box",
      name: "data",
      type: "resource",
      value: "resource",
    };
    const dataSource: DataSource = {
      id: "data-source",
      scopeInstanceId: "box",
      name: "Users",
      type: "resource",
      resourceId: "resource",
    };

    expect(
      createResourceDeletePayload({
        resource,
        props: [prop],
        dataSources: [dataSource],
      })
    ).toEqual({ payload: [], dataSourceIds: [], propIds: [], isUsed: true });

    expect(
      createResourceDeletePayload({
        resource,
        props: [prop],
        dataSources: [dataSource],
        force: true,
      })
    ).toEqual({
      payload: [
        {
          namespace: "resources",
          patches: [{ op: "remove", path: ["resource"] }],
        },
        {
          namespace: "dataSources",
          patches: [{ op: "remove", path: ["data-source"] }],
        },
        {
          namespace: "props",
          patches: [{ op: "remove", path: ["prop"] }],
        },
      ],
      dataSourceIds: ["data-source"],
      propIds: ["prop"],
      isUsed: false,
    });
  });
});

describe("getResourceExpressionErrors", () => {
  test("returns field-prefixed expression errors", () => {
    expect(
      getResourceExpressionErrors({
        url: "invalid +",
        body: "body +",
        headers: [{ name: "Authorization", value: "header +" }],
        searchParams: [{ name: "q", value: "query +" }],
      })
    ).toEqual([
      expect.stringMatching(/^url: /),
      expect.stringMatching(/^body: /),
      expect.stringMatching(/^headers\.0\.value: /),
      expect.stringMatching(/^searchParams\.0\.value: /),
    ]);
  });

  test("allows omitted optional expressions", () => {
    expect(getResourceExpressionErrors({})).toEqual([]);
  });
});

describe("getResourceKey - pure function tests", () => {
  test("generates consistent hash for same resource", () => {
    const resource: ResourceRequest = {
      name: "test",
      method: "get",
      url: "/api/test",
      searchParams: [],
      headers: [],
    };

    const key1 = getResourceKey(resource);
    const key2 = getResourceKey(resource);

    expect(key1).toBe(key2);
    expect(key1).toBeTruthy();
    expect(typeof key1).toBe("string");
  });

  test("generates different hashes for different resources", () => {
    const resource1: ResourceRequest = {
      name: "test1",
      method: "get",
      url: "/api/test1",
      searchParams: [],
      headers: [],
    };

    const resource2: ResourceRequest = {
      name: "test2",
      method: "get",
      url: "/api/test2",
      searchParams: [],
      headers: [],
    };

    const key1 = getResourceKey(resource1);
    const key2 = getResourceKey(resource2);

    expect(key1).not.toBe(key2);
  });

  test("different URLs produce different keys", () => {
    const base: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/v1/users",
      searchParams: [],
      headers: [],
    };

    const modified: ResourceRequest = {
      ...base,
      url: "/api/v2/users",
    };

    expect(getResourceKey(base)).not.toBe(getResourceKey(modified));
  });

  test("different methods produce different keys", () => {
    const base: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const modified: ResourceRequest = {
      ...base,
      method: "post",
    };

    expect(getResourceKey(base)).not.toBe(getResourceKey(modified));
  });

  test("search params affect the key", () => {
    const withoutParams: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const withParams: ResourceRequest = {
      ...withoutParams,
      searchParams: [{ name: "page", value: "1" }],
    };

    expect(getResourceKey(withoutParams)).not.toBe(getResourceKey(withParams));
  });

  test("headers affect the key", () => {
    const withoutHeaders: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const withHeaders: ResourceRequest = {
      ...withoutHeaders,
      headers: [{ name: "Authorization", value: "Bearer token" }],
    };

    expect(getResourceKey(withoutHeaders)).not.toBe(
      getResourceKey(withHeaders)
    );
  });

  test("body affects the key", () => {
    const withoutBody: ResourceRequest = {
      name: "api",
      method: "post",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const withBody: ResourceRequest = {
      ...withoutBody,
      body: JSON.stringify({ name: "John" }),
    };

    expect(getResourceKey(withoutBody)).not.toBe(getResourceKey(withBody));
  });

  test("handles resources with complex nested data", () => {
    const resource: ResourceRequest = {
      name: "complex",
      method: "post",
      url: "/api/test",
      searchParams: [
        { name: "filter", value: "active" },
        { name: "sort", value: "desc" },
      ],
      headers: [
        { name: "Content-Type", value: "application/json" },
        { name: "Authorization", value: "Bearer xyz" },
      ],
      body: JSON.stringify({ data: { nested: { value: true } } }),
    };

    const key = getResourceKey(resource);
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });

  test("order of search params matters", () => {
    const resource1: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/test",
      searchParams: [
        { name: "a", value: "1" },
        { name: "b", value: "2" },
      ],
      headers: [],
    };

    const resource2: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/test",
      searchParams: [
        { name: "b", value: "2" },
        { name: "a", value: "1" },
      ],
      headers: [],
    };

    // Order matters because we serialize the array as-is
    expect(getResourceKey(resource1)).not.toBe(getResourceKey(resource2));
  });

  test("returns empty string for invalid resource with circular reference", () => {
    const invalidResource = {
      name: "test",
      method: "get" as const,
      url: "/api/test",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get searchParams(): any {
        return [this];
      },
      headers: [],
    };

    const key = getResourceKey(invalidResource);
    expect(key).toBe("");
  });

  test("assets system resource produces consistent key", () => {
    const assetsResource: ResourceRequest = {
      name: "assets",
      method: "get",
      url: "/$resources/assets",
      searchParams: [],
      headers: [],
    };

    const key1 = getResourceKey(assetsResource);
    const key2 = getResourceKey(assetsResource);

    expect(key1).toBe(key2);
    expect(key1).toBeTruthy();
  });
});
