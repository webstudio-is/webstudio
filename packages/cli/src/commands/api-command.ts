import { readFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import { createAuthTrpcClient } from "@webstudio-is/http-client";
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  jsonToGlobalConfig,
  jsonToLocalConfig,
} from "../config";
import { isFileExists } from "../fs-utils";
import { HandledCliError } from "../errors";
import { apiCompatibilityHeaders } from "./api";
import type { CommonYargsArgv } from "./yargs-types";
import { parsePatchTransactions } from "./patch-utils";

type ApiCommandDependencies = {
  createAuthTrpcClient: typeof createAuthTrpcClient;
  isFileExists: typeof isFileExists;
  readFile: typeof readFile;
};

const defaultDependencies: ApiCommandDependencies = {
  createAuthTrpcClient,
  isFileExists,
  readFile,
};

export const apiCommandOptions = (yargs: CommonYargsArgv) =>
  yargs.option("json", {
    type: "boolean",
    describe: "Required. Print a machine-readable JSON response to stdout",
    default: false,
  });

export const snapshotCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("include", {
      type: "array",
      string: true,
      describe:
        "Comma-separated build data namespaces to include, such as pages, instances, styles, assets, resources, variables",
    })
    .option("version", {
      type: "number",
      describe:
        "Read a specific numeric dev build version instead of the latest dev build",
    })
    .example(
      "$0 snapshot --include pages,instances,styles --json",
      "Read selected build namespaces from the configured project"
    );

export const applyPatchCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("base-version", {
      type: "number",
      describe:
        "Required. Expected current build version; the write fails if the project has changed",
      demandOption: true,
    })
    .option("input", {
      type: "string",
      describe:
        "Required. JSON file containing BuildPatchTransaction[] or { transactions } generated from Builder store patches",
      demandOption: true,
    })
    .example(
      "$0 apply-patch --base-version 42 --input patch.json --json",
      "Apply Builder patch transactions with optimistic version checking"
    );

export const pageCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("page", {
    type: "string",
    describe: "Required page id",
    demandOption: true,
  });

export const pathCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("path", {
    type: "string",
    describe: "Required page path, for example /pricing",
    demandOption: true,
  });

export const instanceListCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("page", {
      type: "string",
      describe: "Limit results to a page id",
    })
    .option("path", {
      type: "string",
      describe: "Limit results to a page path, for example /pricing",
    })
    .option("root", {
      type: "string",
      describe: "Limit traversal to this root instance id",
    })
    .option("max-depth", {
      type: "number",
      describe: "Maximum descendant depth to include from the root",
    })
    .option("top-level", {
      type: "boolean",
      describe: "Only return root-level instances in the selected scope",
    })
    .option("component", {
      type: "string",
      describe: "Only return instances with this component name",
    })
    .option("tag", {
      type: "string",
      describe: "Only return instances with this HTML tag override",
    })
    .option("label", {
      type: "string",
      describe: "Only return instances whose label contains this text",
    });

export const instanceInspectCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("instance", {
      type: "string",
      describe: "Required instance id to inspect",
      demandOption: true,
    })
    .option("include", {
      type: "array",
      string: true,
      describe:
        "Comma-separated details to include: props, styles, children, bindings, sources",
    })
    .option("child-depth", {
      type: "number",
      describe: "When including children, maximum descendant depth to return",
    });

export const textListCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("page", {
      type: "string",
      describe: "Limit text nodes to a page id",
    })
    .option("path", {
      type: "string",
      describe: "Limit text nodes to a page path, for example /pricing",
    })
    .option("instance", {
      type: "string",
      describe: "Limit text nodes to one instance id",
    })
    .option("mode", {
      choices: ["text", "expression", "all"] as const,
      describe: "Return text children, expression children, or both",
    })
    .option("contains", {
      type: "string",
      describe: "Only return text nodes whose value contains this substring",
    })
    .option("max-value-length", {
      type: "number",
      describe: "Truncate returned text values to this character count",
    });

export const stylesCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("instance", {
      type: "string",
      describe: "Limit declarations to one instance id",
    })
    .option("page", {
      type: "string",
      describe: "Limit declarations to instances on this page id",
    })
    .option("path", {
      type: "string",
      describe: "Limit declarations to instances on this page path",
    })
    .option("breakpoint", {
      type: "string",
      describe: "Only return declarations for this breakpoint id",
    })
    .option("state", {
      type: "string",
      describe: "Only return declarations for this state selector",
    })
    .option("property", {
      type: "string",
      describe: "Only return declarations for this exact CSS property",
    })
    .option("property-filter", {
      type: "string",
      describe:
        "Only return declarations whose CSS property contains this text",
    })
    .option("include-tokens", {
      type: "boolean",
      describe:
        "Include token style declarations in addition to local declarations",
    });

export const designTokensCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("filter", {
      type: "string",
      describe: "Only return design tokens whose name contains this text",
    })
    .option("with-usage", {
      type: "boolean",
      describe: "Include how many instances use each design token",
    })
    .option("sort", {
      choices: ["name", "usage"] as const,
      describe: "Sort design tokens by name or usage count",
    });

