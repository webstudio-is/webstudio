import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { PanelBanner, Text } from "@webstudio-is/design-system";
import {
  RequestDiagnosticsContent,
  RequestDiagnosticsRow,
  RequestDiagnosticsTable,
} from "./request-inspector";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
};

export const ContentDatabaseDiagnostics = ({
  value,
}: {
  value: AssetQueryPreviewDiagnostics;
}) => {
  const totalDocumentCount =
    value.includedDocumentCount + value.omittedDocumentCount;
  const candidateFilesLabel = `${totalDocumentCount} candidate ${totalDocumentCount === 1 ? "file" : "files"}`;
  const omittedFilesLabel = `${value.omittedDocumentCount} ${value.omittedDocumentCount === 1 ? "file" : "files"}`;
  return (
    <RequestDiagnosticsContent>
      <PanelBanner variant={value.truncated ? "warning" : "success"}>
        <Text>
          {value.truncated
            ? `${value.includedDocumentCount} of ${candidateFilesLabel} fit in the content database. ${omittedFilesLabel} may be omitted from published query results.`
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
          value={formatBytes(value.usedBytes)}
        />
        <RequestDiagnosticsRow
          label="Database limit"
          value={formatBytes(value.maxBytes)}
        />
        <RequestDiagnosticsRow
          label="Estimated full size"
          value={formatBytes(value.unboundedBytes)}
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
