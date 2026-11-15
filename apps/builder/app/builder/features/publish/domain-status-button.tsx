import type { ReactNode } from "react";
import { IconButton, Tooltip } from "@webstudio-is/design-system";
import type { AlertIcon } from "@webstudio-is/icons";
import { publishLogStatus } from "./constants";
import type { SessionPublish } from "./use-session-publishes";

export const DomainStatusButton = ({
  domain,
  buildId,
  latestPublish,
  fallback,
  onOpenReport,
}: {
  domain: string;
  buildId?: string;
  latestPublish?: Pick<SessionPublish, "buildId" | "status">;
  fallback: { Icon: typeof AlertIcon; color: string; text: ReactNode };
  onOpenReport?: () => void;
}) => {
  const currentPublish =
    latestPublish?.buildId === buildId ? latestPublish : undefined;
  const { Icon, color, text } =
    currentPublish === undefined
      ? fallback
      : publishLogStatus[currentPublish.status];
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
