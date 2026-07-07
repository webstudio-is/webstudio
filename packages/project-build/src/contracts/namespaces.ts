export const builderNamespaces = [
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
] as const;

export type BuilderNamespace = (typeof builderNamespaces)[number];
