import type { ReactNode } from "react";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { cssVar } from "../css-var";
import { Tooltip, type TooltipProps } from "./tooltip";

/** A focusable help icon for a short explanation beside a field or label. */
export const InfoTooltip = ({
  label,
  content,
  disableHoverableContent,
  side,
}: {
  label: string;
  content: ReactNode;
  disableHoverableContent?: boolean;
  side?: TooltipProps["side"];
}) => (
  <Tooltip
    content={content}
    variant="wrapped"
    disableHoverableContent={disableHoverableContent}
    openOnFocus
    side={side}
  >
    <InfoCircleIcon
      aria-label={label}
      color={cssVar("--foreground-secondary")}
      style={{ flexShrink: 0 }}
      tabIndex={0}
    />
  </Tooltip>
);
