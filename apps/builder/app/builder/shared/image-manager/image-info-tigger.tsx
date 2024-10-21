import { useState } from "react";
import {
  SmallIconButton,
  FloatingPanelPopover,
  FloatingPanelPopoverTrigger,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
} from "@webstudio-is/design-system";
import { GearIcon, gearIconCssVars } from "@webstudio-is/icons";
import type { Asset } from "@webstudio-is/sdk";
import { theme } from "@webstudio-is/design-system";
import { ImageInfo } from "./image-info";

const triggerVisibilityVar = `--ws-image-info-trigger-visibility`;

export const imageInfoTriggerCssVars = ({ show }: { show: boolean }) => ({
  [triggerVisibilityVar]: show ? "visible" : "hidden",
});

export const ImageInfoTrigger = ({
  asset,
  onDelete,
}: {
  asset: Asset;
  onDelete: (ids: Array<string>) => void;
}) => {
  const [isInfoOpen, setInfoOpen] = useState(false);
  return (
    <FloatingPanelPopover modal open={isInfoOpen} onOpenChange={setInfoOpen}>
      <FloatingPanelPopoverTrigger asChild>
        <SmallIconButton
          title="Options"
          onClick={() => setInfoOpen(true)}
          tabIndex={-1}
          css={{
            visibility: `var(${triggerVisibilityVar}, hidden)`,
            position: "absolute",
            color: theme.colors.foregroundSubtle,
            top: theme.spacing[3],
            right: theme.spacing[3],
            cursor: "pointer",
            transition: "opacity 100ms ease",
            "&:hover": {
              color: theme.colors.foregroundMain,
            },
            ...gearIconCssVars({ fill: "transparent" }),
          }}
          icon={<GearIcon />}
        />
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent>
        <FloatingPanelPopoverTitle>Asset Details</FloatingPanelPopoverTitle>
        <ImageInfo
          onDelete={(ids) => {
            setInfoOpen(false);
            onDelete(ids);
          }}
          asset={asset}
        />
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
