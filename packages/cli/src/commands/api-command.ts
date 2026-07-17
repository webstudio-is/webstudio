import { readFile } from "node:fs/promises";
import * as httpClient from "@webstudio-is/http-client";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { PageRedirect } from "@webstudio-is/sdk";
import { isFileExists } from "../fs-utils";
import { HandledCliError } from "../errors";
import {
  createLocalUploadAssetInput,
  createLocalUploadAssetsInput,
  LOCAL_ASSETS_DIR,
} from "../asset-files";
import {
  createCliProjectSession,
  getCliServerApiContract,
} from "../project-session";
import {
  getCliErrorIssues,
  getCliErrorMessage,
  getCliErrorSummary,
  getStableErrorCode,
  isMissingApiAccessError,
} from "../error-codes";
import { printJson } from "../json-output";
import {
  executeProjectSessionApiOperation,
  getProjectSessionMeta,
  isProjectSessionEnvelope,
  type ProjectSessionApiCommand,
} from "../project-session-api";
import { resolveApiConnection, type ApiConnection } from "../api-connection";
import { apiCompatibilityHeaders } from "./api";
import type { CommonYargsArgv } from "./yargs-types";

const apiCommandHttpClient = httpClient;

type ApiCommandDependencies = typeof apiCommandHttpClient & {
  isFileExists: typeof isFileExists;
  readFile: typeof readFile;
  createCliProjectSession: typeof createCliProjectSession;
  getServerApiContract: typeof getCliServerApiContract;
};

const defaultDependencies: ApiCommandDependencies = {
  ...apiCommandHttpClient,
  isFileExists,
  readFile,
  createCliProjectSession,
  getServerApiContract: getCliServerApiContract,
};

export type ApiCommandName = ProjectSessionApiCommand;

let activeApiCommandDryRun = false;
let activeApiCommandRefresh = false;

export const apiCommandOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("json", {
      type: "boolean",
      describe: "Required. Print a machine-readable JSON response to stdout",
      default: false,
    })
    .option("dry-run", {
      type: "boolean",
      describe:
        "Plan a local-capable mutation and return the patch without committing it. Not supported for server-only operations.",
    })
    .option("refresh", {
      type: "boolean",
      describe:
        "Refresh required local project namespaces from the remote project before running a local-capable command.",
    });

const outputDetailCommandOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("cursor", {
      type: "string",
      describe: "Pagination cursor returned by the previous call",
    })
    .option("limit", {
      type: "number",
      describe: "Maximum records to return",
    })
    .option("verbose", {
      type: "boolean",
      describe: "Expand compact records with complete values and diagnostics",
    });

const requiredInputOption = (yargs: CommonYargsArgv, describe: string) =>
  yargs.option("input", {
    type: "string",
    describe,
    demandOption: true,
  });

const confirmOption = (yargs: CommonYargsArgv, describe: string) =>
  yargs.option("confirm", {
    type: "boolean",
    describe,
    demandOption: true,
  });

export const snapshotCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs.version(false))
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

export const pagesCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs));

export const createPageCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("name", {
      type: "string",
      describe: "Required page name shown in Builder",
      demandOption: true,
    })
    .option("path", {
      type: "string",
      describe: "Required page URL path, for example /pricing",
      demandOption: true,
    })
    .option("title", {
      type: "string",
      describe: "Page title text or expression; defaults to --name",
    })
    .option("parent-folder", {
      type: "string",
      describe: "Folder id where the page should be created",
    });

export const updatePageCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("page", {
      type: "string",
      describe: "Required page id to update",
      demandOption: true,
    })
    .option("name", {
      type: "string",
      describe: "Update page name shown in Builder",
    })
    .option("path", {
      type: "string",
      describe: "Update page URL path, for example /pricing",
    })
    .option("title", {
      type: "string",
      describe: "Update page title text or expression",
    })
    .option("description", {
      type: "string",
      describe: "Update page meta description text or expression",
    })
    .option("language", {
      type: "string",
      describe: "Update page language text or expression",
    })
    .option("redirect", {
      type: "string",
      describe: "Update page redirect expression",
    })
    .option("social-image-url", {
      type: "string",
      describe: "Update page social image URL expression",
    })
    .option("social-image-asset", {
      type: "string",
      describe: "Update page social image asset id",
    })
    .option("exclude-page-from-search", {
      type: "boolean",
      describe: "Set whether search engines should skip this page",
    })
    .option("document-type", {
      choices: ["html", "xml", "text"] as const,
      describe: "Set page document type",
    })
    .option("content", {
      type: "string",
      describe: "Update page custom document content",
    })
    .option("status", {
      type: "string",
      describe: "Update page response status expression",
    })
    .option("auth-login", {
      type: "string",
      describe: "Set page basic-auth login",
    })
    .option("auth-password", {
      type: "string",
      describe: "Set page basic-auth password",
    })
    .option("parent-folder", {
      type: "string",
      describe: "Move page into this folder id",
    });

export const projectSettingsCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs));

export const paginatedListCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs));

export const updateProjectSettingsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file with optional meta and compiler objects. Use null values to remove existing fields."
  );

export const updateMarketplaceProductCommandOptions = (
  yargs: CommonYargsArgv
) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file with marketplace product metadata."
  );

export const createRedirectCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("old", {
      type: "string",
      describe: "Required source URL path to redirect from, for example /old",
      demandOption: true,
    })
    .option("new", {
      type: "string",
      describe: "Required destination URL or path, for example /new",
      demandOption: true,
    })
    .option("status", {
      type: "string",
      choices: ["301", "302"] as const,
      describe: "Redirect HTTP status code",
    });

export const updateRedirectCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("old", {
      type: "string",
      describe: "Required current source URL path to update",
      demandOption: true,
    })
    .option("new-old", {
      type: "string",
      describe: "Replace the source URL path",
    })
    .option("new", {
      type: "string",
      describe: "Replace the destination URL or path",
    })
    .option("status", {
      type: "string",
      choices: ["301", "302"] as const,
      describe: "Replace the redirect HTTP status code",
    })
    .option("clear-status", {
      type: "boolean",
      describe: "Remove explicit redirect status and use the default",
    });

export const deleteRedirectCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("old", {
    type: "string",
    describe: "Required source URL path to delete",
    demandOption: true,
  });

export const setRedirectsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file with { redirects: [{ old, new, status? }] }."
  );

export const breakpointCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs));

const breakpointFieldsCommandOptions = (
  yargs: CommonYargsArgv,
  options: { requireLabel?: boolean } = {}
) =>
  yargs
    .option("label", {
      type: "string",
      describe:
        options.requireLabel === true
          ? "Required breakpoint label shown in Builder"
          : "Breakpoint label shown in Builder",
      demandOption: options.requireLabel,
    })
    .option("min-width", {
      type: "number",
      describe: "Minimum viewport width in pixels",
    })
    .option("max-width", {
      type: "number",
      describe: "Maximum viewport width in pixels",
    })
    .option("condition", {
      type: "string",
      describe: "Custom CSS media query condition without @media",
    })
    .option("clear-min-width", {
      type: "boolean",
      describe: "Remove the minimum viewport width",
    })
    .option("clear-max-width", {
      type: "boolean",
      describe: "Remove the maximum viewport width",
    })
    .option("clear-condition", {
      type: "boolean",
      describe: "Remove the custom media query condition",
    });

export const createBreakpointCommandOptions = (yargs: CommonYargsArgv) =>
  breakpointFieldsCommandOptions(apiCommandOptions(yargs), {
    requireLabel: true,
  });

export const updateBreakpointCommandOptions = (yargs: CommonYargsArgv) =>
  breakpointFieldsCommandOptions(
    apiCommandOptions(yargs).option("breakpoint", {
      type: "string",
      describe: "Required breakpoint id to update",
      demandOption: true,
    })
  );

export const deleteBreakpointCommandOptions = (yargs: CommonYargsArgv) =>
  confirmOption(
    apiCommandOptions(yargs).option("breakpoint", {
      type: "string",
      describe: "Required breakpoint id to delete",
      demandOption: true,
    }),
    "Required. Confirm deleting this breakpoint and its style declarations"
  );

export const deletePageCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("page", {
    type: "string",
    describe: "Required page id to delete",
    demandOption: true,
  });

export const duplicatePageCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("page", {
      type: "string",
      describe: "Required page id to duplicate",
      demandOption: true,
    })
    .option("name", {
      type: "string",
      describe: "Optional name for the duplicated page",
    })
    .option("path", {
      type: "string",
      describe: "Optional URL path for the duplicated page",
    })
    .option("parent-folder", {
      type: "string",
      describe: "Folder id where the duplicated page should be inserted",
    })
    .option("substitutions", {
      type: "string",
      describe:
        "JSON object with exact text replacements and copied variable value overrides",
    });

export const listPageTemplatesCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs));

