import { describe, expect, test } from "vitest";
import { getInputJsonSchemaMetadata } from "@webstudio-is/sdk";
import {
  runtimeOperationContracts,
  type RuntimeOperationId,
} from "./builder-runtime";
import {
  pageDraftFieldHint,
  pageExpressionFieldHint,
  pageStatusFieldHint,
  pagePathFieldHint,
} from "../runtime/pages";
import { pageDraftOutputHint } from "../runtime/output-schemas";
import { getBuilderRuntimeOperationInputSchema } from "../runtime/registry";

const knownOperationId: RuntimeOperationId = "pages.list";
void knownOperationId;
// @ts-expect-error RuntimeOperationId must stay narrowed to the catalog union.
const unknownOperationId: RuntimeOperationId = "unknown.operation";
void unknownOperationId;

const getSchemaProperties = (schema: unknown) =>
  (schema as { properties?: Record<string, unknown> }).properties ?? {};

const getSchemaItems = (schema: unknown) =>
  (schema as { items?: unknown }).items;

const expectPageStatusInputSchema = (schema: unknown) => {
  expect(schema).toMatchObject({
    description: pageStatusFieldHint,
    anyOf: expect.arrayContaining([
      expect.objectContaining({ type: "number" }),
      expect.objectContaining({ type: "string" }),
    ]),
  });
};

