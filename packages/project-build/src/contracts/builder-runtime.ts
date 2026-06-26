export type BuilderNamespace =
  | "pages"
  | "instances"
  | "props"
  | "styles"
  | "styleSources"
  | "styleSourceSelections"
  | "dataSources"
  | "resources"
  | "assets"
  | "breakpoints"
  | "marketplaceProduct";

export type RuntimeOperationKind = "read" | "mutation";

export type RuntimeOperationContract = {
  id: string;
  kind: RuntimeOperationKind;
  readNamespaces: readonly BuilderNamespace[];
  writeNamespaces: readonly BuilderNamespace[];
  invalidatesNamespaces: readonly BuilderNamespace[];
};

const pageNamespaces = ["pages", "instances"] as const;
const treeNamespaces = ["pages", "instances", "props"] as const;
const styleNamespaces = [
  "styles",
  "styleSources",
  "styleSourceSelections",
] as const;
const dataNamespaces = ["dataSources", "resources"] as const;
const assetUsageNamespaces = [
  "assets",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
] as const;

const read = (
  id: string,
  readNamespaces: readonly BuilderNamespace[]
): RuntimeOperationContract => ({
  id,
  kind: "read",
  readNamespaces,
  writeNamespaces: [],
  invalidatesNamespaces: [],
});

const mutation = (
  id: string,
  {
    readNamespaces,
    writeNamespaces,
    invalidatesNamespaces = writeNamespaces,
  }: {
    readNamespaces: readonly BuilderNamespace[];
    writeNamespaces: readonly BuilderNamespace[];
    invalidatesNamespaces?: readonly BuilderNamespace[];
  }
): RuntimeOperationContract => ({
  id,
  kind: "mutation",
  readNamespaces,
  writeNamespaces,
  invalidatesNamespaces,
});

