import { publicApiOperationDocumentation } from "./operation-docs";
import {
  publicRuntimeOperationContracts,
  type PublicApiOperationNamespace,
} from "./runtime-contracts";
export type { PublicApiOperationNamespace } from "./runtime-contracts";

export type PublicApiOperationMethod = "query" | "mutation";
export type PublicApiOperationPermit =
  | "api"
  | "view"
  | "build"
  | "edit"
  | "admin";

type PublicApiOperationInput = {
  command: string;
  id: string;
  method: PublicApiOperationMethod;
  path?: string;
  client: string;
  permit?: PublicApiOperationPermit;
};

export type PublicApiOperation = Omit<PublicApiOperationInput, "permit"> & {
  permit: PublicApiOperationPermit;
  description: string;
  requiredOptions?: readonly string[];
  examples: readonly string[];
  localCapable: boolean;
  serverOnly: boolean;
  runtimeOperationId?: string;
  readNamespaces: readonly PublicApiOperationNamespace[];
  writeNamespaces: readonly PublicApiOperationNamespace[];
  invalidatesNamespaces: readonly PublicApiOperationNamespace[];
};

const runtimeOperationById = new Map(
  publicRuntimeOperationContracts.map((contract) => [contract.id, contract])
);
const documentationByCommand = new Map(
  publicApiOperationDocumentation.map((documentation) => [
    documentation.command,
    documentation,
  ])
);

const isRuntimeOperationId = (id: string) => runtimeOperationById.has(id);

const withDefaultPermit = (
  operation: PublicApiOperationInput
): PublicApiOperation => {
  const documentation = documentationByCommand.get(operation.command);
  if (documentation === undefined) {
    throw new Error(
      `Missing public API operation documentation for "${operation.command}".`
    );
  }
  const runtimeOperationId = isRuntimeOperationId(operation.id)
    ? operation.id
    : undefined;
  const runtimeOperation =
    runtimeOperationId === undefined
      ? undefined
      : runtimeOperationById.get(runtimeOperationId);
  return {
    ...operation,
    permit:
      operation.permit ?? (operation.method === "query" ? "view" : "build"),
    description: documentation.description,
    requiredOptions: documentation.requiredOptions,
    examples: documentation.examples,
    localCapable: runtimeOperation !== undefined,
    serverOnly: runtimeOperation === undefined,
    runtimeOperationId,
    readNamespaces: runtimeOperation?.readNamespaces ?? [],
    writeNamespaces: runtimeOperation?.writeNamespaces ?? [],
    invalidatesNamespaces: runtimeOperation?.invalidatesNamespaces ?? [],
  };
};