export const scopedCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("scope-instance", {
    type: "string",
    describe: "Only return items scoped to this instance id",
  });

export const assetsCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("type", {
      choices: ["image", "font"] as const,
      describe: "Only return assets of this type",
    })
    .option("sort", {
      choices: ["name", "size", "createdAt", "usage"] as const,
      describe: "Sort assets by name, size, creation time, or usage count",
    })
    .option("with-usage", {
      type: "boolean",
      describe: "Include how many build references point to each asset",
    })
    .option("cursor", {
      type: "string",
      describe: "Pagination cursor returned as nextCursor by the previous call",
    })
    .option("limit", {
      type: "number",
      describe: "Maximum number of assets to return",
    });

export type ApiCommandName =
  | "whoami"
  | "inspect"
  | "snapshot"
  | "apply-patch"
  | "list-pages"
  | "get-page"
  | "get-page-by-path"
  | "list-folders"
  | "list-instances"
  | "inspect-instance"
  | "list-texts"
  | "get-styles"
  | "list-design-tokens"
  | "list-variables"
  | "list-resources"
  | "list-assets";

type ApiCommandOptions = {
  command: ApiCommandName;
  json?: boolean;
  include?: string[];
  version?: number;
  baseVersion?: number;
  input?: string;
  page?: string;
  path?: string;
  root?: string;
  maxDepth?: number;
  topLevel?: boolean;
  component?: string;
  tag?: string;
  label?: string;
  instance?: string;
  childDepth?: number;
  mode?: "text" | "expression" | "all";
  contains?: string;
  maxValueLength?: number;
  breakpoint?: string;
  state?: string;
  property?: string;
  propertyFilter?: string;
  includeTokens?: boolean;
  filter?: string;
  withUsage?: boolean;
  scopeInstance?: string;
  type?: "image" | "font";
  sort?: "name" | "usage" | "size" | "createdAt";
  cursor?: string;
  limit?: number;
};

const resolveConnection = async (dependencies: ApiCommandDependencies) => {
  if ((await dependencies.isFileExists(LOCAL_CONFIG_FILE)) === false) {
    throw new Error(
      "Local config file is not found. Run webstudio init --link <api-share-link> from a Webstudio project."
    );
  }

  const localConfig = jsonToLocalConfig(
    JSON.parse(
      await dependencies.readFile(join(cwd(), LOCAL_CONFIG_FILE), "utf-8")
    )
  );
  const globalConfig = jsonToGlobalConfig(
    JSON.parse(await dependencies.readFile(GLOBAL_CONFIG_FILE, "utf-8"))
  );
  const projectConfig = globalConfig[localConfig.projectId];
  if (projectConfig === undefined) {
    throw new Error(
      "Project config is not found. Run webstudio init --link <api-share-link>."
    );
  }

  return {
    origin: projectConfig.origin,
    authToken: projectConfig.token,
    projectId: localConfig.projectId,
  };
};

const printJson = (value: unknown) => {
  console.log(JSON.stringify(value, undefined, 2));
};

