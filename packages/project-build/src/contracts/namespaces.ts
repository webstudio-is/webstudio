/**
 * Builder namespaces are the durable, editable state synchronized in the CLI
 * project bundle. Mutations to these namespaces use patches so Builder history,
 * collaboration, CLI sync, and persisted build versions share one transaction
 * model.
 *
 * State that is not synchronized in the CLI project bundle does not belong in
 * this list. Account, permission, deployment, domain, and other server-owned
 * state must use a dedicated tRPC API instead of Builder patches.
 */
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
  "projectSettings",
  "marketplaceProduct",
] as const;

export type BuilderNamespace = (typeof builderNamespaces)[number];