const pageTemplateFieldsCommandOptions = (
  yargs: CommonYargsArgv,
  options: { requireName?: boolean } = {}
) =>
  yargs
    .option("name", {
      type: "string",
      describe: "Page template name shown in Builder",
      demandOption: options.requireName,
    })
    .option("title", {
      type: "string",
      describe: "Page template title text or expression",
    })
    .option("description", {
      type: "string",
      describe: "Page template meta description text or expression",
    })
    .option("language", {
      type: "string",
      describe: "Page template language text or expression",
    })
    .option("social-image-url", {
      type: "string",
      describe: "Social image URL expression",
    })
    .option("social-image-asset", {
      type: "string",
      describe: "Social image asset id expression",
    })
    .option("exclude-page-from-search", {
      type: "boolean",
      describe: "Exclude pages created from this template from search",
    });

export const createPageTemplateCommandOptions = (yargs: CommonYargsArgv) =>
  pageTemplateFieldsCommandOptions(apiCommandOptions(yargs), {
    requireName: true,
  });

export const updatePageTemplateCommandOptions = (yargs: CommonYargsArgv) =>
  pageTemplateFieldsCommandOptions(
    apiCommandOptions(yargs).option("template", {
      type: "string",
      describe: "Required page template id to update",
      demandOption: true,
    })
  );

export const deletePageTemplateCommandOptions = (yargs: CommonYargsArgv) =>
  confirmOption(
    apiCommandOptions(yargs).option("template", {
      type: "string",
      describe: "Required page template id to delete",
      demandOption: true,
    }),
    "Required. Confirm deleting this page template and its content"
  );

export const duplicatePageTemplateCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("template", {
    type: "string",
    describe: "Required page template id to duplicate",
    demandOption: true,
  });

export const reorderPageTemplateCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("source-template", {
      type: "string",
      describe: "Required page template id to move",
      demandOption: true,
    })
    .option("target-template", {
      type: "string",
      describe: "Required page template id to place before or after",
      demandOption: true,
    })
    .option("position", {
      choices: ["before", "after"] as const,
      describe: "Place source template before or after target template",
      demandOption: true,
    });

export const createPageFromTemplateCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("template", {
      type: "string",
      describe: "Required page template id to copy",
      demandOption: true,
    })
    .option("name", {
      type: "string",
      describe: "Required new page name shown in Builder",
      demandOption: true,
    })
    .option("path", {
      type: "string",
      describe: "Required new page URL path, for example /landing",
      demandOption: true,
    })
    .option("parent-folder", {
      type: "string",
      describe: "Folder id where the new page should be inserted",
    });

export const foldersCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs));

export const createFolderCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("name", {
      type: "string",
      describe: "Required folder name shown in Builder",
      demandOption: true,
    })
    .option("slug", {
      type: "string",
      describe:
        "Required folder URL slug, use empty string for no path segment",
      demandOption: true,
    })
    .option("parent-folder", {
      type: "string",
      describe: "Parent folder id where the folder should be created",
    });

export const updateFolderCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("folder", {
      type: "string",
      describe: "Required folder id to update",
      demandOption: true,
    })
    .option("name", {
      type: "string",
      describe: "Update folder name shown in Builder",
    })
    .option("slug", {
      type: "string",
      describe: "Update folder URL slug",
    })
    .option("parent-folder", {
      type: "string",
      describe: "Move folder into this parent folder id",
    });

export const deleteFolderCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("folder", {
    type: "string",
    describe: "Required folder id to delete with its child folders and pages",
    demandOption: true,
  });

export const instanceListCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs))
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

export const insertComponentCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("parent", {
      type: "string",
      describe: "Required parent instance id where the component is inserted",
      demandOption: true,
    })
    .option("component", {
      type: "string",
      describe:
        "Required component id to insert. Template composition is applied automatically if a template is registered for that component.",
      demandOption: true,
    })
    .option("mode", {
      choices: ["append", "prepend", "replace"] as const,
      describe:
        "Append, prepend, or replace parent children before inserting the component",
    })
    .option("insert-index", {
      type: "number",
      describe: "Zero-based child index for insertion",
    });

export const moveInstanceCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    'Required JSON file containing an array of moves with instanceId, parentInstanceId, and either optional insertIndex or position: "end"'
  );

export const cloneInstanceCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("source", {
      type: "string",
      describe: "Required source instance id to clone",
      demandOption: true,
    })
    .option("parent", {
      type: "string",
      describe:
        "Optional target parent instance id; defaults to the source parent",
    })
    .option("insert-index", {
      type: "number",
      describe: "Zero-based child index for the cloned instance",
    });

export const deleteInstanceCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("instance", {
    type: "array",
    string: true,
    describe:
      "Required instance id to delete. Repeat or comma-separate to delete multiple roots.",
    demandOption: true,
  });

export const updatePropsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing an array of prop updates with instanceId, name, type, and value"
  );

export const deletePropsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing an array of prop deletions with instanceId and name"
  );

export const bindPropsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing an array of prop bindings with instanceId, name, and binding"
  );

export const textListCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs))
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
    });

export const textUpdateCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("instance", {
      type: "string",
      describe: "Required instance id containing the text child",
      demandOption: true,
    })
    .option("child-index", {
      type: "number",
      describe:
        "Required zero-based child index from list-texts for the text child to update",
      demandOption: true,
    })
    .option("text", {
      type: "string",
      describe: "Required replacement text or expression string",
      demandOption: true,
    })
    .option("mode", {
      choices: ["text", "expression"] as const,
      describe:
        'Optional expected child type: "text" for plain visible text, "expression" for JavaScript expression children. There is no "replace" mode.',
    });

export const stylesCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs))
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

export const updateStylesCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing an array of style updates with instanceId, property, value, optional breakpoint/state"
  );

export const deleteStylesCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing an array of style deletions with instanceId, property, optional breakpoint/state"
  );

export const replaceStylesCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing property, fromValue, toValue, and optional pageId/pagePath"
  );

export const designTokensCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs))
    .option("filter", {
      type: "string",
      describe: "Only return design tokens whose name contains this text",
    })
    .option("with-usage", {
      type: "boolean",
      default: true,
      describe: "Include how many instances use each design token",
    })
    .option("sort", {
      choices: ["name", "usage"] as const,
      describe: "Sort design tokens by name or usage count",
    });

export const createDesignTokenCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing an array of design tokens with name, styles object, or declarations array"
  );

export const importDesignTokensCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing DTCG tokens, Figma variables, and import mapping options"
  );

export const updateDesignTokenStylesCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("design-token", {
      type: "string",
      describe: "Required design token id",
      demandOption: true,
    }),
    "Required JSON file containing an array of style updates with property, value, optional breakpoint/state"
  );

export const deleteDesignTokenStylesCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("design-token", {
      type: "string",
      describe: "Required design token id",
      demandOption: true,
    }),
    "Required JSON file containing an array of style deletions with property, optional breakpoint/state"
  );

export const attachDesignTokenCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs)
      .option("design-token", {
        type: "string",
        describe: "Required design token id",
        demandOption: true,
      })
      .option("position", {
        choices: ["before-local", "after-local"] as const,
        describe:
          "Where to place the token relative to an instance local style source",
      }),
    "Required JSON file containing an array of instance ids"
  );

export const detachDesignTokenCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("design-token", {
      type: "string",
      describe: "Required design token id",
      demandOption: true,
    }),
    "Required JSON file containing an array of instance ids"
  );

export const extractDesignTokenCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs),
    "Required JSON file containing instanceIds, name, and optional removeLocalProps"
  );

export const cssVariablesCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs))
    .option("filter", {
      type: "string",
      describe: "Only return CSS variables whose name contains this text",
    })
    .option("with-usage", {
      type: "boolean",
      describe: "Include how many references use each CSS variable",
    });

export const defineCssVariableCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("overwrite", {
      type: "boolean",
      describe: "Replace existing CSS variable definitions with the same name",
    }),
    "Required JSON file containing an object of CSS variable names to values"
  );

export const deleteCssVariableCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    confirmOption(
      apiCommandOptions(yargs).option("force", {
        type: "boolean",
        describe:
          "Delete CSS variable definitions even when they are referenced",
      }),
      "Required. Confirm deleting CSS variable definitions"
    ),
    "Required JSON file containing an array of CSS variable names"
  );

export const rewriteCssVariableRefsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("scope-regex", {
      type: "string",
      describe: "Only rewrite references in matching instance or style scopes",
    }),
    "Required JSON file containing an object that maps old CSS variable names to new names"
  );

export const scopedCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs)).option(
    "scope-instance",
    {
      type: "string",
      describe: "Only return items scoped to this instance id",
    }
  );

export const createVariableCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("scope-instance", {
      type: "string",
      describe: "Required instance id where the variable is scoped",
      demandOption: true,
    })
    .option("name", {
      type: "string",
      describe: "Required variable name used in expressions",
      demandOption: true,
    })
    .option("value-type", {
      choices: ["string", "number", "boolean", "string[]", "json"] as const,
      describe: "Required variable value type",
      demandOption: true,
    })
    .option("value", {
      type: "string",
      describe:
        "Required variable value; use JSON for json and string[] value types",
      demandOption: true,
    });

