import type { Project } from "@webstudio-is/project";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { ContentDatabasePublishWarning } from "./content-database-publish-warning-view";
import { showPublishWarning } from "./publish-warning";

export const showContentDatabasePublishWarning = async ({
  projectId,
  setWarning,
}: {
  projectId: Project["id"];
  setWarning: (warning: JSX.Element) => void;
}) => {
  const diagnostics =
    await nativeClient.build.contentDatabasePublishDiagnostics.query({
      projectId,
    });
  if (
    diagnostics === undefined ||
    diagnostics.stats.truncated === false ||
    diagnostics.stats.omissionReason === undefined
  ) {
    return;
  }
  const message = <ContentDatabasePublishWarning diagnostics={diagnostics} />;
  showPublishWarning({ message, setWarning });
};
