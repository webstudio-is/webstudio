import { Box, Tooltip } from "@webstudio-is/design-system";
import type { ReactNode } from "react";

// Visual controls can't represent all CSS values and in that case we show it in the Advanced section.
export const AdvancedValueTooltip = ({
  isAdvanced,
  children,
}: {
  isAdvanced: boolean;
  children: ReactNode;
}) => {
  if (isAdvanced) {
    return (
      <Tooltip content="The value is defined in the Advanced section.">
        <Box>{children}</Box>
      </Tooltip>
    );
  }
  return children;
};
