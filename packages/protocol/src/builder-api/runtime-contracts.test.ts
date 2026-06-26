import { expect, test } from "vitest";
import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { publicRuntimeOperationContracts } from "./runtime-contracts";

test("exposes public runtime contracts without private metadata", () => {
  expect(publicRuntimeOperationContracts).toEqual(
    runtimeOperationContracts.map(
      ({ id, readNamespaces, writeNamespaces, invalidatesNamespaces }) => ({
        id,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
      })
    )
  );
});
