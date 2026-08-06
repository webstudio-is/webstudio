import { expect, test } from "vitest";
import type { Resource } from "./schema/resources";
import {
  getResourceDataSourceIds,
  getTransitiveResourceDataSourceIds,
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
        url: "$ws$dataSource$firstDataSource.data.url",
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
  ]);

  expect(
    getTransitiveResourceDataSourceIds({
      resourceId: "thirdResource",
      resources,
      dataSources,
    })
  ).toEqual(new Set(["secondDataSource", "firstDataSource"]));
});
