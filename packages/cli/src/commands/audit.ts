import {
  apiCommand,
  auditCommandOptions,
  printAuditReport,
  type ApiCommandOptions,
} from "./api-command";
import { mcpSingleOpCall } from "./mcp";
import type { CommonYargsArgv } from "./yargs-types";

export const auditOptions = (yargs: CommonYargsArgv) =>
  auditCommandOptions(yargs)
    .option("rendered", {
      type: "boolean",
      describe:
        "Build and inspect rendered pages at responsive viewport widths",
    })
    .option("confirm-large-run", {
      type: "boolean",
      describe:
        "Confirm a rendered plan above the capture threshold; requires --confirmation-token",
    })
    .option("confirmation-token", {
      type: "string",
      describe: "Short-lived token returned by an unconfirmed large audit plan",
    })
    .option("image-domain", {
      type: "string",
      array: true,
      describe:
        "External image hostname allowed during rendered audit; repeat for multiple hosts",
    })
    .option("route-example", {
      type: "string",
      array: true,
      describe:
        "Concrete dynamic route as <pageId>=<path>; repeat for multiple pages",
    })
    .conflicts("page-id", "page-path")
    .conflicts("cursor", "rendered")
    .implies("confirm-large-run", "confirmation-token")
    .implies("confirmation-token", "rendered")
    .implies("image-domain", "rendered")
    .implies("route-example", "rendered")
    .example(
      "$0 audit --rendered --verbose --json",
      "Include responsive rendered checks"
    );

type AuditOptions = Omit<ApiCommandOptions, "command"> & {
  rendered?: boolean;
  confirmLargeRun?: boolean;
  confirmationToken?: string;
  imageDomain?: string[];
  routeExample?: string[];
};

export const parseRouteExamples = (values: string[] | undefined) =>
  values?.map((value) => {
    const separator = value.indexOf("=");
    const pageId = value.slice(0, separator);
    const path = value.slice(separator + 1);
    if (
      separator < 1 ||
      /^\/(?!\/)/.test(path) === false ||
      path.includes(":") ||
      path.includes("*")
    ) {
      throw new Error(
        "--route-example must use <pageId>=<concretePath>, for example post=/blog/hello."
      );
    }
    return { pageId, path };
  });

export const getRenderedAuditToolInput = (options: AuditOptions) => ({
  ...(options.scopes === undefined ? {} : { scopes: options.scopes }),
  ...(options.severities === undefined
    ? {}
    : { severities: options.severities }),
  ...(options.pagePath === undefined ? {} : { pagePath: options.pagePath }),
  ...(options.pageId === undefined ? {} : { pageId: options.pageId }),
  ...(options.limit === undefined ? {} : { limit: options.limit }),
  ...(options.verbose === true ? { verbose: true } : {}),
  ...(options.confirmLargeRun === true ? { confirmLargeRun: true } : {}),
  ...(options.confirmationToken === undefined
    ? {}
    : { confirmationToken: options.confirmationToken }),
  ...(options.imageDomain === undefined
    ? {}
    : { imageDomains: options.imageDomain }),
  ...(options.routeExample === undefined
    ? {}
    : { routeExamples: parseRouteExamples(options.routeExample) }),
  rendered: true,
});

export const audit = async (
  options: AuditOptions,
  dependencies = { apiCommand, mcpSingleOpCall }
) => {
  if (options.rendered !== true) {
    return dependencies.apiCommand({ ...options, command: "audit" });
  }
  return dependencies.mcpSingleOpCall({
    tool: "audit",
    input: JSON.stringify(getRenderedAuditToolInput(options)),
    dryRun: options.dryRun,
    refresh: options.refresh,
    json: options.json,
    ...(options.json === true ? {} : { printSuccess: printAuditReport }),
  });
};
