import {
  Dialog,
  DialogContent,
  DialogTitle,
  theme,
} from "@webstudio-is/design-system";
import type { StoreItem } from "./types";
import { Iframe } from "./iframe";

export const ItemDialog = ({
  item,
  onOpenChange,
}: {
  item: StoreItem;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  if (item.ui.component !== "dialog") {
    return;
  }
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: item.ui.width,
          height: item.ui.height,
          zIndex: theme.zIndices[1],
          resize: "both",
        }}
        overlayCss={{ zIndex: theme.zIndices[1] }}
      >
        <Iframe src={item.url} />
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle>{item.label}</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
