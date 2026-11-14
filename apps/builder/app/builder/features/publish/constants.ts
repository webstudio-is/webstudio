import { cssVar } from "@webstudio-is/design-system";
import { AlertIcon, CheckCircleIcon, SpinnerIcon } from "@webstudio-is/icons";
import type { PublishLog } from "./use-publish-logs";

export const publishLogStatus = {
  pending: {
    Icon: SpinnerIcon,
    color: cssVar("--foreground-warning"),
    text: "Publishing started",
  },
  failed: {
    Icon: AlertIcon,
    color: cssVar("--foreground-negative"),
    text: "Publish failed",
  },
  success: {
    Icon: CheckCircleIcon,
    color: cssVar("--foreground-positive"),
    text: "Published",
  },
} satisfies Record<
  PublishLog["status"],
  {
    Icon: typeof AlertIcon;
    color: string;
    text: string;
  }
>;
