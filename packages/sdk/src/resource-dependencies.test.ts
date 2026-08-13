import { expect, test } from "vitest";
import type { Resource } from "./schema/resources";
import {
  getPageResourceRootIds,
  getResourceCycleDataSourceIds,
  getResourceDataSourceIds,
  getTransitiveResourceIds,
} from "./resource-dependencies";

test("extracts unique data source dependencies from every resource expression", () => {
  const resource: Resource = {
    id: "resource",
    name: "Resource",
    method: "post",
    url: "`https://example.com/${$ws$dataSource$urlId}`",
    searchParams: [{ name: "query", value: "$ws$dataSource$queryId.value" }],
    headers: [
      { name: "authorization", value: "$ws$dataSource$tokenId" },
      { name: "duplicate", value: "$ws$dataSource$queryId.value" },
    ],
    body: `{
      value: $ws$dataSource$body__DASH__id,
      literal: "$ws$dataSource$notAnIdentifier"
    }`,
  };

  expect(getResourceDataSourceIds(resource)).toEqual(
    new Set(["urlId", "queryId", "tokenId", "body-id"])
  );
});

test("ignores malformed legacy resource expressions", () => {
  expect(
    getResourceDataSourceIds({
      id: "resource",
      name: "Resource",
      method: "get",
      url: "https://example.com/plain-url",
      headers: [],
    })
  ).toEqual(new Set());
});

test("does not load a resource used only by ignored custom metadata", () => {
  expect(
    getPageResourceRootIds({
      page: {
        rootInstanceId: "body",
        title: '"Page"',
        meta: {
          custom: [
            {
              property: " ",
              content: "$ws$dataSource$resourceDataSource.data.title",
            },
          ],
        },
      },
      instances: new Map(),
      props: new Map(),
      dataSources: new Map([
        [
          "resourceDataSource",
          {
            type: "resource",
            id: "resourceDataSource",
            name: "Resource",
            resourceId: "resource",
          },
        ],
      ]),
    })
  ).toEqual(new Set());
});

test("finds transitive resource dependencies for editor cycle prevention", () => {
  const resources = new Map<string, Resource>([
    [
      "firstResource",
      {
        id: "firstResource",
        name: "First",
        method: "get",
        url: '"/first"',
        headers: [],
      },
    ],
    [
      "secondResource",
      {
        id: "secondResource",
        name: "Second",
        method: "get",
        url: "$ws$dataSource$firstDataSource.data.url + $ws$dataSource$tokenDataSource",
        headers: [],
      },
    ],
    [
      "thirdResource",
      {
        id: "thirdResource",
        name: "Third",
        method: "get",
        url: "$ws$dataSource$secondDataSource.data.url",
        headers: [],
      },
    ],
  ]);
  const dataSources = new Map([
    [
      "firstDataSource",
      {
        type: "resource" as const,
        id: "firstDataSource",
        name: "First",
        resourceId: "firstResource",
      },
    ],
    [
      "secondDataSource",
      {
        type: "resource" as const,
        id: "secondDataSource",
        name: "Second",
        resourceId: "secondResource",
      },
    ],
    [
      "tokenDataSource",
      {
        type: "variable" as const,
        id: "tokenDataSource",
        name: "Token",
        value: { type: "string" as const, value: "secret" },
      },
    ],
  ]);

  expect(
    getTransitiveResourceIds({
      resourceId: "thirdResource",
      resources,
      dataSources,
    })
  ).toEqual(new Set(["secondResource", "firstResource"]));
});

test("prevents resource cycles through aliases of the edited resource", () => {
  const resources = new Map<string, Resource>([
    [
      "editedResource",
      {
        id: "editedResource",
        name: "Edited",
        method: "get",
        url: '"/edited"',
        headers: [],
      },
    ],
    [
      "dependentResource",
      {
        id: "dependentResource",
        name: "Dependent",
        method: "get",
        url: "$ws$dataSource$editedAlias.data.url",
        headers: [],
      },
    ],
  ]);
  const resourceDataSource = {
    type: "resource" as const,
    id: "editedDataSource",
    name: "Edited",
    resourceId: "editedResource",
  };
  const dataSources = new Map([
    [resourceDataSource.id, resourceDataSource],
    [
      "editedAlias",
      {
        type: "resource" as const,
        id: "editedAlias",
        name: "Edited alias",
        resourceId: "editedResource",
      },
    ],
    [
      "dependentDataSource",
      {
        type: "resource" as const,
        id: "dependentDataSource",
        name: "Dependent",
        resourceId: "dependentResource",
      },
    ],
  ]);

  expect(
    getResourceCycleDataSourceIds({
      resourceDataSource,
      resources,
      dataSources,
    })
  ).toEqual(
    new Set(["editedDataSource", "editedAlias", "dependentDataSource"])
  );
});
