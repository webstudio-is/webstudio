import { useState } from "react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  PopoverHeader,
} from "@webstudio-is/design-system";
import { GearIcon, gearIconCssVars } from "@webstudio-is/icons";
import { AssetInfo } from "./asset-info";
import { cssVars } from "@webstudio-is/css-vars";
import { Asset } from "@webstudio-is/asset-uploader";

const triggerVisibilityVar = cssVars.define("trigger-visibility");

export const assetInfoTriggerCssVars = ({ show }: { show: boolean }) => ({
  [triggerVisibilityVar]: show ? "visible" : "hidden",
});

export const AssetInfoTrigger = ({
  asset,
  onDelete,
}: {
  asset: Asset;
  onDelete: () => void;
}) => {
  const [isInfoOpen, setInfoOpen] = useState(false);
  return (
    <Popover open={isInfoOpen} onOpenChange={setInfoOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="raw"
          title="Options"
          onClick={() => setInfoOpen(true)}
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
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent css={{ zIndex: "$1" }}>
          <PopoverHeader title="Asset Details" />
          <AssetInfo
            onDelete={onDelete}
            onClose={() => setInfoOpen(false)}
            {...asset}
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
