import { useState } from "react";
import { Button, Tooltip } from "@webstudio-is/design-system";
import { GearIcon, gearIconCssVars } from "@webstudio-is/icons";

import { AssetInfo } from "./asset-info";
import { PANEL_WIDTH } from "~/designer/shared/constants";
import { cssVars } from "@webstudio-is/css-vars";
import { BaseAsset } from "./types";

const triggerVisibilityVar = cssVars.define("trigger-visibility");

export const assetInfoTriggerCssVars = ({ show }: { show: boolean }) => ({
  [triggerVisibilityVar]: show ? "visible" : "hidden",
});

export const AssetInfoTrigger = ({
  asset,
  onDelete,
}: {
  asset: BaseAsset;
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
          visibility: cssVars.use(triggerVisibilityVar, "hidden"),
          position: "absolute",
          color: "$slate11",
          top: "$1",
          right: "$1",
          cursor: "pointer",
          transition: "opacity 100ms ease",
          "&:hover": {
            color: "$hiContrast",
          },
          ...gearIconCssVars({ fill: "$colors$loContrast" }),
        }}
      >
        <GearIcon />
      </Button>
    </Tooltip>
  );
};
