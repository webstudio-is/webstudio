import { useState } from "react";
import {
  SmallIconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from "@webstudio-is/design-system";
import { GearIcon } from "@webstudio-is/icons";
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
    <Popover modal open={isInfoOpen} onOpenChange={setInfoOpen}>
      <PopoverTrigger asChild>
        <SmallIconButton
          title="Options"
          onClick={() => setInfoOpen(true)}
          tabIndex={-1}
          css={{
            visibility: `var(${triggerVisibilityVar}, hidden)`,
            position: "absolute",
            color: theme.colors.backgroundIconSubtle,
            top: theme.spacing[3],
            right: theme.spacing[3],
            cursor: "pointer",
            transition: "opacity 100ms ease",
            "& svg": {
              fill: `oklch(from ${theme.colors.white} l c h / 0.9)`,
            },
            "&:hover": {
              color: theme.colors.foregroundIconMain,
            },
          }}
          icon={<GearIcon />}
        />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Asset Details</PopoverTitle>
        <ImageInfo
          onDelete={(ids) => {
            setInfoOpen(false);
            onDelete(ids);
          }}
          asset={asset}
        />
      </PopoverContent>
    </Popover>
  );
};
