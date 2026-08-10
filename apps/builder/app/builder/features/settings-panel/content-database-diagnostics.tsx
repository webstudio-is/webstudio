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
  [
    "authorization",
    "Authorization",
    "Time spent authenticating the incoming Builder request and checking access to the project.",
  ],
  [
    "buildPlan",
    "Build plan",
    "Time spent loading the current build data and deriving the content required by the project.",
  ],
  [
    "repositoryAuthorization",
    "Repository authorization",
    "Time spent checking project access at the Assets repository boundary.",
  ],
  [
    "indexPreparation",
    "Index preparation",
    "Inclusive time spent preparing the in-memory query database. It contains the source snapshot, canonical metadata, compiler entries, and artifact compilation phases.",
  ],
  [
    "sourceSnapshot",
    "Source snapshot",
    "Time spent loading canonical asset entries and computing the source revision used by the compilation cache.",
  ],
  [
    "canonicalMetadata",
    "Canonical metadata",
    "Time spent synchronizing and loading structured metadata required by the query plan.",
  ],
  [
    "compilerEntries",
    "Compiler entries",
    "Time spent reading and parsing selected asset content into compiler input.",
  ],
  [
    "artifactCompilation",
    "Artifact compilation",
    "Time spent compiling prepared entries into the in-memory content database artifact.",
  ],
  [
    "runtimeAssets",
    "Runtime assets",
    "Time spent loading asset metadata needed to execute the query against the prepared database.",
  ],
  [
    "documentResolution",
    "Document resolution",
    "Time spent executing the query and resolving referenced documents, including required storage fetches.",
  ],
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

const ResourcePerformanceSections = ({
  value,
  includeResponseSize = true,
}: {
  value: ResourcePerformance;
  includeResponseSize?: boolean;
}) => {
  const hasTiming =
    value.loaderDurationMs !== undefined ||
    value.serverDurationMs !== undefined ||
    assetQueryPhaseRows.some(
      ([key]) => value.assetQuery?.phases?.[key] !== undefined
    );
  const hasQueryWork =
    value.assetQuery?.compilationCache !== undefined ||
    value.assetQuery?.resolvedDocumentCount !== undefined ||
    value.assetQuery?.documentFetchCount !== undefined;
  return (
    <>
      {hasTiming && (
        <>
          <Text variant="titles">Timing</Text>
          <RequestDiagnosticsTable>
            {value.loaderDurationMs !== undefined && (
              <RequestDiagnosticsRow
                label="Builder round trip"
                value={`${value.loaderDurationMs.toFixed(1)} ms`}
                description="Duration of the complete Builder resource batch request containing this resource."
              />
            )}
            {value.serverDurationMs !== undefined && (
              <RequestDiagnosticsRow
                label="Server duration"
                value={`${value.serverDurationMs.toFixed(1)} ms`}
                description="Time spent processing this resource on the Builder server, including authorization, loading, and result formatting."
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
          </RequestDiagnosticsTable>
        </>
      )}
      {hasQueryWork && (
        <>
          <Text variant="titles">Query work</Text>
          <RequestDiagnosticsTable>
            {value.assetQuery?.compilationCache !== undefined && (
              <RequestDiagnosticsRow
                label="Compilation cache"
                value={
                  compilationCacheLabels[value.assetQuery.compilationCache]
                }
                description="Whether this server process reused a compiled artifact, joined an in-progress compilation, compiled it on a miss, or ran with caching disabled."
              />
            )}
            {value.assetQuery?.resolvedDocumentCount !== undefined && (
              <RequestDiagnosticsRow
                label="Resolved documents"
                value={value.assetQuery.resolvedDocumentCount}
                description="Number of query result documents passed through document-reference resolution."
              />
            )}
            {value.assetQuery?.documentFetchCount !== undefined && (
              <RequestDiagnosticsRow
                label="Document fetches"
                value={value.assetQuery.documentFetchCount}
                description="Number of referenced document contents fetched from storage while resolving the query result."
              />
            )}
          </RequestDiagnosticsTable>
        </>
      )}
      {includeResponseSize && value.responseBytes !== undefined && (
        <>
          <Text variant="titles">Sizes</Text>
          <RequestDiagnosticsTable>
            <RequestDiagnosticsRow
              label="Response size"
              value={prettyBytes(value.responseBytes)}
              description="Serialized size of the server resource result before performance metadata is attached."
            />
          </RequestDiagnosticsTable>
        </>
      )}
    </>
  );
};

export const ResourcePerformanceDiagnostics = ({
  value,
}: {
  value: ResourcePerformance;
}) => (
  <RequestDiagnosticsContent>
    <ResourcePerformanceSections value={value} />
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
        <ResourcePerformanceSections
          value={performance}
          includeResponseSize={false}
        />
      )}
      <Text variant="titles">Database and sizes</Text>
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
        {performance?.responseBytes !== undefined && (
          <RequestDiagnosticsRow
            label="Response size"
            value={prettyBytes(performance.responseBytes)}
            description="Serialized size of the server resource result before performance metadata is attached."
          />
        )}
        <RequestDiagnosticsRow
          label="Scope"
          value="Query preview"
          description="These database measurements describe the current Assets query preview and its published-database context."
        />
        <RequestDiagnosticsRow
          label="Published database status"
          value={value.database.truncated ? "Truncated" : "Complete"}
          description="Whether every candidate document fits within the published content database limit."
        />
        {rows.map((row) => (
          <RequestDiagnosticsRow key={row.label} {...row} />
        ))}
        <RequestDiagnosticsRow
          label="Database limit"
          value={prettyBytes(value.database.maxBytes)}
          description="Maximum serialized size allowed for the merged published content database."
        />
        <RequestDiagnosticsRow
          label="Published included files"
          value={value.database.includedDocumentCount}
          description="Number of candidate files included in the published content database within the size limit."
        />
        <RequestDiagnosticsRow
          label="Published omitted files"
          value={value.database.omittedDocumentCount}
          description="Number of candidate files omitted from the published content database because of its size limit."
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