export const runtimeOperationContracts = [
  read("build.get", [
    "pages",
    "instances",
    "props",
    "styles",
    "styleSources",
    "styleSourceSelections",
    "dataSources",
    "resources",
    "assets",
    "breakpoints",
    "marketplaceProduct",
  ]),
  mutation("build.patch", {
    readNamespaces: [],
    writeNamespaces: [
      "pages",
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
      "dataSources",
      "resources",
      "assets",
      "breakpoints",
      "marketplaceProduct",
    ],
  }),
  read("pages.list", ["pages"]),
  read("pages.get", pageNamespaces),
  read("pages.getByPath", pageNamespaces),
  mutation("pages.create", {
    readNamespaces: ["pages"],
    writeNamespaces: pageNamespaces,
  }),
  mutation("pages.update", {
    readNamespaces: ["pages"],
    writeNamespaces: ["pages"],
  }),
  mutation("pages.delete", {
    readNamespaces: pageNamespaces,
    writeNamespaces: pageNamespaces,
  }),
  mutation("pages.duplicate", {
    readNamespaces: pageNamespaces,
    writeNamespaces: pageNamespaces,
  }),
  read("folders.list", ["pages"]),
  mutation("folders.create", {
    readNamespaces: ["pages"],
    writeNamespaces: ["pages"],
  }),
  mutation("folders.update", {
    readNamespaces: ["pages"],
    writeNamespaces: ["pages"],
  }),
  mutation("folders.delete", {
    readNamespaces: pageNamespaces,
    writeNamespaces: pageNamespaces,
  }),
  read("instances.list", treeNamespaces),
  read("instances.inspect", [
    "instances",
    "props",
    "styles",
    "styleSources",
    "styleSourceSelections",
  ]),
  mutation("instances.append", {
    readNamespaces: treeNamespaces,
    writeNamespaces: ["instances", "props"],
  }),
  mutation("instances.move", {
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
  }),
  mutation("instances.clone", {
    readNamespaces: treeNamespaces,
    writeNamespaces: ["instances", "props", "styles", "styleSources"],
  }),
  mutation("instances.delete", {
    readNamespaces: treeNamespaces,
    writeNamespaces: ["instances", "props", "styles", "styleSources"],
  }),
  mutation("instances.updateProps", {
    readNamespaces: ["instances", "props"],
    writeNamespaces: ["props"],
  }),
  mutation("instances.deleteProps", {
    readNamespaces: ["instances", "props"],
    writeNamespaces: ["props"],
  }),
  mutation("instances.bindProps", {
    readNamespaces: ["instances", "props", ...dataNamespaces],
    writeNamespaces: ["props"],
  }),
  read("instances.listTexts", ["pages", "instances"]),
  mutation("instances.updateText", {
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
  }),
  read("styles.getDeclarations", [
    "instances",
    ...styleNamespaces,
    "breakpoints",
  ]),
  mutation("styles.updateDeclarations", {
    readNamespaces: ["instances", ...styleNamespaces, "breakpoints"],
    writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
  }),
  mutation("styles.deleteDeclarations", {
    readNamespaces: ["instances", ...styleNamespaces],
    writeNamespaces: ["styles"],
  }),
  mutation("styles.replaceValues", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styles"],
  }),
  read("designTokens.list", styleNamespaces),
  mutation("designTokens.create", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styleSources"],
  }),
  mutation("designTokens.updateStyles", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styles", "styleSources"],
  }),
  mutation("designTokens.deleteStyles", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styles"],
  }),
  mutation("designTokens.attach", {
    readNamespaces: ["instances", ...styleNamespaces],
    writeNamespaces: ["styleSourceSelections"],
  }),
  mutation("designTokens.detach", {
    readNamespaces: ["instances", ...styleNamespaces],
    writeNamespaces: ["styleSourceSelections"],
  }),
  mutation("designTokens.extract", {
    readNamespaces: ["instances", ...styleNamespaces],
    writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
  }),
  read("cssVariables.list", styleNamespaces),
  mutation("cssVariables.define", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styleSources"],
  }),
  mutation("cssVariables.delete", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styles", "styleSources"],
  }),
  mutation("cssVariables.rewriteRefs", {
    readNamespaces: styleNamespaces,
    writeNamespaces: ["styles"],
  }),
  read("variables.list", ["dataSources"]),
  mutation("variables.create", {
    readNamespaces: ["dataSources", "instances"],
    writeNamespaces: ["dataSources"],
  }),
  mutation("variables.update", {
    readNamespaces: ["dataSources"],
    writeNamespaces: ["dataSources"],
  }),
  mutation("variables.delete", {
    readNamespaces: ["dataSources"],
    writeNamespaces: ["dataSources"],
  }),
  read("resources.list", dataNamespaces),
  mutation("resources.create", {
    readNamespaces: [...dataNamespaces, "instances"],
    writeNamespaces: dataNamespaces,
  }),
  mutation("resources.update", {
    readNamespaces: dataNamespaces,
    writeNamespaces: dataNamespaces,
  }),
  mutation("resources.delete", {
    readNamespaces: dataNamespaces,
    writeNamespaces: dataNamespaces,
  }),
  read("assets.list", ["assets"]),
  read("assets.findUsage", assetUsageNamespaces),
  mutation("assets.replace", {
    readNamespaces: assetUsageNamespaces,
    writeNamespaces: ["props", "styles", "assets"],
  }),
  mutation("assets.delete", {
    readNamespaces: assetUsageNamespaces,
    writeNamespaces: ["assets", "props", "styles"],
  }),
] as const satisfies readonly RuntimeOperationContract[];

export type RuntimeOperationId =
  (typeof runtimeOperationContracts)[number]["id"];

const runtimeOperationContractById = new Map(
  runtimeOperationContracts.map((contract) => [contract.id, contract])
);

export const getRuntimeOperationContract = (id: RuntimeOperationId) => {
  const contract = runtimeOperationContractById.get(id);
  if (contract === undefined) {
    throw new Error(`Unknown runtime operation "${id}".`);
  }
  return contract;
};
