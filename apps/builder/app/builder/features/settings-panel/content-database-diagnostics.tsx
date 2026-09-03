import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import {
  PanelBanner,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Text,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import type { ReactNode } from "react";
import prettyBytes from "pretty-bytes";
import type { ResourcePerformance } from "~/shared/resource-diagnostics";
import { CodeEditor } from "~/shared/code-editor";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import {
  RequestDiagnosticsRow,
  RequestDiagnosticsContent,
  RequestDiagnosticsTable,
} from "./request-inspector";

const runtimeContentNote =
  "Referenced documents fetched from storage at runtime are not included.";

const assetBatchTimingNote =
  "When one Builder request contains multiple Assets resources, this duration covers their combined batch.";

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
    "diagnosticsPreparation",
    "Published diagnostics",
    "Inclusive time spent compiling the deployment-wide database only for detailed Diagnostics. This work is not part of the normal resource load, and its internal phases are excluded from the rows below.",
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
    "compilerContentRead",
    "Compiler storage reads",
    "Cumulative time spent on completed storage reads while preparing compiler entries. Concurrent read durations are summed, so this child measurement can exceed wall-clock phase time.",
  ],
  [
    "documentGraph",
    "Document graph",
    "Time spent reading supported documents and compiling their cross-document references.",
  ],
  [
    "documentGraphContentRead",
    "Document graph storage reads",
    "Cumulative time spent on completed storage reads while constructing the document graph. Cached request-local bytes are excluded, and concurrent read durations are summed.",
  ],
  [
    "assetReferences",
    "Asset references",
    "Time spent discovering asset references in the selected document content.",
  ],
  [
    "sourceValidation",
    "Source validation",
    "Time spent reloading the canonical inventory to confirm that the source did not change during compilation.",
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

const compilationWorkLabels = {
  hit: "Reused",
  coalesced: "Joined",
  miss: "Compiled",
  disabled: "Reuse disabled",
} as const;

const DiagnosticsSection = ({
  label,
  data,
  isOpen,
  children,
}: {
  label: string;
  data: unknown;
  isOpen?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useOpenState(label, isOpen);
  return (
    <CollapsibleSectionRoot
      isOpen={open}
      onOpenChange={setOpen}
      trigger={
        <SectionTitle
          suffix={
            <CopyToClipboard
              text={JSON.stringify(data, undefined, 2) ?? "null"}
              copyText={`Copy ${label} as JSON`}
            >
              <SectionTitleButton
                type="button"
                tabIndex={0}
                aria-label={`Copy ${label} as JSON`}
                prefix={<CopyIcon />}
                onPointerDown={(event) => event.stopPropagation()}
              />
            </CopyToClipboard>
          }
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

const ReadonlyJsonEditor = ({ value }: { value: unknown }) => (
  <CodeEditor
    lang="json"
    readOnly
    value={JSON.stringify(value, undefined, 2)}
    onChange={() => {}}
    onChangeComplete={() => {}}
  />
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

const PerformanceSizeRows = ({ value }: { value: ResourcePerformance }) => (
  <>
    {value.responseBytes !== undefined && (
      <RequestDiagnosticsRow
        label="Response size"
        value={prettyBytes(value.responseBytes)}
        description="Serialized size of the server resource result before performance metadata is attached."
      />
    )}
    {value.assetQuery?.compilerContentBytes !== undefined && (
      <RequestDiagnosticsRow
        label="Compiler content read"
        value={prettyBytes(value.assetQuery.compilerContentBytes)}
        description="Total bytes read from storage while preparing compiler entries for the Assets batch."
      />
    )}
    {value.assetQuery?.documentGraphContentBytes !== undefined && (
      <RequestDiagnosticsRow
        label="Document graph content read"
        value={prettyBytes(value.assetQuery.documentGraphContentBytes)}
        description="Total bytes read from storage while constructing document graphs for the Assets batch."
      />
    )}
  </>
);

const getPerformanceSizes = (value?: ResourcePerformance) => ({
  responseBytes: value?.responseBytes,
  compilerContentBytes: value?.assetQuery?.compilerContentBytes,
  documentGraphContentBytes: value?.assetQuery?.documentGraphContentBytes,
});

const hasDefinedValue = (value: Record<string, unknown>) =>
  Object.values(value).some((item) => item !== undefined);

const ResourcePerformanceSections = ({
  value,
  includeSizes = true,
  openFirst = true,
}: {
  value: ResourcePerformance;
  includeSizes?: boolean;
  openFirst?: boolean;
}) => {
  const sizes = getPerformanceSizes(value);
  const timing = {
    builderRoundTripMs: value.loaderDurationMs,
    serverDurationMs: value.serverDurationMs,
    phases: value.assetQuery?.phases,
  };
  const queryWork = {
    compilationWork: value.assetQuery?.compilationCache,
    compilerContentFetchCount: value.assetQuery?.compilerContentFetchCount,
    documentGraphContentFetchCount:
      value.assetQuery?.documentGraphContentFetchCount,
    resolvedDocumentCount: value.assetQuery?.resolvedDocumentCount,
    documentFetchCount: value.assetQuery?.documentFetchCount,
  };
  const hasSizes = includeSizes && hasDefinedValue(sizes);
  const hasTiming =
    timing.builderRoundTripMs !== undefined ||
    timing.serverDurationMs !== undefined ||
    hasDefinedValue(timing.phases ?? {});
  const hasQueryWork = hasDefinedValue(queryWork);
  return (
    <>
      {hasSizes && (
        <DiagnosticsSection label="Sizes" data={sizes} isOpen={openFirst}>
          <RequestDiagnosticsTable>
            <PerformanceSizeRows value={value} />
          </RequestDiagnosticsTable>
        </DiagnosticsSection>
      )}
      {hasTiming && (
        <DiagnosticsSection
          label="Timing"
          data={timing}
          isOpen={openFirst && hasSizes === false}
        >
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
                  description={`${description} ${assetBatchTimingNote}`}
                />
              );
            })}
          </RequestDiagnosticsTable>
        </DiagnosticsSection>
      )}
      {hasQueryWork && (
        <DiagnosticsSection
          label="Assets batch work"
          data={queryWork}
          isOpen={openFirst && hasSizes === false && hasTiming === false}
        >
          <RequestDiagnosticsTable>
            {value.assetQuery?.compilationCache !== undefined && (
              <RequestDiagnosticsRow
                label="Compilation work"
                value={compilationWorkLabels[value.assetQuery.compilationCache]}
                description="Whether this Assets batch reused an artifact compiled earlier in the same request, joined matching in-progress work, compiled it on a miss, or ran with reuse disabled."
              />
            )}
            {value.assetQuery?.compilerContentFetchCount !== undefined && (
              <RequestDiagnosticsRow
                label="Compiler content fetches"
                value={value.assetQuery.compilerContentFetchCount}
                description="Number of asset contents read from storage while preparing compiler entries for the Assets batch."
              />
            )}
            {value.assetQuery?.documentGraphContentFetchCount !== undefined && (
              <RequestDiagnosticsRow
                label="Document graph content fetches"
                value={value.assetQuery.documentGraphContentFetchCount}
                description="Number of document contents read from storage while constructing document graphs for the Assets batch."
              />
            )}
            {value.assetQuery?.resolvedDocumentCount !== undefined && (
              <RequestDiagnosticsRow
                label="Resolved documents"
                value={value.assetQuery.resolvedDocumentCount}
                description="Number of query result documents passed through document-reference resolution across the Assets batch."
              />
            )}
            {value.assetQuery?.documentFetchCount !== undefined && (
              <RequestDiagnosticsRow
                label="Document fetches"
                value={value.assetQuery.documentFetchCount}
                description="Number of referenced documents loaded while resolving the Assets batch, including request-local byte reuse."
              />
            )}
          </RequestDiagnosticsTable>
        </DiagnosticsSection>
      )}
    </>
  );
};

export const ResourcePerformanceDiagnostics = ({
  value,
}: {
  value: ResourcePerformance;
}) => (
  <RequestDiagnosticsContent padded={false}>
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
  const candidateFilesLabel = `${totalDocumentCount} candidate ${
    totalDocumentCount === 1 ? "file" : "files"
  }`;
  const omittedFilesLabel = `${value.database.omittedDocumentCount} ${
    value.database.omittedDocumentCount === 1 ? "file" : "files"
  }`;
  const rows = getContentDatabaseDiagnosticRows(value);
  const errorCount =
    value.issues?.filter(({ severity }) => severity === "error").length ?? 0;
  const warningCount =
    (value.issues?.filter(({ severity }) => severity === "warning").length ??
      0) + (value.queryIssues?.length ?? value.queryWarnings?.length ?? 0);
  const databaseAndSizes = {
    ...getPerformanceSizes(performance),
    scope: value.scope,
    query: value.query,
    database: value.database,
  };
  return (
    <RequestDiagnosticsContent padded={false}>
      {(value.issues !== undefined && value.issues.length > 0) ||
      (value.queryIssues !== undefined && value.queryIssues.length > 0) ||
      (value.queryWarnings !== undefined && value.queryWarnings.length > 0) ? (
        <DiagnosticsSection
          label="Errors and warnings"
          data={{
            queryIssues: value.queryIssues,
            queryWarnings: value.queryWarnings,
            issues: value.issues,
          }}
          isOpen
        >
          <PanelBanner
            variant={
              value.issues?.some(({ severity }) => severity === "error") ===
              true
                ? "error"
                : "warning"
            }
          >
            <Text>
              {errorCount} {errorCount === 1 ? "error" : "errors"} and{" "}
              {warningCount} {warningCount === 1 ? "warning" : "warnings"}
              {value.issuesTruncated
                ? `; showing the first ${value.issues?.length ?? 0}.`
                : "."}
            </Text>
          </PanelBanner>
          <RequestDiagnosticsTable>
            {value.queryIssues !== undefined
              ? value.queryIssues.map((issue, index) => (
                  <RequestDiagnosticsRow
                    key={`${issue.path.join(".")}:${issue.code}:${index}`}
                    label={`Warning · Query · ${issue.path.join(".")}`}
                    value={issue.message}
                    description={issue.code}
                  />
                ))
              : value.queryWarnings?.map((warning, index) => (
                  <RequestDiagnosticsRow
                    key={`query-warning:${index}`}
                    label="Warning · Query setup"
                    value={warning}
                    description="Current query"
                  />
                ))}
            {value.issues?.map((issue, index) => (
              <RequestDiagnosticsRow
                key={`${issue.scope}:${issue.assetId}:${issue.code}:${index}`}
                label={`${issue.severity === "error" ? "Error" : "Warning"} · ${
                  issue.path
                }${
                  issue.line === undefined
                    ? ""
                    : `:${issue.line}${
                        issue.column === undefined ? "" : `:${issue.column}`
                      }`
                }`}
                value={issue.message}
                description={`${
                  issue.scope === "query"
                    ? "Current query"
                    : "Published database"
                } · ${issue.code}`}
              />
            ))}
          </RequestDiagnosticsTable>
        </DiagnosticsSection>
      ) : undefined}
      <DiagnosticsSection
        label="Database and sizes"
        data={databaseAndSizes}
        isOpen
      >
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
          {performance !== undefined && (
            <PerformanceSizeRows value={performance} />
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
      </DiagnosticsSection>
      {performance !== undefined && (
        <ResourcePerformanceSections
          value={performance}
          includeSizes={false}
          openFirst={false}
        />
      )}
      {value.artifacts !== undefined && (
        <>
          <DiagnosticsSection
            label={
              value.query.truncated
                ? "Included query database"
                : "Query database"
            }
            data={value.artifacts.query}
            isOpen={false}
          >
            <ReadonlyJsonEditor value={value.artifacts.query} />
          </DiagnosticsSection>
          <DiagnosticsSection
            label={
              value.database.truncated
                ? "Included published database"
                : "Published database"
            }
            data={value.artifacts.database}
            isOpen={false}
          >
            <ReadonlyJsonEditor value={value.artifacts.database} />
          </DiagnosticsSection>
        </>
      )}
      {value.unresolved !== undefined && (
        <DiagnosticsSection
          label="Unresolved query result"
          data={value.unresolved}
          isOpen={false}
        >
          <ReadonlyJsonEditor value={value.unresolved} />
        </DiagnosticsSection>
      )}
    </RequestDiagnosticsContent>
  );
};
