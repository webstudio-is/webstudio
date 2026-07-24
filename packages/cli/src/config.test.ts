import { describe, expect, test } from "vitest";
import { join } from "node:path";
import { getLocalProjectStateDirectory } from "./config";

describe("local project state directories", () => {
  test("keeps opaque project ids inside the project scope", () => {
    expect(getLocalProjectStateDirectory("/workspace", "..")).toBe(
      join("/workspace", ".webstudio", "projects", "%2E%2E")
    );
    expect(getLocalProjectStateDirectory("/workspace", "project/child")).toBe(
      join("/workspace", ".webstudio", "projects", "project%2Fchild")
    );
  });
});
