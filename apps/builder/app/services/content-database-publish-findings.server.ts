import type { GetBuildFindings } from "@webstudio-is/domain/index.server";
import type { PrePublishAuditFinding } from "@webstudio-is/project-build/runtime";
import { loadProjectBundleByBuildId } from "~/shared/db/canvas.server";
import {
  getContentDatabasePublishDiagnostics,
  type ContentDatabasePublishDiagnostics,
} from "./content-database.server";

export const getContentDatabaseBuildFindings: GetBuildFindings = async (
  buildId,
  context
) => {
  return getContentDatabasePublishFindings(
    getContentDatabasePublishDiagnostics(
      await loadProjectBundleByBuildId(buildId, context)
    )
  );
};

export const getContentDatabasePublishFindings = (
  diagnostics: ContentDatabasePublishDiagnostics | undefined
): PrePublishAuditFinding[] => {
  if (
    diagnostics === undefined ||
    diagnostics.stats.truncated === false ||
    diagnostics.stats.omissionReason === undefined
  ) {
    return [];
  }

  const { stats, affectedResources } = diagnostics;
  const totalDocumentCount =
    stats.includedDocumentCount + stats.omittedDocumentCount;
  const omittedFileLabel = stats.omittedDocumentCount === 1 ? "file" : "files";
  const dynamicResourceNames = affectedResources
    .filter(({ kind }) => kind === "dynamic")
    .map(({ name }) => name);
  const staticResourceNames = affectedResources
    .filter(({ kind }) => kind === "static")
    .map(({ name }) => name);
  const message = [
    `The merged published content database will include ${stats.includedDocumentCount} of ${totalDocumentCount} files (${Math.ceil(stats.usedBytes / 1024)} of ${Math.ceil(stats.maxBytes / 1024)} KiB). ${stats.omittedDocumentCount} ${omittedFileLabel} will be omitted ${stats.omissionReason === "size" ? "because the complete database exceeds the size limit" : "because the required content could not be embedded"}.`,
    dynamicResourceNames.length > 0
      ? `Assets resources with route or variable values cannot be checked exactly and may return incomplete results: ${dynamicResourceNames.join(", ")}.`
      : undefined,
    staticResourceNames.length > 0
      ? `Potentially affected Assets resources: ${staticResourceNames.join(", ")}.`
      : undefined,
  ]
    .filter((value) => value !== undefined)
    .join(" ");
  return [
    {
      ruleId: "content-database-truncated",
      severity: "warning",
      message: message.length <= 4096 ? message : `${message.slice(0, 4095)}…`,
      location: {},
    },
  ];
};
