import {
  getPagePath,
  getPublishablePages,
  type DataSources,
  type Instances,
  type Pages,
  type Props,
  type Resources,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
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

type PrePublishAuditContext = {
  pages: Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
  metas: Map<string, WsComponentMeta>;
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
    let message: string | undefined;
    let instanceId: string | undefined;
    const isValid = isTreeSatisfyingContentModel({
      instances,
      props,
      metas,
      instanceSelector: [page.rootInstanceId],
      onError: (error, instanceSelector) => {
        message ??= error;
        instanceId ??= instanceSelector[0];
      },
    });

    if (isValid === false) {
      findings.push({
        ruleId: "html-content-model",
        severity: "error",
        message: message ?? "The page contains invalid element nesting.",
        location: {
          pageId: page.id,
          pageName: page.name,
          pagePath: getPagePath(page.id, pages) || "/",
          instanceId,
        },
      });
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

const prePublishAuditChecks: PrePublishAuditCheck[] = [
  checkHtmlContentModel,
  checkResourceIntegrity,
];

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

  return prePublishAuditChecks.flatMap((check) => check({ ...context, pages }));
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
