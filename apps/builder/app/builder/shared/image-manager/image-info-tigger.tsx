import { useState } from "react";
import {
  DeprecatedButton,
  DeprecatedPopover,
  DeprecatedPopoverTrigger,
  DeprecatedPopoverContent,
  DeprecatedPopoverPortal,
  DeprecatedPopoverHeader,
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
    <DeprecatedPopover open={isInfoOpen} onOpenChange={setInfoOpen}>
      <DeprecatedPopoverTrigger asChild>
        <DeprecatedButton
          variant="raw"
          title="Options"
          onClick={() => setInfoOpen(true)}
          css={{
            visibility: `var(${triggerVisibilityVar}, hidden)`,
            position: "absolute",
            color: theme.colors.slate11,
            top: theme.spacing[3],
            right: theme.spacing[3],
            cursor: "pointer",
            transition: "opacity 100ms ease",
            "&:hover": {
              color: theme.colors.hiContrast,
            },
            ...gearIconCssVars({ fill: theme.colors.loContrast }),
          }}
        >
          <GearIcon />
        </DeprecatedButton>
      </DeprecatedPopoverTrigger>
      <DeprecatedPopoverPortal>
        <DeprecatedPopoverContent>
          <DeprecatedPopoverHeader title="Asset Details" />
          <ImageInfo
            onDelete={(ids) => {
              setInfoOpen(false);
              onDelete(ids);
            }}
            asset={asset}
          />
        </DeprecatedPopoverContent>
      </DeprecatedPopoverPortal>
    </DeprecatedPopover>
  );
};
