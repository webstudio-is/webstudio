import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { PanelBanner, Text } from "@webstudio-is/design-system";
import prettyBytes from "pretty-bytes";
import {
  RequestDiagnosticsContent,
  RequestDiagnosticsRow,
  RequestDiagnosticsTable,
} from "./request-inspector";

const databaseSizeWarningRatio = 0.9;

export const isDatabaseSizeNearLimit = ({
  usedBytes,
  maxBytes,
}: Pick<AssetQueryPreviewDiagnostics["database"], "usedBytes" | "maxBytes">) =>
  usedBytes >= maxBytes * databaseSizeWarningRatio;

export const getContentDatabaseDiagnosticRows = (
  value: AssetQueryPreviewDiagnostics
) => [
  {
    label: "This query",
    value: prettyBytes(value.query.usedBytes),
    description:
      "Temporary query-only footprint. It is not a separate allowance and is not added to the published database size.",
  },
  {
    label: "This query full size",
    value: prettyBytes(value.query.unboundedBytes),
  },
  {
    label: "Published database",
    value: prettyBytes(value.database.usedBytes),
    description:
      "Merged footprint of all reachable Assets queries. This is the size that counts toward the database limit.",
  },
  {
    label: "Published database full size",
    value: prettyBytes(value.database.unboundedBytes),
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
  const isNearLimit = isDatabaseSizeNearLimit(value.database);
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
          <RequestDiagnosticsRow
            key={row.label}
            {...row}
            valueColor={
              row.label === "Published database" && isNearLimit
                ? "destructive"
                : undefined
            }
          />
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
    </RequestDiagnosticsContent>
  );
};
