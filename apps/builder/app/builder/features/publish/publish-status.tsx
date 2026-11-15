import type { Project } from "@webstudio-is/project";
import { cssVar } from "@webstudio-is/design-system";
import { CheckCircleIcon, AlertIcon, SpinnerIcon } from "@webstudio-is/icons";
import { RelativeTime } from "~/builder/shared/relative-time";

export const PENDING_TIMEOUT =
  process.env.NODE_ENV === "production" ? 60 * 3 * 1000 : 35000;

export const getPublishStatusDisplay = ({
  createdAt,
  publishStatus,
}: Pick<
  NonNullable<Project["domainsVirtual"][number]["latestBuildVirtual"]>,
  "createdAt" | "publishStatus"
>) => {
  let status = publishStatus;

  const delta = Date.now() - new Date(createdAt).getTime();
  // Assume build failed after 3 minutes

  if (publishStatus === "PENDING" && delta > PENDING_TIMEOUT) {
    status = "FAILED";
  }

  const statusLabel =
    status === "PUBLISHED"
      ? "Published"
      : status === "FAILED"
        ? "Publish failed"
        : "Publishing started";

  const statusContent = (
    <>
      {statusLabel} <RelativeTime time={new Date(createdAt)} />
    </>
  );

  const color =
    status === "PUBLISHED"
      ? cssVar("--foreground-positive")
      : status === "FAILED"
        ? cssVar("--foreground-negative")
        : cssVar("--foreground-warning");
  const Icon =
    status === "PUBLISHED"
      ? CheckCircleIcon
      : status === "FAILED"
        ? AlertIcon
        : SpinnerIcon;

  return { statusContent, status, color, Icon };
};

export const getStaticPublishStatusDisplay = ({
  updatedAt,
  publishStatus,
}: {
  updatedAt: string;
  publishStatus: "PENDING" | "FAILED" | "PUBLISHED";
}) => {
  let status = publishStatus;

  const delta = Date.now() - new Date(updatedAt).getTime();
  // Assume build failed after 3 minutes

  if (publishStatus === "PENDING" && delta > PENDING_TIMEOUT) {
    status = "FAILED";
  }

  const statusLabel =
    status === "PUBLISHED"
      ? "Downloaded"
      : status === "FAILED"
        ? "Download failed"
        : "Download started";

  const statusContent = (
    <>
      {statusLabel} <RelativeTime time={new Date(updatedAt)} />
    </>
  );

  return { statusContent, status };
};
