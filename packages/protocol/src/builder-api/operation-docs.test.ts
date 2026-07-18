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
    expect(item.description).not.toContain("MCP/public API operation");
    expect(item.examples.length).toBeGreaterThan(0);
  }
});

test("documents update-text mode without suggesting replace", () => {
  const docs = publicApiOperationDocumentation.find(
    ({ command }) => command === "update-text"
  );

  expect(docs).toEqual(
    expect.objectContaining({
      description: expect.stringContaining(
        'mode must be "text" or "expression"'
      ),
      examples: [
        expect.stringContaining("--mode text"),
        expect.stringContaining("--mode expression"),
      ],
    })
  );
  expect(`${docs?.description}\n${docs?.examples.join("\n")}`).not.toContain(
    "--mode replace"
  );
});

test("documents direct string props for update-props", () => {
  const docs = publicApiOperationDocumentation.find(
    ({ command }) => command === "update-props"
  );

  expect(docs?.description).toContain('"name": "placeholder"');
  expect(docs?.description).toContain('"type": "string"');
});

test("documents JSX insertion through the fragment field", () => {
  const docs = publicApiOperationDocumentation.find(
    ({ command }) => command === "insert-fragment"
  );
  const text = `${docs?.description}\n${docs?.examples.join("\n")}`;

  expect(text).toContain("Webstudio JSX");
  expect(text).toContain("CLI converts the JSX string");
  expect(text).toContain('"fragment":"<ws.element ws:tag=\\"section\\" />"');
  expect(text).not.toContain("Internal low-level");
  expect(text).not.toContain("structured Webstudio fragment");
  expect(text).not.toContain('"jsx"');
});

test("documents extract-slot selector order with valid examples", () => {
  const docs = publicApiOperationDocumentation.find(
    ({ command }) => command === "extract-slot"
  );
  const operation = publicApiOperations.find(
    ({ command }) => command === "extract-slot"
  );
  const text = `${docs?.description}\n${docs?.examples.join("\n")}`;

  expect(text).toContain("leaf-to-root");
  expect(text).toContain("direct parent");
  expect(text).toContain("list-instances");
  expect(text).toContain('"instanceSelector":["header-section-id","body-id"]');
  expect(text).toContain(
    '"instanceSelector":["header-section-id","page-wrapper-id","body-id"]'
  );
  expect(JSON.stringify(operation?.inputSchema)).toContain(
    "The first id is the instance to extract, the second is its direct parent"
  );
});
