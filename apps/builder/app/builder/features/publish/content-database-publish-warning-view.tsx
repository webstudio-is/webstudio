import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import type { ContentDatabasePublishWarning } from "~/services/content-database.server";
import { $publishDialog } from "../../shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { shouldShowContentDatabasePublishWarningToast } from "./content-database-publish-warning";

const ContentDatabasePublishWarningMessage = ({
  warning,
}: {
  warning: ContentDatabasePublishWarning;
}) => {
  const omittedFileLabel =
    warning.omittedDocumentCount === 1 ? "file" : "files";
  const dynamicResourceNames = warning.affectedResources.flatMap(
    ({ name, kind }) => (kind === "dynamic" ? [name] : [])
  );
  const staticResourceNames = warning.affectedResources.flatMap(
    ({ name, kind }) => (kind === "static" ? [name] : [])
  );
  return (
    <>
      The merged published content database will include{" "}
      {warning.includedDocumentCount} of {warning.totalDocumentCount} files (
      {warning.usedKiB} of {warning.maxKiB} KiB). {warning.omittedDocumentCount}{" "}
      {omittedFileLabel} will be omitted{" "}
      {warning.omissionReason === "size"
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

export const showContentDatabasePublishWarning = async ({
  projectId,
  setWarning,
}: {
  projectId: Project["id"];
  setWarning: (warning: JSX.Element) => void;
}) => {
  const warning =
    await nativeClient.build.contentDatabasePublishDiagnostics.query({
      projectId,
    });
  if (warning === undefined) {
    return;
  }
  const message = <ContentDatabasePublishWarningMessage warning={warning} />;
  if (
    shouldShowContentDatabasePublishWarningToast(
      $publishDialog.get() !== "none"
    )
  ) {
    toast.warn(message);
  }
  setWarning(message);
};
