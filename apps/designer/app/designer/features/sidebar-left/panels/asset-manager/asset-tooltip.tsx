import { useState } from "react";
import { Button, Tooltip } from "@webstudio-is/design-system";
import { GearIcon } from "@webstudio-is/icons";

import { AssetInfo } from "./asset-info";
import { PANEL_WIDTH } from "~/designer/shared/constants";
import { Asset } from "@webstudio-is/asset-uploader";

export const AssetTooltip = ({
  asset,
  onDelete,
  isParentHovered,
}: {
  asset: Asset;
  onDelete: () => void;
  isParentHovered: boolean;
}) => {
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const closeTooltip = () => setTooltipOpen(false);

  return (
    <Tooltip
      open={isTooltipOpen}
      multiline
      onEscapeKeyDown={closeTooltip}
      onPointerDownOutside={closeTooltip}
      css={{
        width: PANEL_WIDTH,
        maxWidth: PANEL_WIDTH,
        padding: 0,
        paddingBottom: "$2",
      }}
      content={
        <AssetInfo
          onDelete={onDelete}
          onClose={() => setTooltipOpen(false)}
          {...asset}
        />
      }
    >
      <Button
        variant="raw"
        title="Options"
        onClick={() => setTooltipOpen(true)}
        css={{
          opacity: isParentHovered ? 1 : 0,
          position: "absolute",
          color: "$slate11",
          top: "$1",
          right: "$1",
          cursor: "pointer",
          transition: "opacity 100ms ease",

          "&:hover": {
            color: "$hiContrast",
          },

          "svg path": {
            fill: "$loContrast",
          },
        }}
      >
        <GearIcon />
      </Button>
    </Tooltip>
  );
};
