import type { CommonYargsArgv } from "./yargs-types";
import {
  apiCommandOptions,
  applyPatchCommandOptions,
  assetsCommandOptions,
  designTokensCommandOptions,
  instanceInspectCommandOptions,
  instanceListCommandOptions,
  pageCommandOptions,
  pathCommandOptions,
  scopedCommandOptions,
  snapshotCommandOptions,
  stylesCommandOptions,
  textListCommandOptions,
  type ApiCommandName,
} from "./api-command";

export type ApiCommandMetadata = {
  command: ApiCommandName;
  description: string;
  trpcPath: string;
  method: "query" | "mutation";
  requiredOptions?: string[];
  options?: (yargs: CommonYargsArgv) => CommonYargsArgv;
  examples?: string[];
};

export const apiCommandMetadata: ApiCommandMetadata[] = [
  {
    command: "whoami",
    description: "Identify the configured API share-link token",
    trpcPath: "api.auth.me",
    method: "query",
    examples: ["webstudio whoami --json"],
  },
  {
    command: "inspect",
    description: "Show project metadata and latest dev build version",
    trpcPath: "api.projects.get",
    method: "query",
    examples: ["webstudio inspect --json"],
  },
  {
    command: "snapshot",
    description: "Read selected raw build namespaces",
    trpcPath: "api.build.get",
    method: "query",
    options: snapshotCommandOptions,
    examples: [
      "webstudio snapshot --include pages,instances,props,styles --json",
    ],
  },
  {
    command: "apply-patch",
    description:
      "Apply Builder build patch transactions to the configured project",
    trpcPath: "api.build.patch",
    method: "mutation",
    requiredOptions: ["base-version", "input", "json"],
    options: applyPatchCommandOptions,
    examples: [
      "webstudio apply-patch --base-version 42 --input patch.json --json",
    ],
  },
  {
    command: "list-pages",
    description: "List site pages",
    trpcPath: "api.pages.list",
    method: "query",
    examples: ["webstudio list-pages --json"],
  },
  {
    command: "get-page",
    description: "Show one page by page id",
    trpcPath: "api.pages.get",
    method: "query",
    requiredOptions: ["page", "json"],
    options: pageCommandOptions,
    examples: ["webstudio get-page --page page-id --json"],
  },
  {
    command: "get-page-by-path",
    description: "Show one page by URL path",
    trpcPath: "api.pages.getByPath",
    method: "query",
    requiredOptions: ["path", "json"],
    options: pathCommandOptions,
    examples: ["webstudio get-page-by-path --path /pricing --json"],
  },
  {
    command: "list-folders",
    description: "List page folders",
    trpcPath: "api.folders.list",
    method: "query",
    examples: ["webstudio list-folders --json"],
  },
  {
    command: "list-instances",
    description: "List element instances in the build tree",
    trpcPath: "api.instances.list",
    method: "query",
    options: instanceListCommandOptions,
    examples: ["webstudio list-instances --path / --max-depth 2 --json"],
  },
  {
    command: "inspect-instance",
    description: "Show details for one element instance",
    trpcPath: "api.instances.inspect",
    method: "query",
    requiredOptions: ["instance", "json"],
    options: instanceInspectCommandOptions,
    examples: [
      "webstudio inspect-instance --instance instance-id --include props,styles,children --json",
    ],
  },
  {
    command: "list-texts",
    description: "List text and expression children",
    trpcPath: "api.texts.list",
    method: "query",
    options: textListCommandOptions,
    examples: ["webstudio list-texts --contains headline --json"],
  },
  {
    command: "get-styles",
    description: "List style declarations",
    trpcPath: "api.styles.getDeclarations",
    method: "query",
    options: stylesCommandOptions,
    examples: ["webstudio get-styles --instance instance-id --json"],
  },
  {
    command: "list-design-tokens",
    description: "List reusable style tokens",
    trpcPath: "api.designTokens.list",
    method: "query",
    options: designTokensCommandOptions,
    examples: ["webstudio list-design-tokens --with-usage --json"],
  },
  {
    command: "list-variables",
    description: "List data variables",
    trpcPath: "api.variables.list",
    method: "query",
    options: scopedCommandOptions,
    examples: ["webstudio list-variables --json"],
  },
  {
    command: "list-resources",
    description: "List data resources",
    trpcPath: "api.resources.list",
    method: "query",
    options: scopedCommandOptions,
    examples: ["webstudio list-resources --json"],
  },
  {
    command: "list-assets",
    description: "List project assets",
    trpcPath: "api.assets.list",
    method: "query",
    options: assetsCommandOptions,
    examples: ["webstudio list-assets --type image --with-usage --json"],
  },
];

export const getApiCommandOptions = (
  metadata: ApiCommandMetadata
): ((yargs: CommonYargsArgv) => CommonYargsArgv) =>
  metadata.options ?? apiCommandOptions;