export const updateVariableCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("variable", {
      type: "string",
      describe: "Required variable data source id to update",
      demandOption: true,
    })
    .option("scope-instance", {
      type: "string",
      describe: "Move variable scope to this instance id",
    })
    .option("name", {
      type: "string",
      describe: "Update variable name used in expressions",
    })
    .option("value-type", {
      choices: ["string", "number", "boolean", "string[]", "json"] as const,
      describe: "Variable value type when updating --value",
    })
    .option("value", {
      type: "string",
      describe: "Updated variable value; use JSON for json and string[] types",
    });

export const deleteVariableCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("variable", {
    type: "string",
    describe: "Required variable data source id to delete",
    demandOption: true,
  });

export const createResourceCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("input", {
      type: "string",
      describe:
        "Optional JSON file with resource fields: name, method, url, headers, searchParams, body, control",
    })
    .option("name", {
      type: "string",
      describe: "Required resource name unless provided by --input",
    })
    .option("method", {
      choices: ["get", "post", "put", "delete"] as const,
      describe: "Required HTTP method unless provided by --input",
    })
    .option("url", {
      type: "string",
      describe:
        'Required URL expression unless provided by --input, for example "\\"https://api.example.com/items\\""',
    })
    .option("body", {
      type: "string",
      describe: "Optional request body expression",
    })
    .option("scope-instance", {
      type: "string",
      describe:
        "Expose the resource as a data variable scoped to this instance",
    })
    .option("data-source-name", {
      type: "string",
      describe:
        "Optional data variable name when exposing the resource; defaults to resource name",
    });

export const updateResourceCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("resource", {
      type: "string",
      describe: "Required resource id to update",
      demandOption: true,
    })
    .option("input", {
      type: "string",
      describe:
        "Optional JSON file with resource fields to update: name, method, url, headers, searchParams, body, control",
    })
    .option("name", {
      type: "string",
      describe: "Update resource name",
    })
    .option("method", {
      choices: ["get", "post", "put", "delete"] as const,
      describe: "Update HTTP method",
    })
    .option("url", {
      type: "string",
      describe: "Update URL expression",
    })
    .option("body", {
      type: "string",
      describe: "Update request body expression",
    })
    .option("scope-instance", {
      type: "string",
      describe: "Move the exposed resource data variable to this instance id",
    })
    .option("data-source-name", {
      type: "string",
      describe: "Update the exposed resource data variable name",
    });

export const deleteResourceCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("resource", {
      type: "string",
      describe: "Required resource id to delete",
      demandOption: true,
    })
    .option("force", {
      type: "boolean",
      describe:
        "Also remove direct resource prop references that point at this resource",
    });

const publishTargetOption = (yargs: CommonYargsArgv) =>
  yargs.option("target", {
    choices: ["staging", "production"] as const,
    describe: "Required publish target",
    demandOption: true,
  });

const publishDomainsOption = (yargs: CommonYargsArgv) =>
  yargs.option("domain", {
    type: "array",
    string: true,
    describe:
      "Domain to publish or unpublish. Repeat or comma-separate to target multiple domains. Defaults to the configured project domain and active verified custom domains.",
  });

export const publishCommandOptions = (yargs: CommonYargsArgv) =>
  publishDomainsOption(publishTargetOption(apiCommandOptions(yargs)))
    .option("message", {
      type: "string",
      describe: "Optional human-readable publish message",
    })
    .option("idempotency-key", {
      type: "string",
      describe: "Optional idempotency key for retrying the same publish",
    });

export const publishJobCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("job", {
    type: "string",
    describe: "Required publish job id returned by publish or unpublish",
    demandOption: true,
  });

export const unpublishCommandOptions = (yargs: CommonYargsArgv) =>
  confirmOption(
    publishCommandOptions(yargs),
    "Required. Confirm that selected domains should be unpublished"
  );

export const createDomainCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("domain", {
    type: "string",
    describe: "Required custom domain, for example example.com",
    demandOption: true,
  });

export const updateDomainCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("domain-id", {
      type: "string",
      describe: "Required domain id to update",
      demandOption: true,
    })
    .option("input", {
      type: "string",
      describe: "Optional JSON file containing { domain }",
    })
    .option("domain", {
      type: "string",
      describe: "Set custom domain, for example www.example.com",
    });

export const deleteDomainCommandOptions = (yargs: CommonYargsArgv) =>
  confirmOption(
    apiCommandOptions(yargs).option("domain-id", {
      type: "string",
      describe: "Required domain id to delete",
      demandOption: true,
    }),
    "Required. Confirm that the domain should be removed"
  );

export const verifyDomainCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("domain-id", {
    type: "string",
    describe: "Required domain id to verify",
    demandOption: true,
  });

export const assetsCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs))
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
    });

export const auditCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs)
    .option("scopes", {
      type: "array",
      string: true,
      choices: [
        "accessibility",
        "security",
        "seo",
        "assets",
        "styles",
        "performance",
        "craft",
      ] as const,
      describe: "Audit only the selected project-quality scopes",
    })
    .option("severities", {
      type: "array",
      string: true,
      choices: ["error", "warning", "info"] as const,
      describe: "Return only findings with the selected severities",
    })
    .option("page-id", {
      type: "string",
      describe: "Audit page-owned findings for one page id",
    })
    .option("page-path", {
      type: "string",
      describe: "Audit page-owned findings for one page path",
    })
    .option("limit", {
      type: "number",
      describe: "Maximum findings to return, from 1 to 200",
    })
    .option("cursor", {
      type: "string",
      describe: "Pagination cursor returned by the previous audit call",
    })
    .option("verbose", {
      type: "boolean",
      describe:
        "Include full finding evidence, remediation, skipped checks, and manual-check workflows",
    })
    .example("$0 audit --json", "Run every project audit")
    .example(
      "$0 audit --scopes accessibility --scopes seo --page-path /pricing --json",
      "Audit accessibility and SEO for one page"
    );

export const fontsCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(apiCommandOptions(yargs)).option(
    "include-system",
    {
      type: "boolean",
      default: true,
      describe: "Include built-in system font stacks",
    }
  );

export const uploadAssetCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("assets-dir", {
      type: "string",
      describe: `Directory containing asset files; defaults to ${LOCAL_ASSETS_DIR}`,
    }),
    "Required JSON file containing asset descriptor: name, type, format, meta"
  );

export const uploadAssetsCommandOptions = (yargs: CommonYargsArgv) =>
  requiredInputOption(
    apiCommandOptions(yargs).option("assets-dir", {
      type: "string",
      describe: `Directory containing asset files; defaults to ${LOCAL_ASSETS_DIR}`,
    }),
    "Required JSON file containing an array of asset descriptors"
  );

export const assetCommandOptions = (yargs: CommonYargsArgv) =>
  apiCommandOptions(yargs).option("asset", {
    type: "string",
    describe: "Required asset id",
    demandOption: true,
  });

export const assetUsageCommandOptions = (yargs: CommonYargsArgv) =>
  outputDetailCommandOptions(assetCommandOptions(yargs));

export const replaceAssetCommandOptions = (yargs: CommonYargsArgv) =>
  confirmOption(
    apiCommandOptions(yargs)
      .option("from", {
        type: "string",
        describe: "Required asset id to replace",
        demandOption: true,
      })
      .option("to", {
        type: "string",
        describe: "Required replacement asset id",
        demandOption: true,
      }),
    "Required. Confirm replacing asset references and deleting old asset"
  );

export const deleteAssetCommandOptions = (yargs: CommonYargsArgv) =>
  confirmOption(
    apiCommandOptions(yargs)
      .option("asset", {
        type: "array",
        string: true,
        describe: "Required asset ids or id prefixes to delete",
        demandOption: true,
      })
      .option("force", {
        type: "boolean",
        describe: "Delete assets even when they are referenced",
      }),
    "Required. Confirm deleting asset records"
  );

