import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Button, Text } from "@webstudio-is/design-system";
import { assetsStore } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import { type ControlProps, getLabel, VerticalLayout } from "../shared";
import { acceptToMimeCategories } from "@webstudio-is/asset-uploader";

export const FileControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
}: ControlProps<"file", "asset">) => {
  const assetStore = useMemo(
    () =>
      computed(assetsStore, (assets) =>
        prop ? assets.get(prop.value) : undefined
      ),
    [prop]
  );
  const asset = useStore(assetStore);

  const acceptCategories = acceptToMimeCategories(meta?.accept || "");

  return (
    <VerticalLayout label={getLabel(meta, propName)} onDelete={onDelete}>
      {acceptCategories === "*" ||
      (acceptCategories.size === 1 && acceptCategories.has("image")) ? (
        <FloatingPanel
          title="Images"
          content={
            <ImageManager
              onChange={(asset) =>
                onChange({ type: "asset", value: asset.id }, asset)
              }
              accept={meta?.accept}
            />
          }
        >
          <Button color="neutral" css={{ width: "100%" }}>
            {asset?.name ?? "Choose source"}
          </Button>
        </FloatingPanel>
      ) : (
        <Text color="destructive">
          Unsupported accept value: {meta?.accept}
        </Text>
      )}
    </VerticalLayout>
  );
};
