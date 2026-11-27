import { Link, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { getPageById, getPagePath, ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import {
  findPageAndSelectorByInstanceId,
  formatPrePublishAuditFinding,
  runPrePublishAudit,
  type PrePublishAuditFinding,
} from "@webstudio-is/project-build/runtime";
import {
  $registeredComponentMetas,
  $selectedPage,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import {
  $assetFolders,
  $assets,
  $pages,
  $instances,
  $props,
  $dataSources,
  $resources,
} from "~/shared/sync/data-stores";
import { $publishDialog, openBuilderView } from "~/builder/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { getInstanceLink } from "~/shared/instance-utils/link";
import type { BuilderView } from "~/shared/router-utils/path-utils";
import { flushExternalContentProject } from "~/shared/external-content-roots";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { getContentDatabasePublishFindings } from "./content-database-publish-warning";
import { getPublishValidationErrorMessage } from "./publish-error";
import type { DiagnosticFinding } from "./diagnostics";

const getPrePublishInstanceTarget = (
  { instanceId, pageId, instanceSelector }: PrePublishAuditFinding["location"],
  view: BuilderView
) => {
  const pages = $pages.get();
  const instances = $instances.get();
  if (
    pages === undefined ||
    instanceId === undefined ||
    (instanceId !== ROOT_INSTANCE_ID && instances.has(instanceId) === false)
  ) {
    return;
  }
  const target =
    instanceId === ROOT_INSTANCE_ID
      ? {
          pageId: $selectedPage.get()?.id ?? pages.homePageId,
          instanceSelector: [instanceId],
        }
      : pageId !== undefined && instanceSelector !== undefined
        ? { pageId, instanceSelector }
        : findPageAndSelectorByInstanceId(pages, instances, instanceId);
  const href = getInstanceLink(target.instanceSelector, {
    pageId: target.pageId,
    view,
  });
  if (href === undefined) {
    return;
  }
  return { ...target, href, view };
};

const PrePublishInstanceLink = ({
  target,
}: {
  target: NonNullable<ReturnType<typeof getPrePublishInstanceTarget>>;
}) => {
  return (
    <Link
      href={target.href}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        $selectedPageId.set(target.pageId);
        selectInstance(target.instanceSelector);
        openBuilderView(target.view);
        $publishDialog.set("none");
      }}
    >
      Show instance
    </Link>
  );
};

type DiagnosticPrePublishAuditFinding = PrePublishAuditFinding & {
  severity: "error" | "warning";
};

const toPrePublishDiagnosticFinding = (
  finding: DiagnosticPrePublishAuditFinding
): DiagnosticFinding => {
  const location = finding.location;
  const isMissingResource = finding.ruleId === "resource-integrity";
  const isVariable = isMissingResource && location.dataSourceId !== undefined;
  const variable =
    isMissingResource && location.dataSourceId !== undefined
      ? $dataSources.get().get(location.dataSourceId)
      : undefined;
  const prop =
    isMissingResource && location.propId !== undefined
      ? $props.get().get(location.propId)
      : undefined;
  const instanceId =
    variable !== undefined
      ? (variable.scopeInstanceId ?? ROOT_INSTANCE_ID)
      : location.instanceId;
  const target = getPrePublishInstanceTarget(
    { ...location, instanceId },
    isVariable ? "settings/variables" : "settings"
  );
  const reportTitle = formatPrePublishAuditFinding(finding);
  let title = reportTitle;
  if (isMissingResource) {
    const sourceName = variable?.name ?? prop?.name;
    const source = isVariable ? "Resource variable" : "Resource prop";
    const instance =
      instanceId === undefined ? undefined : $instances.get().get(instanceId);
    const scope =
      instanceId === ROOT_INSTANCE_ID
        ? "Global root"
        : instance === undefined
          ? undefined
          : getInstanceLabel(instance);
    const pages = $pages.get();
    const page =
      pages !== undefined &&
      target !== undefined &&
      instanceId !== ROOT_INSTANCE_ID
        ? getPageById(pages, target.pageId)
        : undefined;
    title = formatPrePublishAuditFinding({
      ...finding,
      message: `${source}${sourceName === undefined ? "" : ` "${sourceName}"`}${scope === undefined ? "" : ` on "${scope}"`} references a missing resource.`,
      location:
        page === undefined || pages === undefined
          ? location
          : {
              ...location,
              pageName: page.name,
              pagePath: getPagePath(page.id, pages) || "/",
            },
    });
  }
  const context = Object.entries(location)
    .filter(([key, value]) => key !== "instanceSelector" && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`);
  return {
    severity: finding.severity,
    source: "audit",
    title,
    summary: title.slice(0, 160),
    link:
      target === undefined ? undefined : (
        <PrePublishInstanceLink target={target} />
      ),
    reportText: [
      `${finding.severity.toUpperCase()}: ${reportTitle}`,
      `Rule: ${finding.ruleId}`,
      ...context,
    ].join("\n"),
  };
};

export const getPublishAuditFindings = (
  findings: readonly PrePublishAuditFinding[]
): DiagnosticFinding[] =>
  findings
    .filter(
      (finding): finding is DiagnosticPrePublishAuditFinding =>
        finding.severity === "error" || finding.severity === "warning"
    )
    .map(toPrePublishDiagnosticFinding);

const getPrePublishAudit = () =>
  runPrePublishAudit({
    pages: $pages.get(),
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    assets: $assets.get(),
    metas: $registeredComponentMetas.get(),
  });

const getMissingResourceIssueSources = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return [];
  }
  const data = error.data;
  if (typeof data !== "object" || data === null || !("issues" in data)) {
    return [];
  }
  const issues = data.issues;
  if (Array.isArray(issues) === false) {
    return [];
  }
  const issueSources = issues.flatMap(
    (
      issue
    ): { source: "dataSource" | "prop"; id: string; resourceId: string }[] => {
      if (
        typeof issue !== "object" ||
        issue === null ||
        !("type" in issue) ||
        issue.type !== "missingResource"
      ) {
        return [];
      }
      if (
        "dataSourceId" in issue &&
        typeof issue.dataSourceId === "string" &&
        "resourceId" in issue &&
        typeof issue.resourceId === "string"
      ) {
        return [
          {
            source: "dataSource",
            id: issue.dataSourceId,
            resourceId: issue.resourceId,
          },
        ];
      }
      if (
        "propId" in issue &&
        typeof issue.propId === "string" &&
        "resourceId" in issue &&
        typeof issue.resourceId === "string"
      ) {
        return [
          { source: "prop", id: issue.propId, resourceId: issue.resourceId },
        ];
      }
      return [];
    }
  );
  return issueSources.length === issues.length ? issueSources : [];
};

export const runPublishDiagnostics = async (
  projectId: Project["id"],
  domains?: string[]
) => {
  const cssBuildWarningText =
    "Some project styles cannot be processed for publishing. Publishing can continue using base and font styles.";
  const audit = getPrePublishAudit();
  const auditFindings = getPublishAuditFindings(audit);
  let validation;
  try {
    validation =
      domains === undefined
        ? undefined
        : await nativeClient.build.validatePublish.query({
            projectId,
            target: "staging",
            domains,
          });
  } catch (error) {
    const issueSources = getMissingResourceIssueSources(error);
    if (
      issueSources.length > 0 &&
      issueSources.every(({ source, id, resourceId }) =>
        audit.some(
          (finding) =>
            finding.severity === "error" &&
            finding.ruleId === "resource-integrity" &&
            finding.location.resourceId === resourceId &&
            (source === "dataSource"
              ? finding.location.dataSourceId === id
              : finding.location.propId === id)
        )
      )
    ) {
      return { passed: false, findings: auditFindings };
    }
    throw error;
  }
  const diagnostics =
    validation?.diagnostics ??
    (await nativeClient.build.contentDatabasePublishDiagnostics.query({
      projectId,
    }));
  const contentFindings = getContentDatabasePublishFindings(diagnostics).map(
    (finding) => {
      const target = getPrePublishInstanceTarget(
        { instanceId: finding.relatedInstanceId },
        "settings"
      );
      return {
        ...finding,
        link:
          target === undefined ? undefined : (
            <PrePublishInstanceLink target={target} />
          ),
      };
    }
  );
  const cssWarning =
    validation?.cssValid === false
      ? [
          {
            severity: "warning" as const,
            title: cssBuildWarningText,
            reportText: cssBuildWarningText,
          },
        ]
      : [];
  const findings = [...auditFindings, ...contentFindings, ...cssWarning];
  return {
    passed: findings.every(({ severity }) => severity !== "error"),
    findings,
  };
};

export const runPublishValidation = async (
  projectId: Project["id"],
  domains: string[]
) => {
  await flushExternalContentProject({ projectId });
  return runPublishDiagnostics(projectId, domains);
};

export const reportPublishValidationFailure = (
  error: unknown,
  setFindings: (findings: DiagnosticFinding[]) => void,
  {
    publishingContinues = false,
    showToast = true,
  }: { publishingContinues?: boolean; showToast?: boolean } = {}
) => {
  const failureTitle = "Unable to complete publish validation";
  const hideDetails = getMissingResourceIssueSources(error).length > 0;
  const diagnosticMessage = getPublishValidationErrorMessage(error, {
    assets: $assets.get(),
    assetFolders: $assetFolders.get(),
  });
  const message = publishingContinues
    ? `${diagnosticMessage}\n\nThe publish request was sent without waiting for these diagnostics.`
    : diagnosticMessage;
  const visibleMessage = hideDetails ? failureTitle : message;
  if (showToast) {
    toast.error(visibleMessage.slice(0, 200));
  }
  const mcpUrl = "https://wstd.us/mcp";
  const mcpUrlIndex = message.indexOf(mcpUrl);
  const details = hideDetails ? undefined : mcpUrlIndex === -1 ? (
    message
  ) : (
    <>
      {message.slice(0, mcpUrlIndex)}
      <Link href={mcpUrl} target="_blank" rel="noreferrer">
        Webstudio MCP
      </Link>
      {message.slice(mcpUrlIndex + mcpUrl.length)}
    </>
  );
  setFindings([
    ...getPublishAuditFindings(getPrePublishAudit()),
    {
      severity: "error",
      title: publishingContinues
        ? "Publish checks couldn’t complete"
        : failureTitle,
      summary: visibleMessage.slice(0, 160),
      details,
      reportText: `ERROR: ${failureTitle}\n${message}`,
    },
  ]);
};