export type ApiCommandOptions = {
  command: ApiCommandName;
  json?: boolean;
  include?: string[];
  version?: number;
  baseVersion?: number;
  input?: string;
  assetsDir?: string;
  page?: string;
  template?: string;
  folder?: string;
  path?: string;
  name?: string;
  variable?: string;
  resource?: string;
  dataSource?: string;
  asset?: string | string[];
  domain?: string | string[];
  domainId?: string;
  target?: "staging" | "production";
  job?: string;
  idempotencyKey?: string;
  from?: string;
  to?: string;
  designToken?: string;
  dataSourceName?: string;
  slug?: string;
  title?: string;
  description?: string;
  language?: string;
  redirect?: string;
  socialImageUrl?: string;
  socialImageAsset?: string;
  excludePageFromSearch?: boolean;
  documentType?: "html" | "xml" | "text";
  content?: string;
  status?: "301" | "302" | string;
  clearStatus?: boolean;
  old?: string;
  new?: string;
  newOld?: string;
  minWidth?: number;
  maxWidth?: number;
  condition?: string;
  clearMinWidth?: boolean;
  clearMaxWidth?: boolean;
  clearCondition?: boolean;
  authLogin?: string;
  authPassword?: string;
  message?: string;
  parentFolder?: string;
  substitutions?: string;
  sourceTemplate?: string;
  targetTemplate?: string;
  root?: string;
  maxDepth?: number;
  topLevel?: boolean;
  component?: string;
  tag?: string;
  label?: string;
  instance?: string | string[];
  parent?: string;
  source?: string;
  insertIndex?: number;
  childIndex?: number;
  text?: string;
  childDepth?: number;
  mode?: "text" | "expression" | "all" | "append" | "prepend" | "replace";
  valueType?: "string" | "number" | "boolean" | "string[]" | "json";
  value?: string;
  method?: "get" | "post" | "put" | "delete";
  url?: string;
  body?: string;
  force?: boolean;
  confirm?: boolean;
  overwrite?: boolean;
  scopeRegex?: string;
  contains?: string;
  breakpoint?: string;
  state?: string;
  property?: string;
  propertyFilter?: string;
  includeTokens?: boolean;
  position?: "before-local" | "after-local" | "before" | "after";
  filter?: string;
  withUsage?: boolean;
  includeSystem?: boolean;
  scopeInstance?: string;
  type?: "image" | "font" | "file";
  sort?: "name" | "usage" | "size" | "createdAt";
  cursor?: string;
  limit?: number;
  scopes?: Array<
    | "accessibility"
    | "security"
    | "seo"
    | "assets"
    | "styles"
    | "performance"
    | "craft"
  >;
  severities?: Array<"error" | "warning" | "info">;
  pageId?: string;
  pagePath?: string;
  verbose?: boolean;
  dryRun?: boolean;
  refresh?: boolean;
};

type ApiCommandConnection = ApiConnection & {
  headers: typeof apiCompatibilityHeaders;
};

type ResourceFieldsInput = Parameters<
  typeof httpClient.createResource
>[0]["resource"];
type ProjectSettingsInput = Pick<
  Parameters<typeof httpClient.updateProjectSettings>[0],
  "meta" | "compiler"
>;
type MarketplaceProductInput = MarketplaceProduct;
type SetRedirectsInput = { redirects: PageRedirect[] };
type BreakpointInput = Pick<
  Parameters<typeof httpClient.createBreakpoint>[0],
  "label" | "minWidth" | "maxWidth" | "condition"
>;
type BreakpointUpdateInput = Parameters<
  typeof httpClient.updateBreakpoint
>[0]["values"];
type VariableValueInput = Parameters<
  typeof httpClient.createVariable
>[0]["value"];
type MoveInstanceInput = Parameters<typeof httpClient.moveInstance>[0]["moves"];
type PropUpdatesInput = Parameters<typeof httpClient.updateProps>[0]["updates"];
type PropDeletionsInput = Parameters<
  typeof httpClient.deleteProps
>[0]["deletions"];
type PropBindingsInput = Parameters<typeof httpClient.bindProps>[0]["bindings"];
type StyleUpdatesInput = Parameters<
  typeof httpClient.updateStyleDeclarations
>[0]["updates"];
type StyleDeletionsInput = Parameters<
  typeof httpClient.deleteStyleDeclarations
>[0]["deletions"];
type StyleReplaceInput = Omit<
  Parameters<typeof httpClient.replaceStyleValues>[0],
  "authToken" | "headers" | "origin" | "projectId"
>;
type CreateDesignTokensInput = Parameters<
  typeof httpClient.createDesignTokens
>[0]["tokens"];
type ImportDesignTokensInput = Omit<
  Parameters<typeof httpClient.importDesignTokens>[0],
  "authToken" | "headers" | "origin" | "projectId"
>;
type UpdateDesignTokenStylesInput = Parameters<
  typeof httpClient.updateDesignTokenStyles
>[0]["updates"];
type DeleteDesignTokenStylesInput = Parameters<
  typeof httpClient.deleteDesignTokenStyles
>[0]["deletions"];
type ExtractDesignTokenInput = Omit<
  Parameters<typeof httpClient.extractDesignToken>[0],
  "authToken" | "headers" | "origin" | "projectId"
>;
type DefineCssVariablesInput = Parameters<
  typeof httpClient.defineCssVariables
>[0]["vars"];
type DeleteCssVariablesInput = Parameters<
  typeof httpClient.deleteCssVariables
>[0]["names"];
type RewriteCssVariableRefsInput = Parameters<
  typeof httpClient.rewriteCssVariableRefs
>[0]["map"];
type UploadAssetInput = Parameters<
  typeof httpClient.uploadProjectAsset
>[0]["asset"];
type UploadAssetsInput = Parameters<
  typeof httpClient.uploadProjectAssets
>[0]["assets"];
type UpdateDomainInput = Parameters<
  typeof httpClient.updateDomain
>[0]["updates"];

