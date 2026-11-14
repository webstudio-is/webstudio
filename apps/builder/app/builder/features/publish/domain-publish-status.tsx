import type { ReactNode } from "react";
import { IconButton, Tooltip } from "@webstudio-is/design-system";
import type { AlertIcon } from "@webstudio-is/icons";
import { publishLogStatus } from "./constants";
import type { PublishLog } from "./use-publish-logs";

export const DomainPublishStatus = ({
  domain,
  buildId,
  latestLog,
  fallback,
  onOpenReport,
}: {
  domain: string;
  buildId?: string;
  latestLog?: Pick<PublishLog, "buildId" | "status">;
  fallback: { Icon: typeof AlertIcon; color: string; text: ReactNode };
  onOpenReport?: () => void;
}) => {
  const currentLog = latestLog?.buildId === buildId ? latestLog : undefined;
  const { Icon, color, text } =
    currentLog === undefined ? fallback : publishLogStatus[currentLog.status];
  return (
    <Tooltip content={text}>
      <IconButton
        type="button"
        aria-label={`Publish log: ${domain}`}
        css={{ color }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenReport?.();
        }}
      >
        <Icon />
      </IconButton>
    </Tooltip>
  );
};