describe("builder runtime operation contracts", () => {
  const getContract = (id: RuntimeOperationId) => {
    const contract = runtimeOperationContracts.find(
      (contract) => contract.id === id
    );
    if (contract === undefined) {
      throw Error(`Expected ${id} contract`);
    }
    return contract;
  };

  test("has unique operation ids", () => {
    const ids = runtimeOperationContracts.map((contract) => contract.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("has unique public api commands and clients", () => {
    const commands = runtimeOperationContracts.map(
      (contract) => contract.command
    );
    const clients = runtimeOperationContracts.map(
      (contract) => contract.client
    );

    expect(new Set(commands).size).toBe(commands.length);
    expect(new Set(clients).size).toBe(clients.length);
  });

  test("marks content-mode operations with edit permit", () => {
    expect(getContract("instances.updateProps").permit).toBe("edit");
    expect(getContract("instances.deleteProps").permit).toBe("edit");
    expect(getContract("instances.updateText").permit).toBe("edit");
  });

  test("describes reads and mutations with namespace metadata", () => {
    for (const contract of runtimeOperationContracts) {
      expect(contract.readNamespaces).toBeDefined();
      expect(contract.writeNamespaces).toBeDefined();
      expect(contract.invalidatesNamespaces).toBeDefined();
      const metadata = getInputJsonSchemaMetadata(contract.inputSchema);
      for (const field of metadata.requiredInputFields) {
        expect(metadata.inputFields).toContain(field);
      }

      if (contract.kind === "read") {
        expect(contract.writeNamespaces).toEqual([]);
        expect(contract.invalidatesNamespaces).toEqual([]);
      }

      if (contract.kind === "mutation") {
        expect(
          contract.writeNamespaces.length +
            contract.invalidatesNamespaces.length
        ).toBeGreaterThan(0);
      }
    }
  });

  test("includes page list contract", () => {
    expect(
      runtimeOperationContracts.find((contract) => contract.id === "pages.list")
        ?.readNamespaces
    ).toEqual(["pages"]);
  });

  test("derives required public input fields without generated ids", () => {
    expect(
      getInputJsonSchemaMetadata(getContract("pages.create").inputSchema)
        .requiredInputFields
    ).toEqual(["name", "path"]);
    expect(
      getInputJsonSchemaMetadata(getContract("folders.create").inputSchema)
        .requiredInputFields
    ).toEqual(["name", "slug"]);
    expect(
      getInputJsonSchemaMetadata(getContract("pages.create").inputSchema)
        .requiredInputFields
    ).not.toContain("pageId");
  });

  test("describes page expression inputs in generated contracts", () => {
    const createPageInputSchema = getContract("pages.create").inputSchema;
    const createPageProperties = getSchemaProperties(createPageInputSchema);
    const createPageMetaProperties = getSchemaProperties(
      createPageProperties.meta
    );
    const createPageCustomItems = getSchemaItems(
      createPageMetaProperties.custom
    );
    const createPageCustomItemProperties = getSchemaProperties(
      createPageCustomItems
    );

    expect(createPageProperties.title).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expect(createPageMetaProperties.description).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expectPageStatusInputSchema(createPageMetaProperties.status);
    expect(createPageCustomItemProperties.content).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });

    const updatePageInputSchema = getContract("pages.update").inputSchema;
    const updatePageProperties = getSchemaProperties(updatePageInputSchema);
    const updatePageValueProperties = getSchemaProperties(
      updatePageProperties.values
    );
    const updatePageMetaProperties = getSchemaProperties(
      updatePageValueProperties.meta
    );

    expect(updatePageValueProperties.title).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expect(updatePageMetaProperties.description).toMatchObject({
      type: "string",
      description: pageExpressionFieldHint,
    });
    expectPageStatusInputSchema(updatePageMetaProperties.status);
  });

  test("normalizes fixed page metadata text before runtime operation execution", () => {
    const createPageInputSchema =
      getBuilderRuntimeOperationInputSchema("pages.create");

    expect(
      createPageInputSchema.parse({
        name: "FleetOps Design System",
        path: "/fleet-ops-design-system",
        title: "FleetOps Design System",
        meta: {
          description:
            "A realistic interface system for a fleet operations platform.",
          socialImageUrl: "https://assets.example.com/fleetops-og.png",
        },
      })
    ).toMatchObject({
      title: `"FleetOps Design System"`,
      meta: {
        description: `"A realistic interface system for a fleet operations platform."`,
        socialImageUrl: `"https://assets.example.com/fleetops-og.png"`,
      },
    });
  });

  test("describes page path inputs in generated contracts", () => {
    const createPageInputSchema = getContract("pages.create").inputSchema;
    const createPageProperties = getSchemaProperties(createPageInputSchema);

    expect(createPageProperties.path).toMatchObject({
      type: "string",
      description: pagePathFieldHint,
    });

    const updatePageInputSchema = getContract("pages.update").inputSchema;
    const updatePageProperties = getSchemaProperties(updatePageInputSchema);
    const updatePageValueProperties = getSchemaProperties(
      updatePageProperties.values
    );

    expect(updatePageValueProperties.path).toMatchObject({
      description: pagePathFieldHint,
    });
  });

  test("explains draft-page behavior in generated MCP contracts", () => {
    const updatePageInputSchema = getContract("pages.update").inputSchema;
    const updatePageProperties = getSchemaProperties(updatePageInputSchema);
    const updatePageValueProperties = getSchemaProperties(
      updatePageProperties.values
    );

    expect(updatePageValueProperties.isDraft).toMatchObject({
      type: "boolean",
      description: pageDraftFieldHint,
    });

    const listPagesOutputSchema = getContract("pages.list").outputSchema;
    const listPagesProperties = getSchemaProperties(listPagesOutputSchema);
    const listPageItems = getSchemaItems(listPagesProperties.pages);
    const listPageProperties = getSchemaProperties(listPageItems);
    expect(listPageProperties.isDraft).toMatchObject({
      type: "boolean",
      description: pageDraftOutputHint,
    });
  });

  test("loads full tree namespaces for mutations that can remove referenced records", () => {
    const namespaces = [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "styles",
      "styleSources",
      "styleSourceSelections",
    ];

    for (const id of [
      "pages.delete",
      "folders.delete",
      "instances.clone",
      "instances.delete",
    ] as const) {
      const contract = getContract(id);
      expect(contract.readNamespaces).toEqual(
        expect.arrayContaining(namespaces)
      );
      expect(contract.writeNamespaces).toEqual(
        expect.arrayContaining(namespaces)
      );
    }
  });

  test("loads full page-copy namespaces for page duplication", () => {
    const namespaces = [
      "pages",
      "assets",
      "dataSources",
      "resources",
      "instances",
      "props",
      "breakpoints",
      "styles",
      "styleSources",
      "styleSourceSelections",
    ];
    const contract = getContract("pages.duplicate");

    expect(contract.readNamespaces).toEqual(expect.arrayContaining(namespaces));
    expect(contract.writeNamespaces).toEqual(
      expect.arrayContaining(namespaces)
    );
  });
});
