import { useMemo, useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Button, Flex, FloatingPanel } from "@webstudio-is/design-system";
import {
  acceptToMimeCategories,
  formatAssetName,
  type Asset,
} from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload } from "~/builder/shared/assets";

const acceptsImageUpload = (accept?: string) => {
  const acceptCategories = acceptToMimeCategories(accept || "");
  return (
    acceptCategories === "*" ||
    (acceptCategories.size === 1 && acceptCategories.has("image"))
  );
};

type Props = {
  accept?: string;
  assetId?: Asset["id"];
  title?: string;
  triggerLabel?: string;
  disabled?: boolean;
  onChange: (assetId: Asset["id"]) => void;
};

export const SelectAsset = ({
  accept,
  assetId,
  title,
  triggerLabel,
  disabled,
  onChange,
}: Props) => {
  const [open, setOpen] = useState(false);
  const $asset = useMemo(
    () =>
      computed($assets, (assets) =>
        assetId === undefined ? undefined : assets.get(assetId)
      ),
    [assetId]
  );

  const asset = useStore($asset);
  const acceptsImages = acceptsImageUpload(accept);

  return (
    <Flex gap={2} css={{ flex: 1 }} align="center">
      <FloatingPanel
        open={open}
        onOpenChange={setOpen}
        title={title ?? (acceptsImages ? "Images" : "Assets")}
        titleSuffix={
          acceptsImages ? (
            <AssetUpload type="image" accept={accept} />
          ) : undefined
        }
        content={
          <AssetManager
            onChange={(assetId) => {
              setOpen(false);
              onChange(assetId);
            }}
            accept={accept}
          />
        }
      >
        <Button css={{ flex: 1 }} disabled={disabled}>
          {triggerLabel ?? (asset ? formatAssetName(asset) : "Choose source")}
        </Button>
      </FloatingPanel>
    </Flex>
  );
};
