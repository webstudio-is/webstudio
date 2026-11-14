import type { PublishValidationFinding } from "./diagnostics";
import type { PublishLog } from "./use-publish-logs";
import { publishLogStatus } from "./constants";

export const getDiagnosticsReport = ({
  findings,
  items,
  canViewPublishLogs,
  includeLatestPublishFindings = true,
}: {
  findings: PublishValidationFinding[];
  items: PublishLog[];
  canViewPublishLogs: boolean;
  includeLatestPublishFindings?: boolean;
}) => {
  const latestPublish = includeLatestPublishFindings ? items[0] : undefined;
  const reportFindings = [
    ...findings,
    ...(latestPublish?.findings ?? []),
    ...(latestPublish?.target === "static" && latestPublish.status === "failed"
      ? [
          {
            severity: "error" as const,
            source: "publish" as const,
            buildId: latestPublish.buildId,
            title: publishLogStatus.failed.text,
            reportText: publishLogStatus.failed.text,
          },
        ]
      : []),
    ...(canViewPublishLogs
      ? (latestPublish?.issues?.map<PublishValidationFinding>((issue) => ({
          severity: issue.severity,
          source: "build" as const,
          title: issue.message,
          reportText: `${issue.severity.toUpperCase()}: ${issue.message}`,
        })) ?? [])
      : []),
  ].filter(
    (finding, index, all) =>
      all.findIndex(
        (other) =>
          other.source === finding.source &&
          other.buildId === finding.buildId &&
          other.reportText === finding.reportText
      ) === index
  );
  const findingTabs = [
    {
      value: "warnings" as const,
      label: "Warnings",
      findings: reportFindings.filter(({ severity }) => severity === "warning"),
    },
    {
      value: "errors" as const,
      label: "Errors",
      findings: reportFindings.filter(({ severity }) => severity === "error"),
    },
  ];
  const populatedTabs = findingTabs.filter(
    ({ findings }) => findings.length > 0
  );
  const orderedItems = [...items].reverse();
  const reportText = reportFindings
    .map(({ reportText }) => reportText)
    .join("\n\n");
  const publishText = orderedItems
    .filter(
      (item) => item.logState === "available" && item.logText !== undefined
    )
    .map((item) =>
      [
        ...(item.domains.length > 0 ? item.domains : ["Static export"]),
        item.logText,
      ].join("\n")
    )
    .join("\n\n");
  return {
    findings: reportFindings,
    tabs: populatedTabs,
    publishes: orderedItems,
    reportText,
    publishText,
    issuesOmitted: latestPublish?.issuesOmitted,
  };
};
