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
}: Pick<AssetQueryPreviewDiagnostics, "usedBytes" | "maxBytes">) =>
  usedBytes >= maxBytes * databaseSizeWarningRatio;

export const ContentDatabaseDiagnostics = ({
  value,
}: {
  value: AssetQueryPreviewDiagnostics;
}) => {
  const totalDocumentCount =
    value.includedDocumentCount + value.omittedDocumentCount;
  const candidateFilesLabel = `${totalDocumentCount} candidate ${totalDocumentCount === 1 ? "file" : "files"}`;
  const omittedFilesLabel = `${value.omittedDocumentCount} ${value.omittedDocumentCount === 1 ? "file" : "files"}`;
  const isNearLimit = isDatabaseSizeNearLimit(value);
  return (
    <RequestDiagnosticsContent>
      <PanelBanner variant={value.truncated ? "warning" : "success"}>
        <Text>
          {value.truncated
            ? `${value.includedDocumentCount} of ${candidateFilesLabel} fit in the content database. ${omittedFilesLabel} may be omitted from published query results.`
            : totalDocumentCount === 1
              ? "The candidate file fits in the content database."
              : `All ${candidateFilesLabel} fit in the content database.`}
        </Text>
      </PanelBanner>
      <RequestDiagnosticsTable>
        <RequestDiagnosticsRow label="Scope" value="Query preview" />
        <RequestDiagnosticsRow
          label="Status"
          value={value.truncated ? "Truncated" : "Complete"}
        />
        <RequestDiagnosticsRow
          label="Database size"
          value={prettyBytes(value.usedBytes)}
          valueColor={isNearLimit ? "destructive" : undefined}
          description="To reduce the database size, select only the output fields your pages use, narrow filters to fewer files, and avoid full file content when a byte range is enough."
        />
        <RequestDiagnosticsRow
          label="Database limit"
          value={prettyBytes(value.maxBytes)}
        />
        <RequestDiagnosticsRow
          label="Estimated full size"
          value={prettyBytes(value.unboundedBytes)}
        />
        <RequestDiagnosticsRow
          label="Included files"
          value={value.includedDocumentCount}
        />
        <RequestDiagnosticsRow
          label="Omitted files"
          value={value.omittedDocumentCount}
        />
      </RequestDiagnosticsTable>
    </RequestDiagnosticsContent>
  );
};
