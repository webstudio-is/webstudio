import {
  getPublicApiOperation,
  type PublicApiOperationMethod,
  type PublicApiOperationPermit,
} from "@webstudio-is/http-client";
import type { CommonYargsArgv } from "./yargs-types";
import * as apiCommand from "./api-command";
import type { ApiCommandName } from "./api-command";

type ApiCommandMetadata = {
  command: ApiCommandName;
  description: string;
  method: PublicApiOperationMethod;
  permit: PublicApiOperationPermit;
  requiredOptions?: string[];
  options?: (yargs: CommonYargsArgv) => CommonYargsArgv;
  examples?: string[];
};

type ApiCommandCatalogEntry = Omit<ApiCommandMetadata, "method" | "permit">;

const withOperationMetadata = (
  metadata: ApiCommandCatalogEntry
): ApiCommandMetadata => {
  const operation = getPublicApiOperation(metadata.command);
  return {
    ...metadata,
    method: operation.method,
    permit: operation.permit,
  };
};

const apiCommandCatalogEntries: ApiCommandCatalogEntry[] = [
  {
    command: "whoami",
    description: "Identify the configured API share-link token",
    examples: ["webstudio whoami --json"],
  },
  {
    command: "permissions",
    description:
      "Show API, role, publish, and domain capabilities for the configured share-link token",
    examples: ["webstudio permissions --json"],
  },
  {
    command: "inspect",
    description: "Show project metadata and latest dev build version",
    examples: ["webstudio inspect --json"],
  },
  {
    command: "snapshot",
    description: "Read selected raw build namespaces",
    options: apiCommand.snapshotCommandOptions,
    examples: [
      "webstudio snapshot --include pages,instances,props,styles --json",
    ],
  },
  {
    command: "apply-patch",
    description:
      "Apply Builder build patch transactions to the configured project",
    requiredOptions: ["base-version", "input", "json"],
    options: apiCommand.applyPatchCommandOptions,
    examples: [
      "webstudio apply-patch --base-version 42 --input patch.json --json",
    ],
  },
  {
    command: "list-pages",
    description: "List site pages",
    options: apiCommand.pagesCommandOptions,
    examples: [
      "webstudio list-pages --json",
      "webstudio list-pages --include-folders --json",
    ],
  },
  {
    command: "get-page",
    description: "Show one page by page id",
    requiredOptions: ["page", "json"],
    options: apiCommand.pageCommandOptions,
    examples: ["webstudio get-page --page page-id --json"],
  },
  {
    command: "get-page-by-path",
    description: "Show one page by URL path",
    requiredOptions: ["path", "json"],
    options: apiCommand.pathCommandOptions,
    examples: ["webstudio get-page-by-path --path /pricing --json"],
  },
  {
    command: "create-page",
    description: "Create a page in the configured project",
    requiredOptions: ["name", "path", "json"],
    options: apiCommand.createPageCommandOptions,
    examples: ["webstudio create-page --name Pricing --path /pricing --json"],
  },
  {
    command: "update-page",
    description: "Update page settings and metadata",
    requiredOptions: ["page", "json"],
    options: apiCommand.updatePageCommandOptions,
    examples: [
      'webstudio update-page --page page-id --title Pricing --description "Pricing plans" --json',
    ],
  },
  {
    command: "delete-page",
    description: "Delete a page and its page content",
    requiredOptions: ["page", "json"],
    options: apiCommand.deletePageCommandOptions,
    examples: ["webstudio delete-page --page page-id --json"],
  },
  {
    command: "duplicate-page",
    description: "Duplicate a page and its page content",
    requiredOptions: ["page", "json"],
    options: apiCommand.duplicatePageCommandOptions,
    examples: [
      'webstudio duplicate-page --page page-id --name "Pricing Copy" --path /pricing-copy --json',
    ],
  },
  {
    command: "list-folders",
    description: "List page folders",
    options: apiCommand.foldersCommandOptions,
    examples: [
      "webstudio list-folders --json",
      "webstudio list-folders --include-pages --json",
    ],
  },
  {
    command: "create-folder",
    description: "Create a page folder in the configured project",
    requiredOptions: ["name", "slug", "json"],
    options: apiCommand.createFolderCommandOptions,
    examples: ["webstudio create-folder --name Blog --slug blog --json"],
  },
  {
    command: "update-folder",
    description: "Update page folder settings",
    requiredOptions: ["folder", "json"],
    options: apiCommand.updateFolderCommandOptions,
    examples: [
      "webstudio update-folder --folder folder-id --name Blog --slug blog --json",
    ],
  },
  {
    command: "delete-folder",
    description: "Delete a folder with its child folders and pages",
    requiredOptions: ["folder", "json"],
    options: apiCommand.deleteFolderCommandOptions,
    examples: ["webstudio delete-folder --folder folder-id --json"],
  },
  {
    command: "list-instances",
    description: "List element instances in the build tree",
    options: apiCommand.instanceListCommandOptions,
    examples: ["webstudio list-instances --path / --max-depth 2 --json"],
  },
  {
    command: "inspect-instance",
    description: "Show details for one element instance",
    requiredOptions: ["instance", "json"],
    options: apiCommand.instanceInspectCommandOptions,
    examples: [
      "webstudio inspect-instance --instance instance-id --include props,styles,children --json",
    ],
  },
  {
    command: "append-instance",
    description: "Append, prepend, or replace child element instances",
    requiredOptions: ["parent", "input", "json"],
    options: apiCommand.appendInstanceCommandOptions,
    examples: [
      "webstudio append-instance --parent parent-id --input children.json --json",
    ],
  },
  {
    command: "move-instance",
    description: "Move element instances to another parent or position",
    requiredOptions: ["input", "json"],
    options: apiCommand.moveInstanceCommandOptions,
    examples: ["webstudio move-instance --input moves.json --json"],
  },
  {
    command: "clone-instance",
    description: "Clone an element instance subtree",
    requiredOptions: ["source", "json"],
    options: apiCommand.cloneInstanceCommandOptions,
    examples: [
      "webstudio clone-instance --source instance-id --parent parent-id --json",
    ],
  },
  {
    command: "delete-instance",
    description: "Delete element instance subtrees",
    requiredOptions: ["instance", "json"],
    options: apiCommand.deleteInstanceCommandOptions,
    examples: ["webstudio delete-instance --instance instance-id --json"],
  },
  {
    command: "update-props",
    description:
      "Create or update element props; editor tokens are limited to content-mode props",
    requiredOptions: ["input", "json"],
    options: apiCommand.updatePropsCommandOptions,
    examples: ["webstudio update-props --input props.json --json"],
  },
  {
    command: "delete-props",
    description:
      "Delete element props by instance and prop name; editor tokens are limited to content-mode props",
    requiredOptions: ["input", "json"],
    options: apiCommand.deletePropsCommandOptions,
    examples: ["webstudio delete-props --input props.json --json"],
  },
  {
    command: "bind-props",
    description:
      "Bind element props to expressions, parameters, resources, or actions",
    requiredOptions: ["input", "json"],
    options: apiCommand.bindPropsCommandOptions,
    examples: ["webstudio bind-props --input bindings.json --json"],
  },
  {
    command: "list-texts",
    description: "List text and expression children",
    options: apiCommand.textListCommandOptions,
    examples: ["webstudio list-texts --contains headline --json"],
  },
  {
    command: "update-text",
    description:
      "Update a text or expression child on an element instance; editor tokens are limited to content-mode text",
    requiredOptions: ["instance", "child-index", "text", "json"],
    options: apiCommand.textUpdateCommandOptions,
    examples: [
      'webstudio update-text --instance instance-id --child-index 0 --text "Launch faster" --json',
    ],
  },
  {
    command: "get-styles",
    description: "List style declarations",
    options: apiCommand.stylesCommandOptions,
    examples: ["webstudio get-styles --instance instance-id --json"],
  },
  {
    command: "update-styles",
    description: "Create or update local style declarations",
    requiredOptions: ["input", "json"],
    options: apiCommand.updateStylesCommandOptions,
    examples: ["webstudio update-styles --input styles.json --json"],
  },
  {
    command: "delete-styles",
    description: "Delete local style declarations",
    requiredOptions: ["input", "json"],
    options: apiCommand.deleteStylesCommandOptions,
    examples: ["webstudio delete-styles --input styles.json --json"],
  },
  {
    command: "replace-styles",
    description: "Replace matching local style values",
    requiredOptions: ["input", "json"],
    options: apiCommand.replaceStylesCommandOptions,
    examples: ["webstudio replace-styles --input replace.json --json"],
  },
  {
    command: "list-design-tokens",
    description: "List reusable style tokens",
    options: apiCommand.designTokensCommandOptions,
    examples: ["webstudio list-design-tokens --with-usage --json"],
  },
  {
    command: "create-design-token",
    description: "Create reusable style tokens",
    requiredOptions: ["input", "json"],
    options: apiCommand.createDesignTokenCommandOptions,
    examples: ["webstudio create-design-token --input tokens.json --json"],
  },
  {
    command: "update-design-token-styles",
    description: "Create or update declarations on a reusable style token",
    requiredOptions: ["design-token", "input", "json"],
    options: apiCommand.updateDesignTokenStylesCommandOptions,
    examples: [
      "webstudio update-design-token-styles --design-token token-id --input styles.json --json",
    ],
  },
  {
    command: "delete-design-token-styles",
    description: "Delete declarations from a reusable style token",
    requiredOptions: ["design-token", "input", "json"],
    options: apiCommand.deleteDesignTokenStylesCommandOptions,
    examples: [
      "webstudio delete-design-token-styles --design-token token-id --input styles.json --json",
    ],
  },
  {
    command: "attach-design-token",
    description: "Attach a reusable style token to element instances",
    requiredOptions: ["design-token", "input", "json"],
    options: apiCommand.attachDesignTokenCommandOptions,
    examples: [
      "webstudio attach-design-token --design-token token-id --input instances.json --json",
    ],
  },
  {
    command: "detach-design-token",
    description: "Detach a reusable style token from element instances",
    requiredOptions: ["design-token", "input", "json"],
    options: apiCommand.detachDesignTokenCommandOptions,
    examples: [
      "webstudio detach-design-token --design-token token-id --input instances.json --json",
    ],
  },
  {
    command: "extract-design-token",
    description: "Create a reusable style token from local instance styles",
    requiredOptions: ["input", "json"],
    options: apiCommand.extractDesignTokenCommandOptions,
    examples: ["webstudio extract-design-token --input token.json --json"],
  },
  {
    command: "list-css-variables",
    description: "List CSS custom property definitions",
    options: apiCommand.cssVariablesCommandOptions,
    examples: ["webstudio list-css-variables --with-usage --json"],
  },
  {
    command: "define-css-variable",
    description: "Define project-level CSS custom properties",
    requiredOptions: ["input", "json"],
    options: apiCommand.defineCssVariableCommandOptions,
    examples: ["webstudio define-css-variable --input vars.json --json"],
  },
  {
    command: "delete-css-variable",
    description: "Delete CSS custom property definitions",
    requiredOptions: ["input", "confirm", "json"],
    options: apiCommand.deleteCssVariableCommandOptions,
    examples: [
      "webstudio delete-css-variable --input names.json --confirm --json",
    ],
  },
  {
    command: "rewrite-css-variable-refs",
    description: "Rewrite var() references to CSS custom properties",
    requiredOptions: ["input", "json"],
    options: apiCommand.rewriteCssVariableRefsCommandOptions,
    examples: [
      "webstudio rewrite-css-variable-refs --input variables.json --json",
    ],
  },
  {
    command: "list-variables",
    description: "List data variables",
    options: apiCommand.scopedCommandOptions,
    examples: ["webstudio list-variables --json"],
  },
  {
    command: "create-variable",
    description: "Create a data variable scoped to an element instance",
    requiredOptions: ["scope-instance", "name", "value-type", "value", "json"],
    options: apiCommand.createVariableCommandOptions,
    examples: [
      'webstudio create-variable --scope-instance body-id --name title --value-type string --value "Hello" --json',
    ],
  },
  {
    command: "update-variable",
    description: "Update a data variable name, value, or scope",
    requiredOptions: ["variable", "json"],
    options: apiCommand.updateVariableCommandOptions,
    examples: [
      "webstudio update-variable --variable variable-id --value-type json --value '{\"count\":1}' --json",
    ],
  },
  {
    command: "delete-variable",
    description: "Delete a data variable",
    requiredOptions: ["variable", "json"],
    options: apiCommand.deleteVariableCommandOptions,
    examples: ["webstudio delete-variable --variable variable-id --json"],
  },
  {
    command: "list-resources",
    description: "List data resources",
    options: apiCommand.scopedCommandOptions,
    examples: ["webstudio list-resources --json"],
  },
  {
    command: "create-resource",
    description:
      "Create a data resource and optionally expose it as a variable",
    requiredOptions: ["name", "method", "url", "json"],
    options: apiCommand.createResourceCommandOptions,
    examples: [
      'webstudio create-resource --name Posts --method get --url "\\"https://api.example.com/posts\\"" --json',
    ],
  },
  {
    command: "update-resource",
    description: "Update data resource request fields",
    requiredOptions: ["resource", "json"],
    options: apiCommand.updateResourceCommandOptions,
    examples: [
      'webstudio update-resource --resource resource-id --url "\\"https://api.example.com/posts\\"" --json',
    ],
  },
  {
    command: "delete-resource",
    description: "Delete a data resource and its exposed data variable",
    requiredOptions: ["resource", "json"],
    options: apiCommand.deleteResourceCommandOptions,
    examples: ["webstudio delete-resource --resource resource-id --json"],
  },
  {
    command: "publish",
    description:
      "Publish the configured project to staging or production. Uses the project domain by default and, for production, active verified custom domains. If local development cannot contact the deployment backend, the JSON response includes warning while still returning the local publish job id.",
    requiredOptions: ["target", "json"],
    options: apiCommand.publishCommandOptions,
    examples: [
      "webstudio publish --target production --json",
      "webstudio publish --target production --domain example.com --json",
    ],
  },
  {
    command: "list-publishes",
    description: "List production publish builds for the configured project",
    examples: ["webstudio list-publishes --json"],
  },
  {
    command: "get-publish-job",
    description:
      "Show the status and domains for a publish job returned by publish",
    requiredOptions: ["job", "json"],
    options: apiCommand.publishJobCommandOptions,
    examples: ["webstudio get-publish-job --job build-id --json"],
  },
  {
    command: "unpublish",
    description:
      "Remove staging or production deployment records for selected domains",
    requiredOptions: ["target", "confirm", "json"],
    options: apiCommand.unpublishCommandOptions,
    examples: ["webstudio unpublish --target production --confirm --json"],
  },
  {
    command: "list-domains",
    description: "List custom domains linked to the configured project",
    examples: ["webstudio list-domains --json"],
  },
  {
    command: "create-domain",
    description: "Create and link a custom domain to the configured project",
    requiredOptions: ["domain", "json"],
    options: apiCommand.createDomainCommandOptions,
    examples: ["webstudio create-domain --domain example.com --json"],
  },
  {
    command: "update-domain",
    description: "Update a linked custom domain",
    requiredOptions: ["domain-id", "json"],
    options: apiCommand.updateDomainCommandOptions,
    examples: [
      "webstudio update-domain --domain-id domain-id --domain www.example.com --json",
      "webstudio update-domain --domain-id domain-id --input domain.json --json",
    ],
  },
  {
    command: "delete-domain",
    description: "Remove a custom domain from the configured project",
    requiredOptions: ["domain-id", "confirm", "json"],
    options: apiCommand.deleteDomainCommandOptions,
    examples: [
      "webstudio delete-domain --domain-id domain-id --confirm --json",
    ],
  },
  {
    command: "verify-domain",
    description: "Verify a linked custom domain after DNS records are set",
    requiredOptions: ["domain-id", "json"],
    options: apiCommand.verifyDomainCommandOptions,
    examples: ["webstudio verify-domain --domain-id domain-id --json"],
  },
  {
    command: "list-assets",
    description: "List project assets",
    options: apiCommand.assetsCommandOptions,
    examples: ["webstudio list-assets --type image --with-usage --json"],
  },
  {
    command: "upload-asset",
    description: "Upload one local asset file from an asset descriptor",
    requiredOptions: ["input", "json"],
    options: apiCommand.uploadAssetCommandOptions,
    examples: [
      "webstudio upload-asset --input asset.json --assets-dir .webstudio/assets --json",
    ],
  },
  {
    command: "upload-assets",
    description: "Upload local asset files from asset descriptors",
    requiredOptions: ["input", "json"],
    options: apiCommand.uploadAssetsCommandOptions,
    examples: [
      "webstudio upload-assets --input assets.json --assets-dir .webstudio/assets --json",
    ],
  },
  {
    command: "find-asset-usage",
    description: "Find where an asset is referenced in the project",
    requiredOptions: ["asset", "json"],
    options: apiCommand.assetCommandOptions,
    examples: ["webstudio find-asset-usage --asset asset-id --json"],
  },
  {
    command: "replace-asset",
    description: "Replace asset references and delete the old asset",
    requiredOptions: ["from", "to", "confirm", "json"],
    options: apiCommand.replaceAssetCommandOptions,
    examples: [
      "webstudio replace-asset --from old-asset-id --to new-asset-id --confirm --json",
    ],
  },
  {
    command: "delete-asset",
    description: "Delete asset records by id or id prefix",
    requiredOptions: ["asset", "confirm", "json"],
    options: apiCommand.deleteAssetCommandOptions,
    examples: ["webstudio delete-asset --asset asset-id --confirm --json"],
  },
];

export const apiCommandCatalog = apiCommandCatalogEntries.map(
  withOperationMetadata
);

export const apiCommandMetadata = apiCommandCatalog;

export const getApiCommandOptions = (
  metadata: ApiCommandMetadata
): ((yargs: CommonYargsArgv) => CommonYargsArgv) =>
  metadata.options ?? apiCommand.apiCommandOptions;
