import { PanelTitle, Separator } from "@webstudio-is/design-system";
import { ImageManager } from "~/shared/image-manager";

export const AssetsPanel = (_props: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle>Assets</PanelTitle>
      <Separator />
      <ImageManager />
    </>
  );
};
