import { expect, test } from "vitest";
import {
  parseStructuredAssetQueryResourceBody,
  type Resource,
} from "@webstudio-is/sdk";
import { migrateResourcesMutable } from "./resources";

const createResource = (values: Partial<Resource> = {}): Resource => ({
  id: "assets",
  name: "Assets",
  control: "system",
  method: "get",
  url: '"/$resources/assets"',
  searchParams: [],
  headers: [],
  ...values,
});

test("migrates Assets resources to the structured query contract", () => {
  const resources = new Map([["assets", createResource()]]);

  migrateResourcesMutable(resources.values());
  migrateResourcesMutable(resources.values());

  const resource = resources.get("assets");
  expect(resource).toMatchObject({
    method: "post",
    headers: [
      {
        name: "Content-Type",
        value: '"application/json"',
      },
    ],
  });
  expect(parseStructuredAssetQueryResourceBody(resource?.body)).toMatchObject({
    where: { all: [] },
    sort: [],
    limit: "1000",
    offset: "0",
    content: { mode: "none" },
  });
});

test("leaves unrelated and already migrated resources unchanged", () => {
  const external = createResource({
    id: "external",
    control: undefined,
    url: '"https://example.com/assets"',
  });
  const queried = createResource({ method: "post", body: "existing" });
  const resources = new Map([
    [external.id, external],
    [queried.id, queried],
  ]);
  const before = structuredClone(resources);

  migrateResourcesMutable(resources.values());

  expect(resources).toEqual(before);
});
