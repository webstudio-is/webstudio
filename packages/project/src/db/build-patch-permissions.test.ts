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

  test("requires build permit for style edits", () => {
    expect(
      getRequiredPermitForBuildPatchTransaction(transaction("styles"))
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
});
