import { expect, test } from "vitest";
import { serverOnlyRouterOperationMetadata } from "./__generated__/server-only-router-operation-metadata";
import { localOnlyOperationInputs } from "./local-operation-inputs";
import { publicApiOperations } from "./operations";
import { publicApiOperationDocumentation } from "./operation-docs";
import { publicRuntimeOperationContracts } from "./runtime-contracts";

const getSourceOperationCommands = () => [
  ...Object.values(serverOnlyRouterOperationMetadata).map(
    ({ command }) => command
  ),
  ...publicRuntimeOperationContracts.map(({ command }) => command),
  ...localOnlyOperationInputs.map(({ command }) => command),
];

const sortCommands = (commands: readonly string[]) =>
  [...commands].sort((left, right) => left.localeCompare(right));

test("documents every public API command with examples", () => {
  expect(
    sortCommands(publicApiOperationDocumentation.map(({ command }) => command))
  ).toEqual(sortCommands(getSourceOperationCommands()));

  expect(
    sortCommands(publicApiOperations.map(({ command }) => command))
  ).toEqual(sortCommands(getSourceOperationCommands()));

  expect(publicApiOperations.map(({ command }) => command)).toEqual(
    publicApiOperationDocumentation.map(({ command }) => command)
  );

  for (const item of publicApiOperationDocumentation) {
    expect(item.description).not.toBe("");
    expect(item.examples.length).toBeGreaterThan(0);
  }
});
