import { describe, expect, test } from "vitest";
import { getRequiredPermitForBuildPatchTransaction } from "./build-patch-permissions";
import type { BuildPatchTransaction } from "./build-patch-core";

const transaction = (
  namespace: string,
  patches: BuildPatchTransaction["payload"][number]["patches"] = [
    { op: "replace", path: ["prop-1", "value"], value: "Title" },
  ]
): BuildPatchTransaction => ({
  id: "tx-1",
  payload: [{ namespace, patches }],
});

describe("getRequiredPermitForBuildPatchTransaction", () => {
  test("allows content prop edits with edit permit", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(transaction("props"))
    ).toBe("edit");
  });

  test("allows content block instance edits with edit permit", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(
        transaction("instances", [
          {
            op: "replace",
            path: ["instance-1", "children"],
            value: [{ type: "text", value: "Title" }],
          },
        ])
      )
    ).toBe("edit");
  });

  test("requires build permit for style edits", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(transaction("styles"))
    ).toBe("build");
  });

  test("allows editor page settings changes with edit permit", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(
        transaction("pages", [
          { op: "replace", path: ["pages", "page-1", "name"], value: "About" },
          {
            op: "replace",
            path: ["pages", "page-1", "meta", "description"],
            value: "About us",
          },
        ])
      )
    ).toBe("edit");
  });

  test("requires build permit for whole meta replacements", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(
        transaction("pages", [
          {
            op: "replace",
            path: ["pages", "page-1", "meta"],
            value: {
              description: "About us",
            },
          },
        ])
      )
    ).toBe("build");
  });

  test("requires build permit for creating pages", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(
        transaction("pages", [
          {
            op: "add",
            path: ["pages", "page-1"],
            value: {
              id: "page-1",
              name: "Landing",
              path: "/landing",
              title: "Landing",
              meta: {},
              rootInstanceId: "root-1",
            },
          },
        ])
      )
    ).toBe("build");
  });

  test("requires build permit for design edits not tied to page creation", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(
        transaction("styles", [
          {
            op: "add",
            path: ["style-1"],
            value: {
              styleSourceId: "style-source-1",
              breakpointId: "base",
              property: "color",
              value: { type: "keyword", value: "red" },
            },
          },
        ])
      )
    ).toBe("build");
  });

  test("requires build permit when any change in the transaction is design scoped", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction({
        id: "tx-1",
        payload: [
          { namespace: "props", patches: [] },
          {
            namespace: "breakpoints",
            patches: [{ op: "add", path: ["bp-1"], value: {} }],
          },
        ],
      })
    ).toBe("build");
  });

  test("requires build permit for unknown namespaces", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(transaction("unknown"))
    ).toBe("build");
  });
});
