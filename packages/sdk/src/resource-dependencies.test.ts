import { expect, test } from "vitest";
import type { Resource } from "./schema/resources";
import { getResourceDataSourceIds } from "./resource-dependencies";

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
