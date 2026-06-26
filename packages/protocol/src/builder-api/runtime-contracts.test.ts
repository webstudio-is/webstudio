import { expect, test } from "vitest";
import { runtimeOperationContracts } from "@webstudio-is/project-build/contracts/builder-runtime";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
import {
  publicApiOperationNamespaces,
  publicRuntimeOperationContracts,
} from "./runtime-contracts";

test("exposes public runtime contracts without private metadata", () => {
  expect(publicRuntimeOperationContracts).toEqual(
    runtimeOperationContracts.map(
      ({
        id,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
        retryOnConflict,
      }) => ({
        id,
        readNamespaces,
        writeNamespaces,
        invalidatesNamespaces,
        retryOnConflict,
      })
    )
  );
});

test("exposes public operation namespaces from builder namespaces", () => {
  expect(publicApiOperationNamespaces).toBe(builderNamespaces);
});
