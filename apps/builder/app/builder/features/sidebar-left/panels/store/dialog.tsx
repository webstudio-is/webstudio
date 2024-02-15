import { useStore } from "@nanostores/react";
import {
  Dialog as DialogPrimitive,
  DialogContent,
  DialogTitle,
  theme,
  ScrollArea,
  css,
} from "@webstudio-is/design-system";
import { $activeStoreItemId } from "~/shared/nano-states";
import type { StoreItem } from "./types";
import { items } from "./items";

const iframeStyle = css({
  border: "none",
  height: "100%",
});

const DialogView = ({
  item,
  isOpen,
  onOpenChange,
}: {
  item: StoreItem;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <DialogPrimitive open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: item.width,
          height: item.height,
          zIndex: theme.zIndices[1],
          resize: "both",
        }}
        overlayCss={{ zIndex: theme.zIndices[1] }}
      >
        <iframe className={iframeStyle()} src={item.url}></iframe>
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle>{item.label}</DialogTitle>
      </DialogContent>
    </DialogPrimitive>
  );
};

export const Dialog = () => {
  const activeStoreItemId = useStore($activeStoreItemId);
  const item = activeStoreItemId
    ? items.find((item) => item.id === activeStoreItemId)
    : undefined;

  if (item === undefined) {
    return;
  }

  return (
    <DialogView
      item={item}
      isOpen={activeStoreItemId !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          $activeStoreItemId.set(undefined);
        }
      }}
    />
  );
};
