import { expect, test } from "vitest";
import { assetQuerySourceDefinition } from "./query-source";

test("uses lowercase labels for asset filter fields and operators", () => {
  for (const item of [
    ...assetQuerySourceDefinition.fields,
    ...assetQuerySourceDefinition.operators,
  ]) {
    expect(item.label).toBe(item.label.toLowerCase());
  }
});
