import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { Grid, PanelBanner, Text } from "@webstudio-is/design-system";
import prettyBytes from "pretty-bytes";
import { CodeEditor } from "~/shared/code-editor";
import {
  RequestDiagnosticsContent,
  RequestDiagnosticsRow,
  RequestDiagnosticsTable,
} from "./request-inspector";

const runtimeContentNote =
  "Referenced documents fetched from storage at runtime are not included.";

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
    value: prettyBytes(value.query.unboundedBytes),
    valueColor: value.query.truncated ? ("destructive" as const) : undefined,
    description: `Temporary query-only footprint before the database limit is applied. It is not added to the published database size. ${runtimeContentNote}`,
  },
  {
    label: "Database size",
    value: prettyBytes(value.database.unboundedBytes),
    valueColor: value.database.truncated ? ("destructive" as const) : undefined,
    description: `Merged footprint of all reachable Assets queries before the database limit is applied. ${runtimeContentNote}`,
  },
];

export const ContentDatabaseDiagnostics = ({
  value,
}: {
  value: AssetQueryPreviewDiagnostics;
}) => {
  const totalDocumentCount =
    value.database.includedDocumentCount + value.database.omittedDocumentCount;
  const candidateFilesLabel = `${totalDocumentCount} candidate ${totalDocumentCount === 1 ? "file" : "files"}`;
  const omittedFilesLabel = `${value.database.omittedDocumentCount} ${value.database.omittedDocumentCount === 1 ? "file" : "files"}`;
  const rows = getContentDatabaseDiagnosticRows(value);
  return (
    <RequestDiagnosticsContent>
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
