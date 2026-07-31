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
  const includedSize = `${Math.ceil(stats.usedBytes / 1024)} KiB`;
  const fullSize = `${Math.ceil(stats.unboundedBytes / 1024)} KiB`;
  const sizeLimit = `${Math.ceil(stats.maxBytes / 1024)} KiB`;
  return (
    <>
      {stats.omissionReason === "size" && (
        <>
          The complete content database is {fullSize}, exceeding the {sizeLimit}{" "}
          publish limit.{" "}
        </>
      )}
      Publishing will include {stats.includedDocumentCount} of{" "}
      {totalDocumentCount} files ({includedSize}) and omit{" "}
      {stats.omittedDocumentCount} {omittedFileLabel}
      {stats.omissionReason === "unavailable"
        ? ` because ${stats.omittedDocumentCount === 1 ? "its" : "their"} required content is unavailable.`
        : "."}
      {staticResourceNames.length > 0 && (
        <>
          {" "}
          {staticResourceNames.length === 1 ? "Resource" : "Resources"} that may
          return incomplete results: {staticResourceNames.join(", ")}.
        </>
      )}
      {dynamicResourceNames.length > 0 && (
        <>
          {" "}
          {dynamicResourceNames.length === 1 ? "Resource" : "Resources"} with
          route or variable values cannot be checked in advance and may also
          return incomplete results: {dynamicResourceNames.join(", ")}.
        </>
      )}
    </>
  );
};
