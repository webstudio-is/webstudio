import type { BuilderNamespace } from "./namespaces";

export type RuntimeOperationKind = "read" | "mutation";

export type RuntimeOperationContract = {
  id: string;
  kind: RuntimeOperationKind;
  readNamespaces: readonly BuilderNamespace[];
  writeNamespaces: readonly BuilderNamespace[];
  invalidatesNamespaces: readonly BuilderNamespace[];
  retryOnConflict: boolean;
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
  "pages",
  "props",
  "styles",
  "resources",
  "dataSources",
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
  retryOnConflict: false,
});

const mutation = (
  id: string,
  {
    readNamespaces,
    writeNamespaces,
    invalidatesNamespaces = writeNamespaces,
    retryOnConflict = false,
  }: {
    readNamespaces: readonly BuilderNamespace[];
    writeNamespaces: readonly BuilderNamespace[];
    invalidatesNamespaces?: readonly BuilderNamespace[];
    retryOnConflict?: boolean;
  }
): RuntimeOperationContract => ({
  id,
  kind: "mutation",
  readNamespaces,
  writeNamespaces,
  invalidatesNamespaces,
  retryOnConflict,
});

export const runtimeOperationContracts = [
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
    retryOnConflict: true,
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
    retryOnConflict: true,
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
    writeNamespaces: treeNamespaces,
  }),
  mutation("instances.move", {
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
  }),
  mutation("instances.clone", {
    readNamespaces: treeNamespaces,
    writeNamespaces: [
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
    ],
  }),
  mutation("instances.delete", {
    readNamespaces: treeNamespaces,
    writeNamespaces: treeNamespaces,
  }),
  mutation("instances.updateProps", {
    readNamespaces: ["instances", "props"],
    writeNamespaces: ["props"],
  }),
  mutation("instances.deleteProps", {
    readNamespaces: ["instances", "props"],
    writeNamespaces: ["props", "resources"],
  }),
  mutation("instances.bindProps", {
    readNamespaces: ["instances", "props", ...dataNamespaces],
    writeNamespaces: ["props"],
  }),
  read("instances.listTexts", ["pages", "instances"]),
  mutation("instances.updateText", {
    readNamespaces: ["instances"],
    writeNamespaces: ["instances"],
    retryOnConflict: true,
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
    readNamespaces: ["pages", "instances", ...styleNamespaces],
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
  read("cssVariables.list", [...styleNamespaces, "props"]),
  mutation("cssVariables.define", {
    readNamespaces: ["pages", ...styleNamespaces],
    writeNamespaces: ["styles", "styleSources", "styleSourceSelections"],
  }),
  mutation("cssVariables.delete", {
    readNamespaces: [...styleNamespaces, "props"],
    writeNamespaces: ["styles"],
  }),
  mutation("cssVariables.rewriteRefs", {
    readNamespaces: [...styleNamespaces, "props"],
    writeNamespaces: ["styles", "props"],
  }),
  read("variables.list", ["dataSources"]),
  mutation("variables.create", {
    readNamespaces: ["dataSources", "instances"],
    writeNamespaces: ["dataSources"],
  }),
  mutation("variables.update", {
    readNamespaces: ["dataSources"],
    writeNamespaces: ["dataSources"],
    retryOnConflict: true,
  }),
  mutation("variables.delete", {
    readNamespaces: ["pages", "instances", "props", ...dataNamespaces],
    writeNamespaces: ["pages", "instances", "props", ...dataNamespaces],
  }),
  read("resources.list", dataNamespaces),
  mutation("resources.create", {
    readNamespaces: [
      "pages",
      "instances",
      "props",
      ...dataNamespaces,
      ...styleNamespaces,
      "breakpoints",
    ],
    writeNamespaces: [
      "pages",
      "instances",
      "props",
      ...dataNamespaces,
      ...styleNamespaces,
      "breakpoints",
    ],
  }),
  mutation("resources.update", {
    readNamespaces: [
      "pages",
      "instances",
      "props",
      ...dataNamespaces,
      ...styleNamespaces,
      "breakpoints",
    ],
    writeNamespaces: [
      "pages",
      "instances",
      "props",
      ...dataNamespaces,
      ...styleNamespaces,
      "breakpoints",
    ],
  }),
  mutation("resources.delete", {
    readNamespaces: [...dataNamespaces, "props"],
    writeNamespaces: [...dataNamespaces, "props"],
  }),
  read("assets.list", assetUsageNamespaces),
  read("assets.findUsage", assetUsageNamespaces),
  mutation("assets.replace", {
    readNamespaces: assetUsageNamespaces,
    writeNamespaces: ["pages", "props", "styles", "assets"],
  }),
  mutation("assets.delete", {
    readNamespaces: assetUsageNamespaces,
    writeNamespaces: ["assets"],
  }),
] as const satisfies readonly RuntimeOperationContract[];

export type RuntimeOperationId =
  (typeof runtimeOperationContracts)[number]["id"];
