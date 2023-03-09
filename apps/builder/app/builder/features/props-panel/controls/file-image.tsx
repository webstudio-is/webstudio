import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Button } from "@webstudio-is/design-system";
import { assetsStore } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import { type ControlProps, getLabel, VerticalLayout } from "../shared";

export const FileImageControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"file-image", "asset">) => {
  const assetStore = useMemo(
    () =>
      computed(assetsStore, (assets) =>
        prop ? assets.get(prop.value) : undefined
      ),
    [prop]
  );
  const asset = useStore(assetStore);

  return (
    <VerticalLayout label={getLabel(meta, propName)} onDelete={onDelete}>
      <FloatingPanel
        title="Images"
        content={
          <ImageManager
            onChange={(asset) =>
              onChange({ type: "asset", value: asset.id }, asset)
            }
          />
        }
      >
        <Button color="neutral" css={{ width: "100%" }}>
          {asset?.name ?? "Choose image"}
        </Button>
      </FloatingPanel>
    </VerticalLayout>
  );
};
