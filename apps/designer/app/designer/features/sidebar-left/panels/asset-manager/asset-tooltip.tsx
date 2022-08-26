import { useState } from "react";
import { Button, Tooltip } from "@webstudio-is/design-system";
import { GearIcon } from "@webstudio-is/icons";
import type { Asset } from "@webstudio-is/prisma-client";
import { AssetInfo } from "./asset-info";

export const AssetTooltip = ({
  asset,
  onDelete,
}: {
  asset: Asset;
  onDelete: () => void;
}) => {
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const closeTooltip = () => setTooltipOpen(false);

  return (
    <Tooltip
      open={isTooltipOpen}
      multiline
      onEscapeKeyDown={closeTooltip}
      onPointerDownOutside={closeTooltip}
      css={{ width: 240, maxWidth: 240, padding: 0, paddingBottom: "$2" }}
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
          position: "absolute",
          top: "$1",
          right: "$1",
          cursor: "pointer",
          color: "$highContrast",
        }}
      >
        <GearIcon />
      </Button>
    </Tooltip>
  );
};
