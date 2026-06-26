import { expect, test } from "vitest";
import { publicApiOperations } from "./operations";
import { publicApiOperationDocumentation } from "./operation-docs";

test("documents every public API command with examples", () => {
  expect(publicApiOperationDocumentation.map(({ command }) => command)).toEqual(
    publicApiOperations.map(({ command }) => command)
  );

  for (const item of publicApiOperationDocumentation) {
    expect(item.description).not.toBe("");
    expect(item.examples.length).toBeGreaterThan(0);
  }
});