const requireOption = (value: string | undefined, name: string) => {
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const requireNumberOption = (value: number | undefined, name: string) => {
  if (value === undefined) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const listOption = (value: string[] | undefined) =>
  value?.flatMap((item) =>
    item
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  );

const readJsonFile = async (
  dependencies: ApiCommandDependencies,
  path: string | undefined,
  name: string
) => {
  if (path === undefined || path.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return JSON.parse(await dependencies.readFile(path, "utf-8")) as unknown;
};

const getTrpcErrorCode = (error: unknown) => {
  if (
    typeof error !== "object" ||
    error === null ||
    "data" in error === false
  ) {
    return;
  }
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || "code" in data === false) {
    return;
  }
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

const getErrorCode = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof SyntaxError) {
    return "INVALID_JSON";
  }
  const trpcCode = getTrpcErrorCode(error);
  if (trpcCode === "CONFLICT") {
    return "VERSION_CONFLICT";
  }
  if (trpcCode === "NOT_FOUND") {
    return "NOT_FOUND";
  }
  if (trpcCode === "UNAUTHORIZED" || trpcCode === "FORBIDDEN") {
    return "UNAUTHORIZED";
  }
  if (trpcCode === "BAD_REQUEST") {
    return "INVALID_ARGUMENT";
  }
  if (
    message.includes("Local config file") ||
    message.includes("Project config")
  ) {
    return "NOT_INITIALIZED";
  }
  if (message.includes(" is required")) {
    return "INVALID_ARGUMENT";
  }
  if (message.includes("Invalid patch JSON")) {
    return "INVALID_PATCH";
  }
  if (message.includes("version") || message.includes("CONFLICT")) {
    return "VERSION_CONFLICT";
  }
  return "API_COMMAND_FAILED";
};

const getRetryHint = (code: string) => {
  if (code === "VERSION_CONFLICT") {
    return "Run webstudio inspect --json, read the latest build, regenerate the patch, then retry apply-patch.";
  }
};

const apiQueries: Record<
  ApiCommandName,
  (
    options: ApiCommandOptions,
    projectId: string,
    dependencies: ApiCommandDependencies
  ) => Promise<{ type?: "query" | "mutation"; path: string; input?: unknown }>
> = {
  whoami: async () => ({ path: "api.auth.me" }),
  inspect: async (_options, projectId) => ({
    path: "api.projects.get",
    input: { projectId },
  }),
  snapshot: async (options, projectId) => ({
    path: "api.build.get",
    input: {
      projectId,
      include: listOption(options.include),
      version: options.version,
    },
  }),
  "apply-patch": async (options, projectId, dependencies) => {
    const patchInput = await readJsonFile(
      dependencies,
      options.input,
      "--input"
    );
    return {
      type: "mutation",
      path: "api.build.patch",
      input: {
        projectId,
        baseVersion: requireNumberOption(options.baseVersion, "--base-version"),
        transactions: parsePatchTransactions(patchInput),
      },
    };
  },
  "list-pages": async (_options, projectId) => ({
    path: "api.pages.list",
    input: { projectId },
  }),
  "get-page": async (options, projectId) => ({
    path: "api.pages.get",
    input: {
      projectId,
      pageId: requireOption(options.page, "--page"),
    },
  }),
  "get-page-by-path": async (options, projectId) => ({
    path: "api.pages.getByPath",
    input: {
      projectId,
      path: requireOption(options.path, "--path"),
    },
  }),
  "list-folders": async (_options, projectId) => ({
    path: "api.folders.list",
    input: { projectId },
  }),
  "list-instances": async (options, projectId) => ({
    path: "api.instances.list",
    input: {
      projectId,
      pageId: options.page,
      pagePath: options.path,
      rootInstanceId: options.root,
      maxDepth: options.maxDepth,
      topLevelOnly: options.topLevel,
      component: options.component,
      tag: options.tag,
      labelContains: options.label,
    },
  }),
  "inspect-instance": async (options, projectId) => ({
    path: "api.instances.inspect",
    input: {
      projectId,
      instanceId: requireOption(options.instance, "--instance"),
      include: listOption(options.include),
      childDepth: options.childDepth,
    },
  }),
  "list-texts": async (options, projectId) => ({
    path: "api.texts.list",
    input: {
      projectId,
      pageId: options.page,
      pagePath: options.path,
      instanceId: options.instance,
      mode: options.mode,
      contains: options.contains,
      maxValueLength: options.maxValueLength,
    },
  }),
  "get-styles": async (options, projectId) => ({
    path: "api.styles.getDeclarations",
    input: {
      projectId,
      instanceIds:
        options.instance === undefined ? undefined : [options.instance],
      pageId: options.page,
      pagePath: options.path,
      breakpoint: options.breakpoint,
      state: options.state,
      property: options.property,
      propertyFilter: options.propertyFilter,
      includeTokens: options.includeTokens,
    },
  }),
  "list-design-tokens": async (options, projectId) => ({
    path: "api.designTokens.list",
    input: {
      projectId,
      filter: options.filter,
      withUsage: options.withUsage,
      sort: options.sort,
    },
  }),
  "list-variables": async (options, projectId) => ({
    path: "api.variables.list",
    input: {
      projectId,
      scopeInstanceId: options.scopeInstance,
    },
  }),
  "list-resources": async (options, projectId) => ({
    path: "api.resources.list",
    input: {
      projectId,
      scopeInstanceId: options.scopeInstance,
    },
  }),
  "list-assets": async (options, projectId) => ({
    path: "api.assets.list",
    input: {
      projectId,
      type: options.type,
      sort: options.sort,
      withUsage: options.withUsage,
      cursor: options.cursor,
      limit: options.limit,
    },
  }),
};

export const apiCommand = async (
  options: ApiCommandOptions,
  dependencies = defaultDependencies
) => {
  const start = Date.now();
  let projectId: string | undefined;
  try {
    if (options.json !== true) {
      throw new Error(`${options.command} currently requires --json.`);
    }

    const connection = await resolveConnection(dependencies);
    projectId = connection.projectId;
    const client = dependencies.createAuthTrpcClient({
      origin: connection.origin,
      authToken: connection.authToken,
      headers: apiCompatibilityHeaders,
    });

    const printResult = async (
      type: "query" | "mutation",
      path: string,
      input?: unknown
    ) => {
      const data =
        input === undefined
          ? await client[type](path)
          : await client[type](path, input);
      printJson({
        ok: true,
        data,
        meta: {
          command: options.command,
          projectId: connection.projectId,
          durationMs: Date.now() - start,
        },
      });
    };

    const query = apiQueries[options.command];
    const {
      type = "query",
      path,
      input,
    } = await query(options, connection.projectId, dependencies);
    await printResult(type, path, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json === true) {
      const code = getErrorCode(error);
      printJson({
        ok: false,
        error: {
          code,
          message,
          retry: getRetryHint(code),
        },
        meta: {
          command: options.command,
          projectId,
          durationMs: Date.now() - start,
        },
      });
    } else {
      console.error(message);
    }
    throw new HandledCliError();
  }
};
