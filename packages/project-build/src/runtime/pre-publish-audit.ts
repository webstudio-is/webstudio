import {
  generateCss,
  getPagePath,
  getPublishablePages,
  type Assets,
  type Breakpoints,
  type DataSources,
  type Instances,
  type Pages,
  type Props,
  type Resources,
  type StyleSourceSelections,
  type Styles,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { parse as parseCss } from "css-tree";
import {
  formatBuildIntegrityIssue,
  getBuildIntegrityIssues,
} from "../build-integrity";
import { isTreeSatisfyingContentModel } from "./content-model";

export type PrePublishAuditFinding = {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  location: {
    pageId?: string;
    pageName?: string;
    pagePath?: string;
    instanceId?: string;
    dataSourceId?: string;
    propId?: string;
    resourceId?: string;
  };
};

export class PrePublishAuditError extends Error {
  findings: PrePublishAuditFinding[];
  attemptId?: string;

  constructor(findings: PrePublishAuditFinding[]) {
    const firstError = findings.find(({ severity }) => severity === "error");
    super(
      firstError === undefined
        ? "Pre-publish audit failed."
        : formatPrePublishAuditFinding(firstError)
    );
    this.name = "PrePublishAuditError";
    this.findings = findings;
  }
}

type PrePublishAuditContext = {
  pages: Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
  metas: Map<string, WsComponentMeta>;
  assets?: Assets;
  breakpoints?: Breakpoints;
  styles?: Styles;
  styleSourceSelections?: StyleSourceSelections;
};

type PrePublishAuditCheck = (
  context: PrePublishAuditContext
) => PrePublishAuditFinding[];

const checkHtmlContentModel: PrePublishAuditCheck = ({
  pages,
  instances,
  props,
  metas,
}) => {
  const findings: PrePublishAuditFinding[] = [];

  for (const page of getPublishablePages(pages)) {
    const pageFindings: PrePublishAuditFinding[] = [];
    const isValid = isTreeSatisfyingContentModel({
      instances,
      props,
      metas,
      instanceSelector: [page.rootInstanceId],
      onError: (error, instanceSelector) => {
        pageFindings.push({
          ruleId: "html-content-model",
          severity: "error",
          message: error,
          location: {
            pageId: page.id,
            pageName: page.name,
            pagePath: getPagePath(page.id, pages) || "/",
            instanceId: instanceSelector[0],
          },
        });
      },
    });

    if (isValid === false) {
      findings.push(
        ...(pageFindings.length > 0
          ? pageFindings
          : [
              {
                ruleId: "html-content-model",
                severity: "error" as const,
                message: "The page contains invalid element nesting.",
                location: {
                  pageId: page.id,
                  pageName: page.name,
                  pagePath: getPagePath(page.id, pages) || "/",
                },
              },
            ])
      );
    }
  }

  return findings;
};

const checkResourceIntegrity: PrePublishAuditCheck = ({
  dataSources,
  props,
  resources,
}) =>
  getBuildIntegrityIssues({
    dataSources: dataSources.values(),
    props: props.values(),
    resources: resources.values(),
  }).map((issue) => ({
    ruleId: "resource-integrity",
    severity: "error",
    message: formatBuildIntegrityIssue(issue),
    location: {
      ...(issue.source === "dataSource"
        ? { dataSourceId: issue.dataSourceId }
        : { propId: issue.propId }),
      resourceId: issue.resourceId,
    },
  }));

const checkGeneratedStylesheet: PrePublishAuditCheck = ({
  assets,
  breakpoints,
  instances,
  props,
  styles,
  styleSourceSelections,
  metas,
}) => {
  if (
    assets === undefined ||
    breakpoints === undefined ||
    styles === undefined ||
    styleSourceSelections === undefined
  ) {
    return [];
  }

  try {
    const { cssText } = generateCss({
      assets,
      breakpoints,
      instances,
      props,
      styles,
      styleSourceSelections,
      componentMetas: metas,
      assetBaseUrl: "/cgi/asset/",
      atomic: false,
    });
    return getGeneratedStylesheetFindings(cssText);
  } catch (error) {
    const details =
      error instanceof Error && error.message.trim().length > 0
        ? ` ${error.message}`
        : "";
    return [
      {
        ruleId: "generated-stylesheet",
        severity: "error",
        message: `The generated stylesheet contains invalid CSS.${details}`,
        location: {},
      },
    ];
  }
};

export const getGeneratedStylesheetFindings = (
  cssText: string
): PrePublishAuditFinding[] => {
  const errors: string[] = [];
  try {
    parseCss(cssText, {
      positions: true,
      onParseError: (error) => {
        errors.push(error.message);
      },
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "");
  }
  return Array.from(new Set(errors))
    .slice(0, 500)
    .map((error) => {
      const details = error.trim().length > 0 ? ` ${error}` : "";
      return {
        ruleId: "generated-stylesheet",
        severity: "error" as const,
        message: `The generated stylesheet contains invalid CSS.${details}`,
        location: {},
      };
    });
};

export const getGeneratedStylesheetFinding = (cssText: string) =>
  getGeneratedStylesheetFindings(cssText)[0];

const prePublishAuditChecks: PrePublishAuditCheck[] = [
  checkHtmlContentModel,
  checkResourceIntegrity,
  checkGeneratedStylesheet,
];

const maxAuditFindings = 500;

export const runPrePublishAudit = ({
  pages,
  ...context
}: Omit<PrePublishAuditContext, "pages"> & {
  pages: Pages | undefined;
}): PrePublishAuditFinding[] => {
  if (pages === undefined) {
    return [
      {
        ruleId: "project-data",
        severity: "error",
        message:
          "Project pages are unavailable. Reload the Builder and try again.",
        location: {},
      },
    ];
  }

  const findings: PrePublishAuditFinding[] = [];
  for (const check of prePublishAuditChecks) {
    try {
      findings.push(...check({ ...context, pages }));
    } catch {
      findings.push({
        ruleId: "validation-incomplete",
        severity: "error",
        message:
          "Part of the pre-publish audit could not complete. Review the other findings and try again.",
        location: {},
      });
    }
  }
  if (findings.length <= maxAuditFindings) {
    return findings;
  }
  const omittedCount = findings.length - maxAuditFindings + 1;
  return [
    ...findings.slice(0, maxAuditFindings - 1),
    {
      ruleId: "audit-truncated",
      severity: "warning",
      message: `${omittedCount} additional audit findings were omitted from this report.`,
      location: {},
    },
  ];
};

export const formatPrePublishAuditFinding = (
  finding: PrePublishAuditFinding
) => {
  const { pageName, pagePath } = finding.location;
  if (pageName === undefined || pagePath === undefined) {
    return `Cannot publish: ${finding.message}`;
  }
  return `Cannot publish "${pageName}" (${pagePath}): ${finding.message}`;
};
