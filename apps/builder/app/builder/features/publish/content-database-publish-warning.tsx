import { Flex, Text } from "@webstudio-is/design-system";
import type { nativeClient } from "~/shared/trpc/trpc-client";
import { ContentDatabasePublishWarning } from "./content-database-publish-warning-view";
import type { PublishValidationFinding } from "./publish-validation-results";
import { showPublishWarning } from "./publish-warning";

type ContentDatabasePublishDiagnostics = Awaited<
  ReturnType<typeof nativeClient.build.contentDatabasePublishDiagnostics.query>
>;

export const getContentDatabasePublishFindings = (
  diagnostics: ContentDatabasePublishDiagnostics
) => {
  const findings: PublishValidationFinding[] = diagnostics.mdxErrors.map(
    ({ filename, diagnostic }) => {
      const start =
        "sourceRange" in diagnostic ? diagnostic.sourceRange?.start : undefined;
      const location =
        start === undefined ? "" : `:${start.line}:${start.column}`;
      const message =
        "message" in diagnostic ? diagnostic.message : diagnostic.code;
      const fix = message.includes("requires unavailable MDX Asset")
        ? "Choose an available MDX asset in this Content Block's source settings, or restore the missing asset."
        : message.includes("violates HTML spec")
          ? "Edit the MDX element nesting to satisfy the HTML content model. For nested links, remove one of the links."
          : "Open this MDX source and fix the reported error.";
      const context = [
        `Diagnostic code: ${diagnostic.code}`,
        `Content Block instance ID: ${diagnostic.blockInstanceId}`,
        diagnostic.assetId === undefined
          ? undefined
          : `Asset ID: ${diagnostic.assetId}`,
        diagnostic.contentRef === undefined
          ? undefined
          : `Content reference: ${diagnostic.contentRef}`,
        diagnostic.renderScope === undefined
          ? undefined
          : `Render scope: ${diagnostic.renderScope}`,
      ].filter((item): item is string => item !== undefined);
      const sourcePosition =
        start === undefined
          ? undefined
          : `Source position: ${start.line}:${start.column}`;
      return {
        severity: "error" as const,
        title: `${filename}${location}`,
        relatedInstanceId: diagnostic.blockInstanceId,
        details: (
          <Flex direction="column" gap={2}>
            <Text userSelect="text">{message}</Text>
            <Text userSelect="text">Fix: {fix}</Text>
            {sourcePosition !== undefined && (
              <Text userSelect="text">{sourcePosition}</Text>
            )}
            {context.map((item) => (
              <Text userSelect="text" key={item}>
                {item}
              </Text>
            ))}
          </Flex>
        ),
        reportText: [
          `ERROR: ${filename}${location}`,
          message,
          `Fix: ${fix}`,
          ...(sourcePosition === undefined ? [] : [sourcePosition]),
          ...context,
        ].join("\n"),
      };
    }
  );
  const databaseWarning =
    diagnostics.stats?.truncated &&
    diagnostics.stats.omissionReason !== undefined;
  findings.push(
    ...diagnostics.mdxOmissions.map((issue) => ({
      severity: "warning" as const,
      title: `${issue.filename}: ${issue.templateName}`,
      relatedInstanceId: issue.blockInstanceId,
      details: (
        <Flex direction="column" gap={2}>
          <Text userSelect="text">
            This MDX content cannot render because its custom template is
            missing or ambiguous. Add or repair the template in the Content
            Block.
          </Text>
          <Text userSelect="text">
            Content Block instance ID: {issue.blockInstanceId}
          </Text>
          <Text userSelect="text">Asset ID: {issue.assetId}</Text>
        </Flex>
      ),
      reportText: [
        `WARNING: ${issue.filename}: ${issue.templateName}`,
        "This MDX content cannot render because its custom template is missing or ambiguous. Add or repair the template in the Content Block.",
        `Content Block instance ID: ${issue.blockInstanceId}`,
        `Asset ID: ${issue.assetId}`,
      ].join("\n"),
    }))
  );
  if (
    databaseWarning &&
    diagnostics.stats !== undefined &&
    diagnostics.affectedResources !== undefined
  ) {
    const affectedResources = diagnostics.affectedResources
      .map(({ id, name, kind }) => `${kind} resource: ${name} (ID: ${id})`)
      .join("\n");
    const warningReport = [
      "WARNING: Some content database files will be omitted.",
      `Included documents: ${diagnostics.stats.includedDocumentCount}`,
      `Omitted documents: ${diagnostics.stats.omittedDocumentCount}`,
      `Omission reason: ${diagnostics.stats.omissionReason}`,
      ...(affectedResources.length === 0
        ? []
        : [`Affected resources:\n${affectedResources}`]),
    ].join("\n");
    findings.push({
      severity: "warning",
      title: "Some content database files will be omitted",
      reportText: warningReport,
      details: (
        <ContentDatabasePublishWarning
          diagnostics={{
            stats: diagnostics.stats,
            affectedResources: diagnostics.affectedResources,
          }}
        />
      ),
    });
  }
  return findings;
};

// Keep the warning helpers for callers that need to announce advisory warnings
// outside the publish check summary.
export const getContentDatabasePublishWarning = (
  diagnostics: ContentDatabasePublishDiagnostics
) => {
  const databaseWarning =
    diagnostics.stats?.truncated &&
    diagnostics.stats.omissionReason !== undefined;
  if (!databaseWarning && diagnostics.mdxOmissions.length === 0) {
    return;
  }
  return (
    <>
      {diagnostics.mdxOmissions.length > 0 && (
        <div>
          Some MDX content cannot render because its custom template is missing
          or ambiguous. Add or repair the template in the Content Block:
          <ul>
            {diagnostics.mdxOmissions.slice(0, 10).map((issue) => (
              <li key={JSON.stringify(issue)}>
                {issue.filename}: {issue.templateName}
              </li>
            ))}
          </ul>
          {diagnostics.mdxOmissions.length > 10 && (
            <div>
              And {diagnostics.mdxOmissions.length - 10} more template
              references.
            </div>
          )}
        </div>
      )}
      {databaseWarning &&
        diagnostics.stats !== undefined &&
        diagnostics.affectedResources !== undefined && (
          <ContentDatabasePublishWarning
            diagnostics={{
              stats: diagnostics.stats,
              affectedResources: diagnostics.affectedResources,
            }}
          />
        )}
    </>
  );
};

export const showContentDatabasePublishWarning = ({
  diagnostics,
  setWarning,
}: {
  diagnostics: Promise<ContentDatabasePublishDiagnostics>;
  setWarning: (warning: JSX.Element) => void;
}) => {
  void diagnostics
    .then((diagnostics) => {
      const warning = getContentDatabasePublishWarning(diagnostics);
      if (warning !== undefined) {
        showPublishWarning({ message: warning, setWarning });
      }
    })
    .catch(() => {
      // Content warnings are advisory and must not block publishing.
    });
};
