import {
  Button,
  PanelTitle,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { CrossIcon } from "@webstudio-is/icons";
import { ImageManager } from "~/builder/shared/image-manager";

export const AssetsPanel = ({ onClose }: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle
        suffix={
          <Tooltip content="Close panel" side="bottom">
            <Button
              color="ghost"
              prefix={<CrossIcon />}
              aria-label="Close panel"
              onClick={onClose}
            />
          </Tooltip>
        }
      >
        Assets
      </PanelTitle>
      <Separator />
      <ImageManager />
    </>
  );
};
