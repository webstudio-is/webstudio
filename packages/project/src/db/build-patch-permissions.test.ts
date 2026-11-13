import { describe, expect, test } from "vitest";
import { getRequiredPermitForBuildPatchTransaction } from "./build-patch-permissions";
import type { BuildPatchTransaction } from "./build-patch-core";
import { getContentModeCapabilities } from "@webstudio-is/project-build/runtime";

const transaction = (
  namespace: string,
  patches: BuildPatchTransaction["payload"][number]["patches"] = [
    { op: "replace", path: ["prop-1", "value"], value: "Title" },
  ]
): BuildPatchTransaction => ({
  id: "tx-1",
  payload: [{ namespace, patches }],
});

const capabilities = getContentModeCapabilities({
  instances: new Map([
    [
      "instance-1",
      {
        id: "instance-1",
        type: "instance",
        component: "Heading",
        children: [],
      },
    ],
  ]),
  metas: new Map([
    [
      "Heading",
      {
        props: {
          title: {
            type: "string",
            control: "text",
            required: false,
            contentMode: true,
          },
        },
      },
    ],
  ]),
  props: new Map([
    [
      "prop-1",
      {
        id: "prop-1",
        instanceId: "instance-1",
        name: "title",
        type: "string",
        value: "Old title",
      },
    ],
  ]),
  styleSources: new Map(),
  contentRootIds: new Set(["instance-1"]),
});

const permit = (buildPatchTransaction: BuildPatchTransaction) =>
  getRequiredPermitForBuildPatchTransaction(
    buildPatchTransaction,
    capabilities
  );

describe("getRequiredPermitForBuildPatchTransaction", () => {
  test("returns edit permit for content mode transactions", () => {
    expect(permit(transaction("props"))).toBe("edit");
  });

  test("returns build permit for transactions outside content mode", () => {
    expect(permit(transaction("styles"))).toBe("build");
  });
});
