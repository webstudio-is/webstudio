import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { Grid, PanelBanner, Text } from "@webstudio-is/design-system";
import prettyBytes from "pretty-bytes";
import type { ResourcePerformance } from "~/shared/resource-diagnostics";
import { CodeEditor } from "~/shared/code-editor";
import {
  RequestDiagnosticsContent,
  RequestDiagnosticsRow,
  RequestDiagnosticsTable,
} from "./request-inspector";

const runtimeContentNote =
  "Referenced documents fetched from storage at runtime are not included.";

const assetQueryPhaseRows = [
  ["authorization", "Authorization", undefined],
  ["buildPlan", "Build plan", undefined],
  ["repositoryAuthorization", "Repository authorization", undefined],
  ["sourceSnapshot", "Source snapshot", undefined],
  ["canonicalMetadata", "Canonical metadata", undefined],
  ["compilerEntries", "Compiler entries", undefined],
  ["artifactCompilation", "Artifact compilation", undefined],
  [
    "indexPreparation",
    "Index preparation",
    "Inclusive duration. It contains the source, metadata, compiler entry, and artifact compilation phases shown above.",
  ],
  ["runtimeAssets", "Runtime assets", undefined],
  ["documentResolution", "Document resolution", undefined],
] as const;

const compilationCacheLabels = {
  hit: "Hit",
  coalesced: "Coalesced",
  miss: "Miss",
  disabled: "Disabled",
} as const;

const ReadonlyJsonEditor = ({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) => (
  <Grid gap={1}>
    <Text variant="titles">{title}</Text>
    <CodeEditor
      lang="json"
      readOnly
      value={JSON.stringify(value, undefined, 2)}
      onChange={() => {}}
      onChangeComplete={() => {}}
    />
  </Grid>
);

export const getContentDatabaseDiagnosticRows = (
  value: AssetQueryPreviewDiagnostics
) => [
  {
    label: "Query size",
    value: prettyBytes(value.query.usedBytes),
    valueColor:
      value.query.omissionReason === "size"
        ? ("destructive" as const)
        : undefined,
    description: `Serialized temporary query-only footprint after the database limit is applied. It is not added to the published database size. ${runtimeContentNote}`,
  },
  {
    label: "Database size",
    value: prettyBytes(value.database.usedBytes),
    valueColor:
      value.database.omissionReason === "size"
        ? ("destructive" as const)
        : undefined,
    description: `Serialized merged footprint of all reachable Assets queries included in the published bundle. ${runtimeContentNote}`,
  },
];

const ResourcePerformanceSection = ({
  value,
}: {
  value: ResourcePerformance;
}) => (
  <>
    <Text variant="titles">Performance</Text>
    <RequestDiagnosticsTable>
      {value.serverDurationMs !== undefined && (
        <RequestDiagnosticsRow
          label="Server duration"
          value={`${value.serverDurationMs.toFixed(1)} ms`}
        />
      )}
      {value.loaderDurationMs !== undefined && (
        <RequestDiagnosticsRow
          label="Builder round trip"
          value={`${value.loaderDurationMs.toFixed(1)} ms`}
          description="Duration of the complete Builder resource batch request containing this resource."
        />
      )}
      {value.responseBytes !== undefined && (
        <RequestDiagnosticsRow
          label="Response size"
          value={prettyBytes(value.responseBytes)}
        />
      )}
      {assetQueryPhaseRows.map(([key, label, description]) => {
        const durationMs = value.assetQuery?.phases?.[key];
        if (durationMs === undefined) {
          return;
        }
        return (
          <RequestDiagnosticsRow
            key={key}
            label={label}
            value={`${durationMs.toFixed(1)} ms`}
            description={description}
          />
        );
      })}
      {value.assetQuery?.compilationCache !== undefined && (
        <RequestDiagnosticsRow
          label="Compilation cache"
          value={compilationCacheLabels[value.assetQuery.compilationCache]}
        />
      )}
      {value.assetQuery?.resolvedDocumentCount !== undefined && (
        <RequestDiagnosticsRow
          label="Resolved documents"
          value={value.assetQuery.resolvedDocumentCount}
        />
      )}
      {value.assetQuery?.documentFetchCount !== undefined && (
        <RequestDiagnosticsRow
          label="Document fetches"
          value={value.assetQuery.documentFetchCount}
        />
      )}
    </RequestDiagnosticsTable>
  </>
);

export const ResourcePerformanceDiagnostics = ({
  value,
}: {
  value: ResourcePerformance;
}) => (
  <RequestDiagnosticsContent>
    <ResourcePerformanceSection value={value} />
  </RequestDiagnosticsContent>
);

export const ContentDatabaseDiagnostics = ({
  value,
  performance,
}: {
  value: AssetQueryPreviewDiagnostics;
  performance?: ResourcePerformance;
}) => {
  const totalDocumentCount =
    value.database.includedDocumentCount + value.database.omittedDocumentCount;
  const candidateFilesLabel = `${totalDocumentCount} candidate ${totalDocumentCount === 1 ? "file" : "files"}`;
  const omittedFilesLabel = `${value.database.omittedDocumentCount} ${value.database.omittedDocumentCount === 1 ? "file" : "files"}`;
  const rows = getContentDatabaseDiagnosticRows(value);
  return (
    <RequestDiagnosticsContent>
      {performance !== undefined && (
        <ResourcePerformanceSection value={performance} />
      )}
      <PanelBanner variant={value.database.truncated ? "warning" : "success"}>
        <Text>
          {value.database.truncated
            ? `${value.database.includedDocumentCount} of ${candidateFilesLabel} fit in the merged published content database. ${omittedFilesLabel} may be omitted from published query results.`
            : totalDocumentCount === 1
              ? "The candidate file fits in the merged published content database."
              : `All ${candidateFilesLabel} fit in the merged published content database.`}
        </Text>
      </PanelBanner>
      <RequestDiagnosticsTable>
        <RequestDiagnosticsRow label="Scope" value="Query preview" />
        <RequestDiagnosticsRow
          label="Published database status"
          value={value.database.truncated ? "Truncated" : "Complete"}
        />
        {rows.map((row) => (
          <RequestDiagnosticsRow key={row.label} {...row} />
        ))}
        <RequestDiagnosticsRow
          label="Database limit"
          value={prettyBytes(value.database.maxBytes)}
        />
        <RequestDiagnosticsRow
          label="Published included files"
          value={value.database.includedDocumentCount}
        />
        <RequestDiagnosticsRow
          label="Published omitted files"
          value={value.database.omittedDocumentCount}
        />
      </RequestDiagnosticsTable>
      {value.artifacts !== undefined && (
        <>
          <ReadonlyJsonEditor
            title={
              value.query.truncated
                ? "Included query database"
                : "Query database"
            }
            value={value.artifacts.query}
          />
          <ReadonlyJsonEditor
            title={
              value.database.truncated
                ? "Included published database"
                : "Published database"
            }
            value={value.artifacts.database}
          />
        </>
      )}
      {value.unresolved !== undefined && (
        <ReadonlyJsonEditor
          title="Unresolved query result"
          value={value.unresolved}
        />
      )}
    </RequestDiagnosticsContent>
  );
};