const requireOption = (value: string | undefined, name: string) => {
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const requireSingleOption = (
  value: string | string[] | undefined,
  name: string
) => {
  if (Array.isArray(value)) {
    return requireOption(value[0], name);
  }
  return requireOption(value, name);
};

const requireStringOption = (value: string | undefined, name: string) => {
  if (value === undefined) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const requireTrueOption = (value: boolean | undefined, name: string) => {
  if (value !== true) {
    throw new Error(`${name} is required.`);
  }
};

const rejectOptionConflict = (
  clearOption: boolean | undefined,
  clearOptionName: string,
  valueOption: unknown,
  valueOptionName: string
) => {
  if (clearOption === true && valueOption !== undefined) {
    throw new Error(
      `${clearOptionName} cannot be used with ${valueOptionName}.`
    );
  }
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

const listStringOption = (value: string | string[] | undefined) =>
  listOption(
    Array.isArray(value) ? value : value === undefined ? undefined : [value]
  );

const requireListOption = (
  value: string | string[] | undefined,
  name: string
) => {
  const values = listStringOption(value);
  if (values === undefined || values.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return values;
};

const optionalChoice = <Choice extends string>(
  value: string | undefined,
  choices: readonly Choice[],
  name: string
): Choice | undefined => {
  if (value === undefined) {
    return;
  }
  if ((choices as readonly string[]).includes(value)) {
    return value as Choice;
  }
  throw new Error(`Unsupported ${name} "${value}".`);
};

const requiredChoice = <Choice extends string>(
  value: string | undefined,
  choices: readonly Choice[],
  name: string
) => {
  const choice = optionalChoice(value, choices, name);
  if (choice === undefined) {
    throw new Error(`${name} is required.`);
  }
  return choice;
};

const designTokenSortOption = (
  value: ApiCommandOptions["sort"]
): "name" | "usage" | undefined =>
  optionalChoice(value, ["name", "usage"], "design token sort");

const assetListTypeOption = (
  value: ApiCommandOptions["type"]
): "image" | "font" | undefined =>
  optionalChoice(value, ["image", "font"], "asset list type");

const publishTargetValue = (
  value: ApiCommandOptions["target"]
): "staging" | "production" =>
  requiredChoice(value, ["staging", "production"], "--target");

const textUpdateModeOption = (
  value: ApiCommandOptions["mode"]
): "text" | "expression" | undefined =>
  optionalChoice(value, ["text", "expression"], "text update mode");

const textListModeOption = (
  value: ApiCommandOptions["mode"]
): "text" | "expression" | "all" | undefined =>
  optionalChoice(value, ["text", "expression", "all"], "text list mode");

const instanceInsertModeOption = (
  value: ApiCommandOptions["mode"]
): "append" | "prepend" | "replace" | undefined =>
  optionalChoice(value, ["append", "prepend", "replace"], "instance mode");

const readJsonFile = async (
  dependencies: ApiCommandDependencies,
  path: string | undefined,
  name: string
) => {
  return JSON.parse(
    await dependencies.readFile(requireOption(path, name), "utf-8")
  ) as unknown;
};

const readOptionalJsonObject = async (
  dependencies: ApiCommandDependencies,
  path: string | undefined
) => {
  if (path === undefined) {
    return {};
  }
  const value = await readJsonFile(dependencies, path, "--input");
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("--input must contain a JSON object.");
  }
  return value as Record<string, unknown>;
};

const readJsonArray = async (
  dependencies: ApiCommandDependencies,
  path: string | undefined,
  name: string
) => {
  const value = await readJsonFile(dependencies, path, name);
  if (Array.isArray(value) === false) {
    throw new Error(`${name} must contain a JSON array.`);
  }
  return value;
};

const readInputObject = async <Value>(
  dependencies: ApiCommandDependencies,
  options: ApiCommandOptions
) => (await readOptionalJsonObject(dependencies, options.input)) as Value;

const readInputArray = async <Value>(
  dependencies: ApiCommandDependencies,
  options: ApiCommandOptions
) => (await readJsonArray(dependencies, options.input, "--input")) as Value;

const parseVariableValue = (
  type: ApiCommandOptions["valueType"],
  value: string | undefined
): VariableValueInput => {
  const valueType = requireOption(type, "--value-type");
  const rawValue = requireStringOption(value, "--value");
  if (valueType === "string") {
    return { type: valueType, value: rawValue };
  }
  if (valueType === "number") {
    const number = Number(rawValue);
    if (Number.isFinite(number) === false) {
      throw new Error("--value must be a finite number.");
    }
    return { type: valueType, value: number };
  }
  if (valueType === "boolean") {
    if (rawValue !== "true" && rawValue !== "false") {
      throw new Error('--value must be "true" or "false".');
    }
    return { type: valueType, value: rawValue === "true" };
  }
  const parsed = JSON.parse(rawValue) as unknown;
  if (valueType === "string[]") {
    if (
      Array.isArray(parsed) === false ||
      parsed.every((item) => typeof item === "string") === false
    ) {
      throw new Error("--value must be a JSON array of strings.");
    }
    return { type: valueType, value: parsed };
  }
  return { type: "json", value: parsed };
};

const parseOptionalVariableValue = (
  options: ApiCommandOptions
): VariableValueInput | undefined => {
  if (options.value === undefined && options.valueType === undefined) {
    return;
  }
  if (options.value === undefined || options.valueType === undefined) {
    throw new Error("--value and --value-type must be provided together.");
  }
  return parseVariableValue(options.valueType, options.value);
};

const getResourceFields = async (
  dependencies: ApiCommandDependencies,
  options: ApiCommandOptions,
  requireComplete: boolean
) => {
  const input = await readOptionalJsonObject(dependencies, options.input);
  const fields: Record<string, unknown> = {
    ...input,
    name: options.name ?? input.name,
    method: options.method ?? input.method,
    url: options.url ?? input.url,
    body: options.body ?? input.body,
  };
  if (requireComplete && fields.headers === undefined) {
    fields.headers = [];
  }
  if (requireComplete) {
    fields.name = requireOption(
      typeof fields.name === "string" ? fields.name : undefined,
      "--name"
    );
    fields.method = requireOption(
      typeof fields.method === "string" ? fields.method : undefined,
      "--method"
    );
    fields.url = requireOption(
      typeof fields.url === "string" ? fields.url : undefined,
      "--url"
    );
  }
  return fields;
};

const getPageMetaOptions = (options: ApiCommandOptions) => {
  const auth =
    options.authLogin !== undefined || options.authPassword !== undefined
      ? {
          method: "basic" as const,
          login: requireOption(options.authLogin, "--auth-login"),
          password: requireOption(options.authPassword, "--auth-password"),
        }
      : undefined;
  const meta = {
    description: options.description,
    language: options.language,
    redirect: options.redirect,
    status: options.status,
    socialImageUrl: options.socialImageUrl,
    socialImageAssetId: options.socialImageAsset,
    excludePageFromSearch: options.excludePageFromSearch,
    documentType: options.documentType,
    content: options.content,
    auth,
  };
  return Object.values(meta).some((value) => value !== undefined)
    ? meta
    : undefined;
};

const redirectStatusOption = (status: ApiCommandOptions["status"]) =>
  status === "301" || status === "302" ? status : undefined;

const getErrorCode = (error: unknown) => {
  const message = getCliErrorMessage(error);
  const stableCode = getStableErrorCode(error);
  if (isMissingApiAccessError(error)) {
    return "UNAUTHORIZED";
  }
  if (stableCode === "CONFLICT") {
    return "VERSION_CONFLICT";
  }
  if (stableCode === "UNAUTHORIZED" || stableCode === "FORBIDDEN") {
    return "UNAUTHORIZED";
  }
  if (stableCode === "BAD_REQUEST") {
    return "INVALID_ARGUMENT";
  }
  if (stableCode !== undefined) {
    return stableCode;
  }
  if (error instanceof SyntaxError) {
    return "INVALID_JSON";
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
  if (message.includes("does not support --dry-run")) {
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
    return "Use MCP tool snapshot, read the latest build version, regenerate the patch, then retry MCP tool apply-patch.";
  }
};

const runProjectSessionCommand = async (
  command: ApiCommandName,
  input: unknown,
  connection: ApiCommandConnection,
  dependencies: ApiCommandDependencies,
  options: { dryRun?: boolean } = {}
) =>
  executeProjectSessionApiOperation({
    command,
    input,
    connection,
    createProjectSession: dependencies.createCliProjectSession,
    getServerApiContract: dependencies.getServerApiContract,
    dryRun: options.dryRun ?? activeApiCommandDryRun,
    refresh: activeApiCommandRefresh,
  });

type ApiCommandHandler = (
  options: ApiCommandOptions,
  connection: ApiCommandConnection,
  dependencies: ApiCommandDependencies
) => Promise<unknown>;

export const printAuditReport = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    console.info("Audit completed.");
    return;
  }
  const result = value as {
    summary?: {
      total?: number;
      selectedTotal?: number;
      bySeverity?: Record<string, number>;
    };
    findings?: Array<{
      severity?: string;
      scope?: string;
      ruleId?: string;
      message?: string;
      location?: Record<string, unknown>;
    }>;
    skippedChecks?: unknown[];
    manualChecks?: unknown[];
    skippedCheckCount?: number;
    manualCheckCount?: number;
    renderedCheckCount?: number;
    renderedIssueCount?: number;
    renderedIssueSummaries?: Array<{
      kind?: string;
      count?: number;
      captureCount?: number;
      pagePaths?: string[];
    }>;
    renderedFailureCount?: number;
    renderedState?: "complete" | "partial" | "confirmation-required" | "failed";
    renderedPlan?: {
      captureCount?: number;
      confirmationToken?: string;
      confirmationExpiresAt?: string;
    } | null;
    nextCursor?: string | null;
  };
  const severity = result.summary?.bySeverity ?? {};
  const total = result.summary?.total ?? 0;
  const selectedTotal = result.summary?.selectedTotal ?? total;
  console.info(
    `Audit: ${
      selectedTotal === total
        ? `${total} findings`
        : `${selectedTotal} selected findings (${total} across all severities)`
    } ` +
      `(${severity.error ?? 0} errors, ${severity.warning ?? 0} warnings, ${severity.info ?? 0} info)`
  );
  for (const finding of result.findings ?? []) {
    const location = Object.values(finding.location ?? {})
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter((item) => item !== undefined)
      .join(" ");
    console.info(
      `[${finding.severity?.toUpperCase() ?? "INFO"}] ${finding.scope ?? "audit"}/${finding.ruleId ?? "finding"}: ${finding.message ?? ""}${location === "" ? "" : ` (${location})`}`
    );
  }
  const skippedCheckCount =
    result.skippedCheckCount ?? result.skippedChecks?.length ?? 0;
  const manualCheckCount =
    result.manualCheckCount ?? result.manualChecks?.length ?? 0;
  if (skippedCheckCount > 0) {
    console.info(`${skippedCheckCount} checks skipped.`);
  }
  if (manualCheckCount > 0) {
    console.info(`${manualCheckCount} manual checks recommended.`);
  }
  if (result.renderedCheckCount !== undefined) {
    console.info(
      `Rendered (${result.renderedState ?? "complete"}): ${result.renderedCheckCount} checks, ${result.renderedIssueCount ?? 0} issues, ${result.renderedFailureCount ?? 0} failures.`
    );
    for (const summary of result.renderedIssueSummaries ?? []) {
      const pages = summary.pagePaths?.join(", ");
      console.info(
        `  ${summary.kind ?? "rendered-issue"}: ${summary.count ?? 0} occurrences across ${summary.captureCount ?? 0} captures${pages === undefined || pages === "" ? "" : ` (${pages})`}.`
      );
    }
  }
  if (result.renderedPlan?.confirmationToken !== undefined) {
    console.info(
      `Rendered plan: ${result.renderedPlan.captureCount ?? 0} captures require confirmation.`
    );
    console.info(
      `Retry with --confirm-large-run --confirmation-token '${result.renderedPlan.confirmationToken}'.`
    );
    if (result.renderedPlan.confirmationExpiresAt !== undefined) {
      console.info(
        `Confirmation expires at ${result.renderedPlan.confirmationExpiresAt}.`
      );
    }
  }
  if (result.nextCursor != null) {
    console.info(`More findings: rerun with --cursor '${result.nextCursor}'.`);
  }
};

const apiCommandHandlers: Partial<Record<ApiCommandName, ApiCommandHandler>> = {
  whoami: async (_options, connection, dependencies) =>
    runProjectSessionCommand("whoami", {}, connection, dependencies),
  permissions: async (_options, connection, dependencies) =>
    runProjectSessionCommand("permissions", {}, connection, dependencies),
  inspect: async (_options, connection, dependencies) =>
    runProjectSessionCommand("inspect", {}, connection, dependencies),
  snapshot: async (options, connection, dependencies) => {
    const input = {
      include: listOption(options.include),
      version: options.version,
    };
    return runProjectSessionCommand(
      "snapshot",
      input,
      connection,
      dependencies
    );
  },
  audit: async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "audit",
      {
        scopes: listOption(options.scopes),
        severities: listOption(options.severities),
        pageId: options.pageId,
        pagePath: options.pagePath,
        limit: options.limit,
        cursor: options.cursor,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "apply-patch": async (options, connection, dependencies) => {
    const patchInput = await readJsonFile(
      dependencies,
      options.input,
      "--input"
    );
    const input = {
      baseVersion: requireNumberOption(options.baseVersion, "--base-version"),
      transactions: patchInput,
    };
    return runProjectSessionCommand(
      "apply-patch",
      input,
      connection,
      dependencies
    );
  },
  "list-pages": async (options, connection, dependencies) => {
    const input = {
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-pages",
      input,
      connection,
      dependencies
    );
  },
  "get-page": async (options, connection, dependencies) => {
    const input = { pageId: requireOption(options.page, "--page") };
    return runProjectSessionCommand(
      "get-page",
      input,
      connection,
      dependencies
    );
  },
  "get-page-by-path": async (options, connection, dependencies) => {
    const input = { path: requireOption(options.path, "--path") };
    return runProjectSessionCommand(
      "get-page-by-path",
      input,
      connection,
      dependencies
    );
  },
  "create-page": async (options, connection, dependencies) => {
    const input = {
      name: requireOption(options.name, "--name"),
      path: requireOption(options.path, "--path"),
      title: options.title,
      parentFolderId: options.parentFolder,
      meta: getPageMetaOptions(options),
    };
    return runProjectSessionCommand(
      "create-page",
      input,
      connection,
      dependencies
    );
  },
  "update-page": async (options, connection, dependencies) => {
    const input = {
      pageId: requireOption(options.page, "--page"),
      values: {
        name: options.name,
        path: options.path,
        title: options.title,
        parentFolderId: options.parentFolder,
        meta: getPageMetaOptions(options),
      },
    };
    return runProjectSessionCommand(
      "update-page",
      input,
      connection,
      dependencies
    );
  },
  "get-project-settings": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "get-project-settings",
      { verbose: options.verbose },
      connection,
      dependencies
    ),
  "get-marketplace-product": async (_options, connection, dependencies) =>
    runProjectSessionCommand(
      "get-marketplace-product",
      {},
      connection,
      dependencies
    ),
  "update-project-settings": async (options, connection, dependencies) => {
    const input = await readInputObject<ProjectSettingsInput>(
      dependencies,
      options
    );
    return runProjectSessionCommand(
      "update-project-settings",
      input,
      connection,
      dependencies
    );
  },
  "update-marketplace-product": async (options, connection, dependencies) => {
    const input = await readInputObject<MarketplaceProductInput>(
      dependencies,
      options
    );
    return runProjectSessionCommand(
      "update-marketplace-product",
      input,
      connection,
      dependencies
    );
  },
  "list-redirects": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "list-redirects",
      {
        cursor: options.cursor,
        limit: options.limit,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "create-redirect": async (options, connection, dependencies) => {
    const input = {
      old: requireOption(options.old, "--old"),
      new: requireOption(options.new, "--new"),
      status: redirectStatusOption(options.status),
    };
    return runProjectSessionCommand(
      "create-redirect",
      input,
      connection,
      dependencies
    );
  },
  "update-redirect": async (options, connection, dependencies) => {
    rejectOptionConflict(
      options.clearStatus,
      "--clear-status",
      options.status,
      "--status"
    );
    const input = {
      old: requireOption(options.old, "--old"),
      values: {
        old: options.newOld,
        new: options.new,
        status:
          options.clearStatus === true
            ? null
            : redirectStatusOption(options.status),
      },
    };
    return runProjectSessionCommand(
      "update-redirect",
      input,
      connection,
      dependencies
    );
  },
  "delete-redirect": async (options, connection, dependencies) => {
    const input = { old: requireOption(options.old, "--old") };
    return runProjectSessionCommand(
      "delete-redirect",
      input,
      connection,
      dependencies
    );
  },
  "set-redirects": async (options, connection, dependencies) => {
    const input = await readInputObject<SetRedirectsInput>(
      dependencies,
      options
    );
    return runProjectSessionCommand(
      "set-redirects",
      input,
      connection,
      dependencies
    );
  },
  "list-breakpoints": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "list-breakpoints",
      {
        cursor: options.cursor,
        limit: options.limit,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "create-breakpoint": async (options, connection, dependencies) => {
    const input: Omit<BreakpointInput, "id"> = {
      label: requireOption(options.label, "--label"),
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
      condition: options.condition,
    };
    return runProjectSessionCommand(
      "create-breakpoint",
      input,
      connection,
      dependencies
    );
  },
  "update-breakpoint": async (options, connection, dependencies) => {
    rejectOptionConflict(
      options.clearMinWidth,
      "--clear-min-width",
      options.minWidth,
      "--min-width"
    );
    rejectOptionConflict(
      options.clearMaxWidth,
      "--clear-max-width",
      options.maxWidth,
      "--max-width"
    );
    rejectOptionConflict(
      options.clearCondition,
      "--clear-condition",
      options.condition,
      "--condition"
    );
    const values: BreakpointUpdateInput = {
      label: options.label,
      minWidth: options.clearMinWidth === true ? null : options.minWidth,
      maxWidth: options.clearMaxWidth === true ? null : options.maxWidth,
      condition: options.clearCondition === true ? null : options.condition,
    };
    const input = {
      breakpointId: requireOption(options.breakpoint, "--breakpoint"),
      values,
    };
    return runProjectSessionCommand(
      "update-breakpoint",
      input,
      connection,
      dependencies
    );
  },
  "delete-breakpoint": async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = {
      breakpointId: requireOption(options.breakpoint, "--breakpoint"),
    };
    return runProjectSessionCommand(
      "delete-breakpoint",
      input,
      connection,
      dependencies
    );
  },
  "delete-page": async (options, connection, dependencies) => {
    const input = { pageId: requireOption(options.page, "--page") };
    return runProjectSessionCommand(
      "delete-page",
      input,
      connection,
      dependencies
    );
  },
  "duplicate-page": async (options, connection, dependencies) => {
    const substitutions =
      options.substitutions === undefined
        ? undefined
        : (JSON.parse(options.substitutions) as unknown);
    const input = {
      pageId: requireOption(options.page, "--page"),
      parentFolderId: options.parentFolder,
      name: options.name,
      path: options.path,
      substitutions,
    };
    return runProjectSessionCommand(
      "duplicate-page",
      input,
      connection,
      dependencies
    );
  },
  "list-page-templates": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "list-page-templates",
      {
        cursor: options.cursor,
        limit: options.limit,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "create-page-template": async (options, connection, dependencies) => {
    const input = {
      name: requireOption(options.name, "--name"),
      title: options.title,
      meta: getPageMetaOptions(options),
    };
    return runProjectSessionCommand(
      "create-page-template",
      input,
      connection,
      dependencies
    );
  },
  "update-page-template": async (options, connection, dependencies) => {
    const input = {
      templateId: requireOption(options.template, "--template"),
      values: {
        name: options.name,
        title: options.title,
        meta: getPageMetaOptions(options),
      },
    };
    return runProjectSessionCommand(
      "update-page-template",
      input,
      connection,
      dependencies
    );
  },
  "delete-page-template": async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = {
      templateId: requireOption(options.template, "--template"),
    };
    return runProjectSessionCommand(
      "delete-page-template",
      input,
      connection,
      dependencies
    );
  },
  "duplicate-page-template": async (options, connection, dependencies) => {
    const input = {
      projectId: connection.projectId,
      templateId: requireOption(options.template, "--template"),
    };
    return runProjectSessionCommand(
      "duplicate-page-template",
      input,
      connection,
      dependencies
    );
  },
  "reorder-page-template": async (options, connection, dependencies) => {
    const input = {
      sourceTemplateId: requireOption(
        options.sourceTemplate,
        "--source-template"
      ),
      targetTemplateId: requireOption(
        options.targetTemplate,
        "--target-template"
      ),
      position: requireOption(
        options.position === "before" || options.position === "after"
          ? options.position
          : undefined,
        "--position"
      ),
    };
    return runProjectSessionCommand(
      "reorder-page-template",
      input,
      connection,
      dependencies
    );
  },
  "create-page-from-template": async (options, connection, dependencies) => {
    const input = {
      projectId: connection.projectId,
      templateId: requireOption(options.template, "--template"),
      parentFolderId: options.parentFolder,
      name: requireOption(options.name, "--name"),
      path: requireOption(options.path, "--path"),
    };
    return runProjectSessionCommand(
      "create-page-from-template",
      input,
      connection,
      dependencies
    );
  },
  "list-folders": async (options, connection, dependencies) => {
    const input = {
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-folders",
      input,
      connection,
      dependencies
    );
  },
  "create-folder": async (options, connection, dependencies) => {
    const input = {
      name: requireOption(options.name, "--name"),
      slug: requireOption(options.slug, "--slug"),
      parentFolderId: options.parentFolder,
    };
    return runProjectSessionCommand(
      "create-folder",
      input,
      connection,
      dependencies
    );
  },
  "update-folder": async (options, connection, dependencies) => {
    const input = {
      folderId: requireOption(options.folder, "--folder"),
      values: {
        name: options.name,
        slug: options.slug,
        parentFolderId: options.parentFolder,
      },
    };
    return runProjectSessionCommand(
      "update-folder",
      input,
      connection,
      dependencies
    );
  },
  "delete-folder": async (options, connection, dependencies) => {
    const input = { folderId: requireOption(options.folder, "--folder") };
    return runProjectSessionCommand(
      "delete-folder",
      input,
      connection,
      dependencies
    );
  },
  "list-instances": async (options, connection, dependencies) => {
    const input = {
      pageId: options.page,
      pagePath: options.path,
      rootInstanceId: options.root,
      maxDepth: options.maxDepth,
      topLevelOnly: options.topLevel,
      component: options.component,
      tag: options.tag,
      labelContains: options.label,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-instances",
      input,
      connection,
      dependencies
    );
  },
  "inspect-instance": async (options, connection, dependencies) => {
    const input = {
      instanceId: requireSingleOption(options.instance, "--instance"),
      include: listOption(options.include),
      childDepth: options.childDepth,
    };
    return runProjectSessionCommand(
      "inspect-instance",
      input,
      connection,
      dependencies
    );
  },
  "insert-component": async (options, connection, dependencies) => {
    const input = {
      parentInstanceId: requireOption(options.parent, "--parent"),
      component: requireOption(options.component, "--component"),
      mode: instanceInsertModeOption(options.mode),
      insertIndex: options.insertIndex,
    };
    return runProjectSessionCommand(
      "insert-component",
      input,
      connection,
      dependencies
    );
  },
  "move-instance": async (options, connection, dependencies) => {
    const input = {
      moves: await readInputArray<MoveInstanceInput>(dependencies, options),
    };
    return runProjectSessionCommand(
      "move-instance",
      input,
      connection,
      dependencies
    );
  },
  "clone-instance": async (options, connection, dependencies) => {
    const input = {
      sourceInstanceId: requireOption(options.source, "--source"),
      targetParentInstanceId: options.parent,
      insertIndex: options.insertIndex,
    };
    return runProjectSessionCommand(
      "clone-instance",
      input,
      connection,
      dependencies
    );
  },
  "delete-instance": async (options, connection, dependencies) => {
    const input = {
      instanceIds: requireListOption(options.instance, "--instance"),
    };
    return runProjectSessionCommand(
      "delete-instance",
      input,
      connection,
      dependencies
    );
  },
  "update-props": async (options, connection, dependencies) => {
    const input = {
      updates: await readInputArray<PropUpdatesInput>(dependencies, options),
    };
    return runProjectSessionCommand(
      "update-props",
      input,
      connection,
      dependencies
    );
  },
  "delete-props": async (options, connection, dependencies) => {
    const input = {
      deletions: await readInputArray<PropDeletionsInput>(
        dependencies,
        options
      ),
    };
    return runProjectSessionCommand(
      "delete-props",
      input,
      connection,
      dependencies
    );
  },
  "bind-props": async (options, connection, dependencies) => {
    const input = {
      bindings: await readInputArray<PropBindingsInput>(dependencies, options),
    };
    return runProjectSessionCommand(
      "bind-props",
      input,
      connection,
      dependencies
    );
  },
  "list-texts": async (options, connection, dependencies) => {
    const input = {
      pageId: options.page,
      pagePath: options.path,
      instanceId:
        typeof options.instance === "string" ? options.instance : undefined,
      mode: textListModeOption(options.mode),
      contains: options.contains,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-texts",
      input,
      connection,
      dependencies
    );
  },
  "update-text": async (options, connection, dependencies) => {
    const input = {
      instanceId: requireSingleOption(options.instance, "--instance"),
      childIndex: requireNumberOption(options.childIndex, "--child-index"),
      text: requireStringOption(options.text, "--text"),
      mode: textUpdateModeOption(options.mode),
    };
    return runProjectSessionCommand(
      "update-text",
      input,
      connection,
      dependencies
    );
  },
  "get-styles": async (options, connection, dependencies) => {
    const input = {
      instanceIds:
        typeof options.instance === "string" ? [options.instance] : undefined,
      pageId: options.page,
      pagePath: options.path,
      breakpoint: options.breakpoint,
      state: options.state,
      property: options.property,
      propertyFilter: options.propertyFilter,
      includeTokens: options.includeTokens,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "get-styles",
      input,
      connection,
      dependencies
    );
  },
  "update-styles": async (options, connection, dependencies) => {
    const input = {
      updates: await readInputArray<StyleUpdatesInput>(dependencies, options),
    };
    return runProjectSessionCommand(
      "update-styles",
      input,
      connection,
      dependencies
    );
  },
  "delete-styles": async (options, connection, dependencies) => {
    const input = {
      deletions: await readInputArray<StyleDeletionsInput>(
        dependencies,
        options
      ),
    };
    return runProjectSessionCommand(
      "delete-styles",
      input,
      connection,
      dependencies
    );
  },
  "replace-styles": async (options, connection, dependencies) => {
    const input = await readInputObject<StyleReplaceInput>(
      dependencies,
      options
    );
    return runProjectSessionCommand(
      "replace-styles",
      input,
      connection,
      dependencies
    );
  },
  "list-design-tokens": async (options, connection, dependencies) => {
    const input = {
      filter: options.filter,
      withUsage: options.withUsage,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
      sort: designTokenSortOption(options.sort),
    };
    return runProjectSessionCommand(
      "list-design-tokens",
      input,
      connection,
      dependencies
    );
  },
  "create-design-token": async (options, connection, dependencies) => {
    const input = {
      tokens: await readInputArray<CreateDesignTokensInput>(
        dependencies,
        options
      ),
    };
    return runProjectSessionCommand(
      "create-design-token",
      input,
      connection,
      dependencies
    );
  },
  "import-design-tokens": async (options, connection, dependencies) => {
    const input = await readInputObject<ImportDesignTokensInput>(
      dependencies,
      options
    );
    return runProjectSessionCommand(
      "import-design-tokens",
      input,
      connection,
      dependencies
    );
  },
  "update-design-token-styles": async (options, connection, dependencies) => {
    const input = {
      designTokenId: requireOption(options.designToken, "--design-token"),
      updates: await readInputArray<UpdateDesignTokenStylesInput>(
        dependencies,
        options
      ),
    };
    return runProjectSessionCommand(
      "update-design-token-styles",
      input,
      connection,
      dependencies
    );
  },
  "delete-design-token-styles": async (options, connection, dependencies) => {
    const input = {
      designTokenId: requireOption(options.designToken, "--design-token"),
      deletions: await readInputArray<DeleteDesignTokenStylesInput>(
        dependencies,
        options
      ),
    };
    return runProjectSessionCommand(
      "delete-design-token-styles",
      input,
      connection,
      dependencies
    );
  },
  "attach-design-token": async (options, connection, dependencies) => {
    const input = {
      designTokenId: requireOption(options.designToken, "--design-token"),
      instanceIds: await readInputArray<string[]>(dependencies, options),
      position: options.position,
    };
    return runProjectSessionCommand(
      "attach-design-token",
      input,
      connection,
      dependencies
    );
  },
  "detach-design-token": async (options, connection, dependencies) => {
    const input = {
      designTokenId: requireOption(options.designToken, "--design-token"),
      instanceIds: await readInputArray<string[]>(dependencies, options),
    };
    return runProjectSessionCommand(
      "detach-design-token",
      input,
      connection,
      dependencies
    );
  },
  "extract-design-token": async (options, connection, dependencies) => {
    const input = await readInputObject<ExtractDesignTokenInput>(
      dependencies,
      options
    );
    return runProjectSessionCommand(
      "extract-design-token",
      input,
      connection,
      dependencies
    );
  },
  "list-css-variables": async (options, connection, dependencies) => {
    const input = {
      filter: options.filter,
      withUsage: options.withUsage,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-css-variables",
      input,
      connection,
      dependencies
    );
  },
  "define-css-variable": async (options, connection, dependencies) => {
    const input = {
      vars: await readInputObject<DefineCssVariablesInput>(
        dependencies,
        options
      ),
      overwrite: options.overwrite,
    };
    return runProjectSessionCommand(
      "define-css-variable",
      input,
      connection,
      dependencies
    );
  },
  "delete-css-variable": async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = {
      names: await readInputArray<DeleteCssVariablesInput>(
        dependencies,
        options
      ),
      force: options.force,
    };
    return runProjectSessionCommand(
      "delete-css-variable",
      input,
      connection,
      dependencies
    );
  },
  "rewrite-css-variable-refs": async (options, connection, dependencies) => {
    const input = {
      map: await readInputObject<RewriteCssVariableRefsInput>(
        dependencies,
        options
      ),
      scopeRegex: options.scopeRegex,
    };
    return runProjectSessionCommand(
      "rewrite-css-variable-refs",
      input,
      connection,
      dependencies
    );
  },
  "list-variables": async (options, connection, dependencies) => {
    const input = {
      scopeInstanceId: options.scopeInstance,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-variables",
      input,
      connection,
      dependencies
    );
  },
  "create-variable": async (options, connection, dependencies) => {
    const input = {
      scopeInstanceId: requireOption(options.scopeInstance, "--scope-instance"),
      name: requireOption(options.name, "--name"),
      value: parseVariableValue(options.valueType, options.value),
    };
    return runProjectSessionCommand(
      "create-variable",
      input,
      connection,
      dependencies
    );
  },
  "update-variable": async (options, connection, dependencies) => {
    const input = {
      dataSourceId: requireOption(options.variable, "--variable"),
      values: {
        scopeInstanceId: options.scopeInstance,
        name: options.name,
        value: parseOptionalVariableValue(options),
      },
    };
    return runProjectSessionCommand(
      "update-variable",
      input,
      connection,
      dependencies
    );
  },
  "delete-variable": async (options, connection, dependencies) => {
    const input = {
      dataSourceId: requireOption(options.variable, "--variable"),
    };
    return runProjectSessionCommand(
      "delete-variable",
      input,
      connection,
      dependencies
    );
  },
  "list-resources": async (options, connection, dependencies) => {
    const input = {
      scopeInstanceId: options.scopeInstance,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-resources",
      input,
      connection,
      dependencies
    );
  },
  "create-resource": async (options, connection, dependencies) => {
    const input = {
      resource: (await getResourceFields(
        dependencies,
        options,
        true
      )) as ResourceFieldsInput,
      scopeInstanceId: options.scopeInstance,
      dataSourceName: options.dataSourceName,
    };
    return runProjectSessionCommand(
      "create-resource",
      input,
      connection,
      dependencies
    );
  },
  "update-resource": async (options, connection, dependencies) => {
    const input = {
      resourceId: requireOption(options.resource, "--resource"),
      values: (await getResourceFields(
        dependencies,
        options,
        false
      )) as Partial<ResourceFieldsInput>,
      dataSourceName: options.dataSourceName,
      scopeInstanceId: options.scopeInstance,
    };
    return runProjectSessionCommand(
      "update-resource",
      input,
      connection,
      dependencies
    );
  },
  "delete-resource": async (options, connection, dependencies) => {
    const input = {
      resourceId: requireOption(options.resource, "--resource"),
      force: options.force,
    };
    return runProjectSessionCommand(
      "delete-resource",
      input,
      connection,
      dependencies
    );
  },
  publish: async (options, connection, dependencies) => {
    const input = {
      target: publishTargetValue(options.target),
      domains: listStringOption(options.domain),
      message: options.message,
      idempotencyKey: options.idempotencyKey,
    };
    return runProjectSessionCommand("publish", input, connection, dependencies);
  },
  "list-publishes": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "list-publishes",
      {
        cursor: options.cursor,
        limit: options.limit,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "get-publish-job": async (options, connection, dependencies) => {
    const input = { jobId: requireOption(options.job, "--job") };
    return runProjectSessionCommand(
      "get-publish-job",
      input,
      connection,
      dependencies
    );
  },
  unpublish: async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = {
      target: publishTargetValue(options.target),
      domains: listStringOption(options.domain),
      message: options.message,
      idempotencyKey: options.idempotencyKey,
    };
    return runProjectSessionCommand(
      "unpublish",
      input,
      connection,
      dependencies
    );
  },
  "list-domains": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "list-domains",
      {
        cursor: options.cursor,
        limit: options.limit,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "create-domain": async (options, connection, dependencies) => {
    const input = { domain: requireSingleOption(options.domain, "--domain") };
    return runProjectSessionCommand(
      "create-domain",
      input,
      connection,
      dependencies
    );
  },
  "update-domain": async (options, connection, dependencies) => {
    const input = {
      domainId: requireOption(options.domainId, "--domain-id"),
      updates: {
        ...(await readInputObject<UpdateDomainInput>(dependencies, options)),
        domain: typeof options.domain === "string" ? options.domain : undefined,
      },
    };
    return runProjectSessionCommand(
      "update-domain",
      input,
      connection,
      dependencies
    );
  },
  "delete-domain": async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = { domainId: requireOption(options.domainId, "--domain-id") };
    return runProjectSessionCommand(
      "delete-domain",
      input,
      connection,
      dependencies
    );
  },
  "verify-domain": async (options, connection, dependencies) => {
    const input = { domainId: requireOption(options.domainId, "--domain-id") };
    return runProjectSessionCommand(
      "verify-domain",
      input,
      connection,
      dependencies
    );
  },
  "list-assets": async (options, connection, dependencies) => {
    const input = {
      type: assetListTypeOption(options.type),
      sort: options.sort,
      withUsage: options.withUsage,
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "list-assets",
      input,
      connection,
      dependencies
    );
  },
  "get-asset": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "get-asset",
      { assetId: requireSingleOption(options.asset, "--asset") },
      connection,
      dependencies
    ),
  "list-fonts": async (options, connection, dependencies) =>
    runProjectSessionCommand(
      "list-fonts",
      {
        includeSystem: options.includeSystem,
        cursor: options.cursor,
        limit: options.limit,
        verbose: options.verbose,
      },
      connection,
      dependencies
    ),
  "upload-asset": async (options, connection, dependencies) => {
    const input = createLocalUploadAssetInput({
      asset: await readInputObject<UploadAssetInput>(dependencies, options),
      assetsDir: options.assetsDir,
      readFile: dependencies.readFile,
    });
    return runProjectSessionCommand(
      "upload-asset",
      input,
      connection,
      dependencies
    );
  },
  "upload-assets": async (options, connection, dependencies) => {
    const input = createLocalUploadAssetsInput({
      assets: await readInputArray<UploadAssetsInput>(dependencies, options),
      assetsDir: options.assetsDir,
      readFile: dependencies.readFile,
    });
    return runProjectSessionCommand(
      "upload-assets",
      input,
      connection,
      dependencies
    );
  },
  "find-asset-usage": async (options, connection, dependencies) => {
    const input = {
      assetId: requireSingleOption(options.asset, "--asset"),
      cursor: options.cursor,
      limit: options.limit,
      verbose: options.verbose,
    };
    return runProjectSessionCommand(
      "find-asset-usage",
      input,
      connection,
      dependencies
    );
  },
  "replace-asset": async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = {
      fromAssetId: requireOption(options.from, "--from"),
      toAssetId: requireOption(options.to, "--to"),
    };
    return runProjectSessionCommand(
      "replace-asset",
      input,
      connection,
      dependencies
    );
  },
  "delete-asset": async (options, connection, dependencies) => {
    requireTrueOption(options.confirm, "--confirm");
    const input = {
      assetIdsOrPrefixes: requireListOption(options.asset, "--asset"),
      force: options.force,
    };
    return runProjectSessionCommand(
      "delete-asset",
      input,
      connection,
      dependencies
    );
  },
};

