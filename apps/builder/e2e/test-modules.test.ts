import { expect, test } from "vitest";
import { getE2eTestModules } from "./test-modules";

test("discovers every e2e module and filters ownership by shard tag", () => {
  const files = [
    "pages-drag.[shard-3].e2e.ts",
    "navigator-drag.[shard-1].e2e.ts",
    "helper.ts",
  ];

  expect(getE2eTestModules(files)).toEqual([
    "./tests/navigator-drag.[shard-1].e2e.ts",
    "./tests/pages-drag.[shard-3].e2e.ts",
  ]);
  expect(getE2eTestModules(files, "shard-3")).toEqual([
    "./tests/pages-drag.[shard-3].e2e.ts",
  ]);
});
