import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $publishDialog } from "../../shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { ContentDatabasePublishWarning } from "./content-database-publish-warning-view";

export const shouldShowContentDatabasePublishWarningToast = (
  isPublishPopoverOpen: boolean
) => isPublishPopoverOpen === false;

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
  if (
    shouldShowContentDatabasePublishWarningToast(
      $publishDialog.get() !== "none"
    )
  ) {
    toast.warn(message);
  }
  setWarning(message);
};
