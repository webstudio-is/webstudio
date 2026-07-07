import {
  publicApiOperations,
  type PublicApiOperationMethod,
  type PublicApiOperationPermit,
} from "@webstudio-is/protocol";
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

export type CliCommandMetadata = ApiCommandMetadata & {
  cliCommand: string;
  operation: ApiCommandName;
};

export const cliCommandGroupMetadata = [
  {
    command: "publish",
    description: "Publish, unpublish, and inspect publish jobs",
    examples: ["webstudio publish --help"],
  },
  {
    command: "domains",
    description: "List and manage custom domains",
    examples: ["webstudio domains --help"],
  },
] as const;

export const topLevelCliCommandMetadata = [
  {
    command: "init",
    description:
      "Create/link a Webstudio project; with --link, stores the configured project id, origin, and token",
    examples: ["webstudio init --link <api-share-link> --json"],
  },
  {
    command: "link",
    description: "Link the current directory to one Builder share link",
    examples: ["webstudio link --link <api-share-link>"],
  },
  {
    command: "sync",
    description:
      "Download the configured project bundle and asset files into .webstudio",
    examples: ["webstudio sync"],
  },
  {
    command: "import",
    description:
      "Import the synced .webstudio/data.json project bundle into a destination project",
    examples: ["webstudio import --to <destination-share-link>"],
  },
  {
    command: "build",
    description: "Build the synced project with the selected template",
    examples: ["webstudio build --template ssg"],
  },
  {
    command: "preview",
    description:
      "Regenerate project files and run the generated project dev server for visual verification; dependencies must already be installed",
    examples: ["webstudio preview --template ssg --port 5173"],
  },
  {
    command: "screenshot",
    description:
      "Capture a PNG screenshot of a URL with an installed Chromium-family browser",
    examples: [
      'webstudio screenshot "https://example.com" --output current.png --width 1440 --height 900',
    ],
  },
  {
    command: "permissions",
    description:
      "Show API, role, publish, and domain capabilities for the configured share-link token",
    examples: ["webstudio permissions --json"],
  },
  ...cliCommandGroupMetadata,
  {
    command: "schema",
    description: "Print machine-readable API command and patch schemas",
    examples: ["webstudio schema api --json"],
  },
  {
    command: "man",
    description: "Print human and LLM manuals for CLI/API/MCP workflows",
    examples: [
      "webstudio man api",
      "webstudio man llm --json",
      "webstudio man mcp",
    ],
  },
  {
    command: "mcp",
    description: "Run an MCP server over stdio for the configured project",
    examples: ["webstudio mcp"],
  },
] as const;

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
  "get-project-settings": apiCommand.projectSettingsCommandOptions,
  "update-project-settings": apiCommand.updateProjectSettingsCommandOptions,
  "list-redirects": apiCommand.projectSettingsCommandOptions,
  "create-redirect": apiCommand.createRedirectCommandOptions,
  "update-redirect": apiCommand.updateRedirectCommandOptions,
  "delete-redirect": apiCommand.deleteRedirectCommandOptions,
  "list-breakpoints": apiCommand.breakpointCommandOptions,
  "create-breakpoint": apiCommand.createBreakpointCommandOptions,
  "update-breakpoint": apiCommand.updateBreakpointCommandOptions,
  "delete-breakpoint": apiCommand.deleteBreakpointCommandOptions,
  "delete-page": apiCommand.deletePageCommandOptions,
  "duplicate-page": apiCommand.duplicatePageCommandOptions,
  "list-page-templates": apiCommand.listPageTemplatesCommandOptions,
  "create-page-from-template": apiCommand.createPageFromTemplateCommandOptions,
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

export const apiCommandMetadata = publicApiOperations.map((operation) => ({
  command: operation.command,
  description: operation.description,
  method: operation.method,
  permit: operation.permit,
  requiredOptions: operation.requiredOptions,
  examples: operation.examples,
})) satisfies ApiCommandMetadata[];

export const highLevelCliCommands = [
  { command: "permissions", operation: "permissions" },
  { command: "publish deploy", operation: "publish" },
  { command: "publish list", operation: "list-publishes" },
  { command: "publish status", operation: "get-publish-job" },
  { command: "publish unpublish", operation: "unpublish" },
  { command: "domains list", operation: "list-domains" },
  { command: "domains create", operation: "create-domain" },
  { command: "domains update", operation: "update-domain" },
  { command: "domains delete", operation: "delete-domain" },
  { command: "domains verify", operation: "verify-domain" },
] as const satisfies readonly {
  command: string;
  operation: ApiCommandName;
}[];

export const highLevelApiCommands = highLevelCliCommands.map(
  ({ operation }) => operation
) satisfies readonly ApiCommandName[];

const highLevelApiCommandSet = new Set<ApiCommandName>(highLevelApiCommands);

const topLevelCliCommandSet = new Set<string>(
  topLevelCliCommandMetadata.map(({ command }) => command)
);

const highLevelCliCommandByOperation = new Map<ApiCommandName, string>(
  highLevelCliCommands.map(({ command, operation }) => [operation, command])
);
const highLevelCliCommandSet = new Set<string>(
  highLevelCliCommands.map(({ command }) => command)
);

export const cliApiCommandMetadata = apiCommandMetadata.filter((metadata) =>
  highLevelApiCommandSet.has(metadata.command)
);

export const cliCommandMetadata = highLevelCliCommands.map(
  ({ command, operation }) => {
    const metadata = apiCommandMetadata.find(
      (metadata) => metadata.command === operation
    );
    if (metadata === undefined) {
      throw new Error(`Missing API command metadata for "${operation}".`);
    }
    return {
      ...metadata,
      cliCommand: command,
      operation,
    };
  }
) satisfies CliCommandMetadata[];

export const mcpOnlyApiCommandMetadata = apiCommandMetadata.filter(
  (metadata) => highLevelApiCommandSet.has(metadata.command) === false
);

export const formatApiUseCaseCommand = (command: string) => {
  const match = command.match(/^webstudio ([a-z-]+)(.*)$/);
  if (match === null) {
    return command;
  }
  const [, name, rest = ""] = match;
  const detail = rest.trim();
  if (
    topLevelCliCommandSet.has(name) &&
    (detail.length === 0 || detail === "--help" || detail === "-h")
  ) {
    return command;
  }
  const existingGroupedCommand = `${name} ${detail.split(/\s+/)[0] ?? ""}`;
  if (highLevelCliCommandSet.has(existingGroupedCommand)) {
    return command;
  }
  const cliCommand = highLevelCliCommandByOperation.get(name as ApiCommandName);
  if (cliCommand !== undefined && cliCommand !== name) {
    return `webstudio ${cliCommand}${rest}`;
  }
  if (topLevelCliCommandSet.has(name)) {
    return command;
  }
  return `MCP tool: ${name} {}`;
};

export const getApiCommandOptions = (
  metadata: ApiCommandMetadata
): ApiCommandOptions =>
  apiCommandOptionsByCommand[metadata.command] ?? apiCommand.apiCommandOptions;
