import {
  Dialog,
  DialogContent,
  DialogTitle,
  theme,
} from "@webstudio-is/design-system";
import type { MarketplaceProduct } from "./types";
import { Iframe } from "./iframe";

export const App = ({
  product,
  onOpenChange,
}: {
  product: MarketplaceProduct;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  if (product.category !== "apps") {
    return;
  }
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          width: product.width,
          height: product.height,
          zIndex: theme.zIndices[1],
          resize: "both",
        }}
        overlayCss={{ zIndex: theme.zIndices[1] }}
      >
        <Iframe src={product.url} />
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle>{product.label}</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
