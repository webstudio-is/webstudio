import {
  publicApiOperations,
  type PublicApiOperationMethod,
  type PublicApiOperationPermit,
} from "@webstudio-is/http-client";
import type { CommonYargsArgv } from "./yargs-types";
import * as apiCommand from "./api-command";
import type { ApiCommandName } from "./api-command";

type ApiCommandOptions = (yargs: CommonYargsArgv) => CommonYargsArgv;

type ApiCommandMetadata = {
  command: ApiCommandName;
  description: string;
  method: PublicApiOperationMethod;
  permit: PublicApiOperationPermit;
  requiredOptions?: readonly string[];
  examples: readonly string[];
};

const apiCommandOptionsByCommand: Partial<
  Record<ApiCommandName, ApiCommandOptions>
> = {
  snapshot: apiCommand.snapshotCommandOptions,
  "apply-patch": apiCommand.applyPatchCommandOptions,
  "list-pages": apiCommand.pagesCommandOptions,
  "get-page": apiCommand.pageCommandOptions,
  "get-page-by-path": apiCommand.pathCommandOptions,
  "create-page": apiCommand.createPageCommandOptions,
  "update-page": apiCommand.updatePageCommandOptions,
  "delete-page": apiCommand.deletePageCommandOptions,
  "duplicate-page": apiCommand.duplicatePageCommandOptions,
  "list-folders": apiCommand.foldersCommandOptions,
  "create-folder": apiCommand.createFolderCommandOptions,
  "update-folder": apiCommand.updateFolderCommandOptions,
  "delete-folder": apiCommand.deleteFolderCommandOptions,
  "list-instances": apiCommand.instanceListCommandOptions,
  "inspect-instance": apiCommand.instanceInspectCommandOptions,
  "append-instance": apiCommand.appendInstanceCommandOptions,
  "move-instance": apiCommand.moveInstanceCommandOptions,
  "clone-instance": apiCommand.cloneInstanceCommandOptions,
  "delete-instance": apiCommand.deleteInstanceCommandOptions,
  "update-props": apiCommand.updatePropsCommandOptions,
  "delete-props": apiCommand.deletePropsCommandOptions,
  "bind-props": apiCommand.bindPropsCommandOptions,
  "list-texts": apiCommand.textListCommandOptions,
  "update-text": apiCommand.textUpdateCommandOptions,
  "get-styles": apiCommand.stylesCommandOptions,
  "update-styles": apiCommand.updateStylesCommandOptions,
  "delete-styles": apiCommand.deleteStylesCommandOptions,
  "replace-styles": apiCommand.replaceStylesCommandOptions,
  "list-design-tokens": apiCommand.designTokensCommandOptions,
  "create-design-token": apiCommand.createDesignTokenCommandOptions,
  "update-design-token-styles":
    apiCommand.updateDesignTokenStylesCommandOptions,
  "delete-design-token-styles":
    apiCommand.deleteDesignTokenStylesCommandOptions,
  "attach-design-token": apiCommand.attachDesignTokenCommandOptions,
  "detach-design-token": apiCommand.detachDesignTokenCommandOptions,
  "extract-design-token": apiCommand.extractDesignTokenCommandOptions,
  "list-css-variables": apiCommand.cssVariablesCommandOptions,
  "define-css-variable": apiCommand.defineCssVariableCommandOptions,
  "delete-css-variable": apiCommand.deleteCssVariableCommandOptions,
  "rewrite-css-variable-refs": apiCommand.rewriteCssVariableRefsCommandOptions,
  "list-variables": apiCommand.scopedCommandOptions,
  "create-variable": apiCommand.createVariableCommandOptions,
  "update-variable": apiCommand.updateVariableCommandOptions,
  "delete-variable": apiCommand.deleteVariableCommandOptions,
  "list-resources": apiCommand.scopedCommandOptions,
  "create-resource": apiCommand.createResourceCommandOptions,
  "update-resource": apiCommand.updateResourceCommandOptions,
  "delete-resource": apiCommand.deleteResourceCommandOptions,
  publish: apiCommand.publishCommandOptions,
  "get-publish-job": apiCommand.publishJobCommandOptions,
  unpublish: apiCommand.unpublishCommandOptions,
  "create-domain": apiCommand.createDomainCommandOptions,
  "update-domain": apiCommand.updateDomainCommandOptions,
  "delete-domain": apiCommand.deleteDomainCommandOptions,
  "verify-domain": apiCommand.verifyDomainCommandOptions,
  "list-assets": apiCommand.assetsCommandOptions,
  "upload-asset": apiCommand.uploadAssetCommandOptions,
  "upload-assets": apiCommand.uploadAssetsCommandOptions,
  "find-asset-usage": apiCommand.assetCommandOptions,
  "replace-asset": apiCommand.replaceAssetCommandOptions,
  "delete-asset": apiCommand.deleteAssetCommandOptions,
};

export const apiCommandCatalog = publicApiOperations.map((operation) => ({
  command: operation.command as ApiCommandName,
  description: operation.description,
  method: operation.method,
  permit: operation.permit,
  requiredOptions: operation.requiredOptions,
  examples: operation.examples,
})) satisfies ApiCommandMetadata[];

export const apiCommandMetadata = apiCommandCatalog;

export const getApiCommandOptions = (
  metadata: ApiCommandMetadata
): ApiCommandOptions =>
  apiCommandOptionsByCommand[metadata.command] ?? apiCommand.apiCommandOptions;
