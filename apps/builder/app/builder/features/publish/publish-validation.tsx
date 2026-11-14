import { type ReactNode } from "react";
import { Link, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import {
  findPageAndSelectorByInstanceId,
  formatPrePublishAuditFinding,
  runPrePublishAudit,
} from "@webstudio-is/project-build/runtime";
import {
  $registeredComponentMetas,
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
import { $publishDialog } from "~/builder/shared/nano-states";
import { getInstanceLink } from "~/shared/instance-utils/link";
import { flushExternalContentProject } from "~/shared/external-content-roots";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { getContentDatabasePublishFindings } from "./content-database-publish-warning";
import { getPublishValidationErrorMessage } from "./publish-error";
import type { PublishValidationFinding } from "./diagnostics";

const getPrePublishInstanceTarget = (
  instanceId: string,
  pageId?: string,
  instanceSelector?: string[]
) => {
  const pages = $pages.get();
  const instances = $instances.get();
  if (pages === undefined || instances.has(instanceId) === false) {
    return;
  }
  const target =
    pageId === undefined || instanceSelector === undefined
      ? findPageAndSelectorByInstanceId(pages, instances, instanceId)
      : { pageId, instanceSelector };
  const href = getInstanceLink(target.instanceSelector);
  if (href === undefined) {
    return;
  }
  return { ...target, href };
};

const PrePublishInstanceLink = ({
  instanceId,
  pageId,
  instanceSelector,
  children,
}: {
  instanceId: string;
  pageId?: string;
  instanceSelector?: string[];
  children: ReactNode;
}) => {
  const target = getPrePublishInstanceTarget(
    instanceId,
    pageId,
    instanceSelector
  );
  if (target === undefined) {
    return null;
  }
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
        $publishDialog.set("none");
      }}
    >
      {children}
    </Link>
  );
};

const getPrePublishAuditFindings = (): PublishValidationFinding[] => {
  const findings = runPrePublishAudit({
    pages: $pages.get(),
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    assets: $assets.get(),
    metas: $registeredComponentMetas.get(),
  });
  return findings.flatMap((finding) => {
    if (finding.severity !== "error" && finding.severity !== "warning") {
      return [];
    }
    const context = Object.entries(finding.location)
      .filter(
        ([key, value]) => key !== "instanceSelector" && value !== undefined
      )
      .map(([key, value]) => `${key}: ${value}`);
    const reportText = [
      `${finding.severity.toUpperCase()}: ${formatPrePublishAuditFinding(
        finding
      )}`,
      `Rule: ${finding.ruleId}`,
      ...context,
    ].join("\n");
    return [
      {
        severity: finding.severity,
        title: formatPrePublishAuditFinding(finding),
        summary: formatPrePublishAuditFinding(finding).slice(0, 160),
        link:
          finding.location.instanceId === undefined ? undefined : (
            <PrePublishInstanceLink
              instanceId={finding.location.instanceId}
              pageId={finding.location.pageId}
              instanceSelector={finding.location.instanceSelector}
            >
              Show element
            </PrePublishInstanceLink>
          ),
        details: context.length === 0 ? undefined : context.join(" · "),
        reportText,
      },
    ];
  });
};

export const runPublishDiagnostics = async (
  projectId: Project["id"],
  domains?: string[]
) => {
  const cssBuildWarningText =
    "Some project styles cannot be processed for publishing. Publishing can continue using base and font styles.";
  const auditFindings = getPrePublishAuditFindings();
  const validation =
    domains === undefined
      ? undefined
      : await nativeClient.api.publish.validate.query({
          projectId,
          target: "staging",
          domains,
        });
  const diagnostics =
    validation?.diagnostics ??
    (await nativeClient.build.contentDatabasePublishDiagnostics.query({
      projectId,
    }));
  const contentFindings = getContentDatabasePublishFindings(diagnostics).map(
    (finding) => ({
      ...finding,
      link:
        finding.relatedInstanceId === undefined ? undefined : (
          <PrePublishInstanceLink instanceId={finding.relatedInstanceId}>
            Open Content Block
          </PrePublishInstanceLink>
        ),
    })
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
  setFindings: (findings: PublishValidationFinding[]) => void,
  {
    publishingContinues = false,
    showToast = true,
  }: { publishingContinues?: boolean; showToast?: boolean } = {}
) => {
  const diagnosticMessage = getPublishValidationErrorMessage(error, {
    assets: $assets.get(),
    assetFolders: $assetFolders.get(),
  });
  const message = publishingContinues
    ? `${diagnosticMessage}\n\nThe publish request was sent without waiting for these diagnostics.`
    : diagnosticMessage;
  if (showToast) {
    toast.error(message.slice(0, 200));
  }
  const mcpUrl = "https://wstd.us/mcp";
  const mcpUrlIndex = message.indexOf(mcpUrl);
  const details =
    mcpUrlIndex === -1 ? (
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
    {
      severity: "error",
      title: publishingContinues
        ? "Publish checks couldn’t complete"
        : "Unable to complete publish validation",
      summary: message.slice(0, 160),
      details,
      reportText: `ERROR: Unable to complete publish validation\n${message}`,
    },
  ]);
};

export const getServerPublishFindings = (
  findings: readonly {
    severity: "error" | "warning" | "info";
    message: string;
  }[]
): PublishValidationFinding[] =>
  findings.flatMap((finding) =>
    finding.severity === "info"
      ? []
      : [
          {
            severity: finding.severity,
            title: finding.message,
            summary: finding.message,
            reportText: `${finding.severity.toUpperCase()}: ${finding.message}`,
          },
        ]
  );