const publicApiOperationInputs = [
  {
    command: "whoami",
    id: "auth.me",
    method: "query",
    path: "api.auth.me",
    client: "getApiTokenInfo",
    permit: "view",
  },
  {
    command: "permissions",
    id: "projects.permissions",
    method: "query",
    path: "api.projects.permissions",
    client: "getProjectPermissions",
  },
  {
    command: "inspect",
    id: "projects.get",
    method: "query",
    path: "api.projects.get",
    client: "getProjectInfo",
  },
  {
    command: "snapshot",
    id: "build.get",
    method: "query",
    path: "api.build.get",
    client: "getBuildSnapshot",
  },
  {
    command: "apply-patch",
    id: "build.patch",
    method: "mutation",
    path: "api.build.patch",
    client: "applyBuildPatch",
  },
  {
    command: "list-pages",
    id: "pages.list",
    method: "query",
    path: "api.pages.list",
    client: "listPages",
  },
  {
    command: "get-page",
    id: "pages.get",
    method: "query",
    path: "api.pages.get",
    client: "getPage",
  },
  {
    command: "get-page-by-path",
    id: "pages.getByPath",
    method: "query",
    path: "api.pages.getByPath",
    client: "getPageByPath",
  },
  {
    command: "create-page",
    id: "pages.create",
    method: "mutation",
    path: "api.pages.create",
    client: "createPage",
  },
  {
    command: "update-page",
    id: "pages.update",
    method: "mutation",
    path: "api.pages.update",
    client: "updatePage",
  },
  {
    command: "delete-page",
    id: "pages.delete",
    method: "mutation",
    path: "api.pages.delete",
    client: "deletePage",
  },
  {
    command: "duplicate-page",
    id: "pages.duplicate",
    method: "mutation",
    path: "api.pages.duplicate",
    client: "duplicatePage",
  },
  {
    command: "list-folders",
    id: "folders.list",
    method: "query",
    path: "api.folders.list",
    client: "listFolders",
  },
  {
    command: "create-folder",
    id: "folders.create",
    method: "mutation",
    path: "api.folders.create",
    client: "createFolder",
  },
  {
    command: "update-folder",
    id: "folders.update",
    method: "mutation",
    path: "api.folders.update",
    client: "updateFolder",
  },
  {
    command: "delete-folder",
    id: "folders.delete",
    method: "mutation",
    path: "api.folders.delete",
    client: "deleteFolder",
  },
  {
    command: "list-instances",
    id: "instances.list",
    method: "query",
    path: "api.instances.list",
    client: "listInstances",
  },
  {
    command: "inspect-instance",
    id: "instances.inspect",
    method: "query",
    path: "api.instances.inspect",
    client: "inspectInstance",
  },
  {
    command: "append-instance",
    id: "instances.append",
    method: "mutation",
    path: "api.instances.append",
    client: "appendInstance",
  },
  {
    command: "move-instance",
    id: "instances.move",
    method: "mutation",
    path: "api.instances.move",
    client: "moveInstance",
  },
  {
    command: "clone-instance",
    id: "instances.clone",
    method: "mutation",
    path: "api.instances.clone",
    client: "cloneInstance",
  },
  {
    command: "delete-instance",
    id: "instances.delete",
    method: "mutation",
    path: "api.instances.delete",
    client: "deleteInstance",
  },
  {
    command: "update-props",
    id: "instances.updateProps",
    method: "mutation",
    path: "api.instances.updateProps",
    client: "updateProps",
    permit: "edit",
  },
  {
    command: "delete-props",
    id: "instances.deleteProps",
    method: "mutation",
    path: "api.instances.deleteProps",
    client: "deleteProps",
    permit: "edit",
  },
  {
    command: "bind-props",
    id: "instances.bindProps",
    method: "mutation",
    path: "api.instances.bindProps",
    client: "bindProps",
  },
  {
    command: "list-texts",
    id: "instances.listTexts",
    method: "query",
    path: "api.instances.listTexts",
    client: "listTexts",
  },
  {
    command: "update-text",
    id: "instances.updateText",
    method: "mutation",
    path: "api.instances.updateText",
    client: "updateText",
    permit: "edit",
  },
  {
    command: "get-styles",
    id: "styles.getDeclarations",
    method: "query",
    path: "api.styles.getDeclarations",
    client: "getStyleDeclarations",
  },
  {
    command: "update-styles",
    id: "styles.updateDeclarations",
    method: "mutation",
    path: "api.styles.updateDeclarations",
    client: "updateStyleDeclarations",
  },
  {
    command: "delete-styles",
    id: "styles.deleteDeclarations",
    method: "mutation",
    path: "api.styles.deleteDeclarations",
    client: "deleteStyleDeclarations",
  },
  {
    command: "replace-styles",
    id: "styles.replaceValues",
    method: "mutation",
    path: "api.styles.replaceValues",
    client: "replaceStyleValues",
  },
  {
    command: "list-design-tokens",
    id: "designTokens.list",
    method: "query",
    path: "api.designTokens.list",
    client: "listDesignTokens",
  },
  {
    command: "create-design-token",
    id: "designTokens.create",
    method: "mutation",
    path: "api.designTokens.create",
    client: "createDesignTokens",
  },
  {
    command: "update-design-token-styles",
    id: "designTokens.updateStyles",
    method: "mutation",
    path: "api.designTokens.updateStyles",
    client: "updateDesignTokenStyles",
  },
  {
    command: "delete-design-token-styles",
    id: "designTokens.deleteStyles",
    method: "mutation",
    path: "api.designTokens.deleteStyles",
    client: "deleteDesignTokenStyles",
  },
  {
    command: "attach-design-token",
    id: "designTokens.attach",
    method: "mutation",
    path: "api.designTokens.attach",
    client: "attachDesignToken",
  },
  {
    command: "detach-design-token",
    id: "designTokens.detach",
    method: "mutation",
    path: "api.designTokens.detach",
    client: "detachDesignToken",
  },
  {
    command: "extract-design-token",
    id: "designTokens.extract",
    method: "mutation",
    path: "api.designTokens.extract",
    client: "extractDesignToken",
  },
  {
    command: "list-css-variables",
    id: "cssVariables.list",
    method: "query",
    path: "api.cssVariables.list",
    client: "listCssVariables",
  },
  {
    command: "define-css-variable",
    id: "cssVariables.define",
    method: "mutation",
    path: "api.cssVariables.define",
    client: "defineCssVariables",
  },
  {
    command: "delete-css-variable",
    id: "cssVariables.delete",
    method: "mutation",
    path: "api.cssVariables.delete",
    client: "deleteCssVariables",
  },
  {
    command: "rewrite-css-variable-refs",
    id: "cssVariables.rewriteRefs",
    method: "mutation",
    path: "api.cssVariables.rewriteRefs",
    client: "rewriteCssVariableRefs",
  },
  {
    command: "list-variables",
    id: "variables.list",
    method: "query",
    path: "api.variables.list",
    client: "listVariables",
  },
  {
    command: "create-variable",
    id: "variables.create",
    method: "mutation",
    path: "api.variables.create",
    client: "createVariable",
  },
  {
    command: "update-variable",
    id: "variables.update",
    method: "mutation",
    path: "api.variables.update",
    client: "updateVariable",
  },
  {
    command: "delete-variable",
    id: "variables.delete",
    method: "mutation",
    path: "api.variables.delete",
    client: "deleteVariable",
  },
  {
    command: "list-resources",
    id: "resources.list",
    method: "query",
    path: "api.resources.list",
    client: "listResources",
  },
  {
    command: "create-resource",
    id: "resources.create",
    method: "mutation",
    path: "api.resources.create",
    client: "createResource",
  },
  {
    command: "update-resource",
    id: "resources.update",
    method: "mutation",
    path: "api.resources.update",
    client: "updateResource",
  },
  {
    command: "delete-resource",
    id: "resources.delete",
    method: "mutation",
    path: "api.resources.delete",
    client: "deleteResource",
  },
  {
    command: "publish",
    id: "publish.create",
    method: "mutation",
    path: "api.publish.create",
    client: "publish",
    permit: "edit",
  },
  {
    command: "list-publishes",
    id: "publish.list",
    method: "query",
    path: "api.publish.list",
    client: "listPublishes",
  },
  {
    command: "get-publish-job",
    id: "publish.getJob",
    method: "query",
    path: "api.publish.getJob",
    client: "getPublishJob",
  },
  {
    command: "unpublish",
    id: "publish.unpublish",
    method: "mutation",
    path: "api.publish.unpublish",
    client: "unpublish",
    permit: "edit",
  },
  {
    command: "list-domains",
    id: "domains.list",
    method: "query",
    path: "api.domains.list",
    client: "listDomains",
  },
  {
    command: "create-domain",
    id: "domains.create",
    method: "mutation",
    path: "api.domains.create",
    client: "createDomain",
    permit: "admin",
  },
  {
    command: "update-domain",
    id: "domains.update",
    method: "mutation",
    path: "api.domains.update",
    client: "updateDomain",
    permit: "admin",
  },
  {
    command: "delete-domain",
    id: "domains.delete",
    method: "mutation",
    path: "api.domains.delete",
    client: "deleteDomain",
    permit: "admin",
  },
  {
    command: "verify-domain",
    id: "domains.verify",
    method: "mutation",
    path: "api.domains.verify",
    client: "verifyDomain",
    permit: "admin",
  },
  {
    command: "list-assets",
    id: "assets.list",
    method: "query",
    path: "api.assets.list",
    client: "listAssets",
  },
  {
    command: "upload-asset",
    id: "assets.upload",
    method: "mutation",
    client: "uploadProjectAsset",
  },
  {
    command: "upload-assets",
    id: "assets.uploadMany",
    method: "mutation",
    client: "uploadProjectAssets",
  },
  {
    command: "find-asset-usage",
    id: "assets.findUsage",
    method: "query",
    path: "api.assets.findUsage",
    client: "findAssetUsage",
  },
  {
    command: "replace-asset",
    id: "assets.replace",
    method: "mutation",
    path: "api.assets.replace",
    client: "replaceAsset",
  },
  {
    command: "delete-asset",
    id: "assets.delete",
    method: "mutation",
    path: "api.assets.delete",
    client: "deleteAssets",
  },
] as const satisfies readonly PublicApiOperationInput[];

export const publicApiOperations =
  publicApiOperationInputs.map(withDefaultPermit);

export type PublicApiCommand =
  (typeof publicApiOperationInputs)[number]["command"];

const publicApiOperationByCommand = new Map(
  publicApiOperations.map((operation) => [operation.command, operation])
);

export const getPublicApiOperation = (command: PublicApiCommand) => {
  const operation = publicApiOperationByCommand.get(command);
  if (operation === undefined) {
    throw new Error(`Unknown public API operation "${command}".`);
  }
  return operation;
};

export const getPublicApiOperationPath = (command: PublicApiCommand) => {
  const operation = getPublicApiOperation(command);
  const path = "path" in operation ? operation.path : undefined;
  if (path === undefined) {
    throw new Error(`Public API operation "${command}" has no tRPC path.`);
  }
  return path;
};
