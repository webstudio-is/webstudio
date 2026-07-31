import type { ContentDatabasePublishDiagnostics } from "~/services/content-database.server";

export const ContentDatabasePublishWarning = ({
  diagnostics,
}: {
  diagnostics: ContentDatabasePublishDiagnostics;
}) => {
  const { stats } = diagnostics;
  const totalDocumentCount =
    stats.includedDocumentCount + stats.omittedDocumentCount;
  const omittedFileLabel = stats.omittedDocumentCount === 1 ? "file" : "files";
  const dynamicResourceNames = diagnostics.affectedResources.flatMap(
    ({ name, kind }) => (kind === "dynamic" ? [name] : [])
  );
  const staticResourceNames = diagnostics.affectedResources.flatMap(
    ({ name, kind }) => (kind === "static" ? [name] : [])
  );
  return (
    <>
      The merged published content database will include{" "}
      {stats.includedDocumentCount} of {totalDocumentCount} files (
      {Math.ceil(stats.usedBytes / 1024)} of {Math.ceil(stats.maxBytes / 1024)}{" "}
      KiB). {stats.omittedDocumentCount} {omittedFileLabel} will be omitted{" "}
      {stats.omissionReason === "size"
        ? "because the complete database exceeds the size limit"
        : "because the required content could not be embedded"}
      .
      {dynamicResourceNames.length > 0 && (
        <>
          {" "}
          Assets resources with route or variable values cannot be checked
          exactly and may return incomplete results:{" "}
          {dynamicResourceNames.join(", ")}.
        </>
      )}
      {staticResourceNames.length > 0 && (
        <>
          {" "}
          Potentially affected Assets resources:{" "}
          {staticResourceNames.join(", ")}.
        </>
      )}
    </>
  );
};