export const apiCommand = async (
  options: ApiCommandOptions,
  dependencies = defaultDependencies
) => {
  const start = Date.now();
  let projectId: string | undefined;
  try {
    if (options.json !== true && options.command !== "audit") {
      throw new Error(`${options.command} currently requires --json.`);
    }

    const connection = await resolveApiConnection(dependencies);
    projectId = connection.projectId;
    const apiConnection = {
      ...connection,
      headers: apiCompatibilityHeaders,
    };

    const query = apiCommandHandlers[options.command];
    if (query === undefined) {
      throw new Error(
        `${options.command} is an MCP project-editing tool, not a high-level CLI API command. Use the MCP shortcut, for example: webstudio insert-fragment '{...}', or the explicit form: webstudio mcp single-op-call insert-fragment '{...}'.`
      );
    }
    const previousDryRun = activeApiCommandDryRun;
    const previousRefresh = activeApiCommandRefresh;
    activeApiCommandDryRun = options.dryRun === true;
    activeApiCommandRefresh = options.refresh === true;
    const response = await query(options, apiConnection, dependencies).finally(
      () => {
        activeApiCommandDryRun = previousDryRun;
        activeApiCommandRefresh = previousRefresh;
      }
    );
    const session = isProjectSessionEnvelope(response)
      ? getProjectSessionMeta(response)
      : undefined;
    const result = isProjectSessionEnvelope(response)
      ? response.result
      : response;
    if (options.command === "audit" && options.json !== true) {
      printAuditReport(result);
    } else {
      printJson({
        ok: true,
        data: result,
        meta: {
          command: options.command,
          projectId: connection.projectId,
          durationMs: Date.now() - start,
          ...(session === undefined ? {} : { session }),
        },
      });
    }
  } catch (error) {
    const issues = getCliErrorIssues(error);
    if (options.json === true) {
      const code = getErrorCode(error);
      printJson({
        ok: false,
        error: {
          code,
          message: getCliErrorSummary(error, options.command),
          ...(issues === undefined ? {} : { issues }),
          retry: getRetryHint(code),
        },
        meta: {
          command: options.command,
          projectId,
          durationMs: Date.now() - start,
        },
      });
    } else {
      console.error(getCliErrorMessage(error, options.command));
    }
    throw new HandledCliError();
  }
};
