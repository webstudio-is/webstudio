import {
  getPagePath,
  getPublishablePages,
  type Assets,
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
    assetId?: string;
  };
};

type PrePublishAuditContext = {
  pages: Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
  assets: Assets;
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
        severity: "warning",
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

const checkBuildIntegrity: PrePublishAuditCheck = ({
  dataSources,
  props,
  resources,
  instances,
  assets,
}) =>
  getBuildIntegrityIssues({
    dataSources: dataSources.values(),
    props: props.values(),
    resources: resources.values(),
    instances: instances.values(),
    assets: assets.values(),
  }).map((issue) => ({
    ruleId:
      issue.type === "missingResource"
        ? "resource-integrity"
        : "content-block-source-integrity",
    severity: "error",
    message: formatBuildIntegrityIssue(issue),
    location: {
      ...(issue.type === "missingResource"
        ? {
            ...(issue.source === "dataSource"
              ? { dataSourceId: issue.dataSourceId }
              : { propId: issue.propId }),
            resourceId: issue.resourceId,
          }
        : {
            instanceId: issue.blockInstanceId,
            ...(issue.type === "duplicateContentBlockSource"
              ? { propId: issue.propIds[0] }
              : { propId: issue.propId }),
            ...(issue.type === "missingContentBlockSourceAsset" ||
            issue.type === "incompatibleContentBlockSourceAsset"
              ? { assetId: issue.assetId }
              : {}),
          }),
    },
  }));

const prePublishAuditChecks: PrePublishAuditCheck[] = [
  checkHtmlContentModel,
  checkBuildIntegrity,
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
  const prefix =
    finding.severity === "error" ? "Cannot publish" : "Publish warning";
  if (pageName === undefined || pagePath === undefined) {
    return `${prefix}: ${finding.message}`;
  }
  return `${prefix} for "${pageName}" (${pagePath}): ${finding.message}`;
};
