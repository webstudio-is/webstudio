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
export const webstudioDataNamespaces = [
  "pages",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
  "dataSources",
  "resources",
  "assets",
  "assetFolders",
  "breakpoints",
] as const;

export type WebstudioDataNamespace = (typeof webstudioDataNamespaces)[number];

// Page-copy operations transfer assets but not the asset-manager folder
// hierarchy. Assets copied across projects are normalized to the root folder.
export const pageCopyNamespaces = [
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
] as const satisfies readonly WebstudioDataNamespace[];

export const builderNamespaces = [
  ...webstudioDataNamespaces,
  "projectSettings",
  "marketplaceProduct",
] as const;

export type BuilderNamespace = (typeof builderNamespaces)[number];

// Assets are persisted separately from the versioned Build row and cannot be
// restored in the same atomic transaction.
export const restorePointNamespaces = builderNamespaces.filter(
  (namespace): namespace is Exclude<BuilderNamespace, "assets"> =>
    namespace !== "assets"
);
