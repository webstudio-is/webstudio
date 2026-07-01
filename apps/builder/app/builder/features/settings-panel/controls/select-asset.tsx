import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Button, Flex, FloatingPanel } from "@webstudio-is/design-system";
import type { Prop } from "@webstudio-is/sdk";
import { acceptToMimeCategories } from "@webstudio-is/sdk";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { $assets } from "~/shared/sync/data-stores";
import { AssetManager } from "~/builder/shared/asset-manager";
import { type ControlProps } from "../shared";
import { formatAssetName } from "~/builder/shared/assets/asset-utils";
import { AssetUpload } from "~/builder/shared/assets";

const getUploadType = (accept?: string): AssetType => {
  const categories = acceptToMimeCategories(accept ?? "");
  if (categories === "*" || categories.has("image")) {
    return "image";
  }
  if (categories.has("font")) {
    return "font";
  }
  if (categories.has("video")) {
    return "video";
  }
  return "file";
};

const getPanelTitle = (uploadType: AssetType): string => {
  if (uploadType === "image") return "Images";
  if (uploadType === "font") return "Fonts";
  if (uploadType === "video") return "Videos";
  return "Files";
};

type AssetControlProps = ControlProps<unknown>;

type Props = {
  accept?: string;
  prop?: Extract<Prop, { type: "asset" }>;
  onChange: AssetControlProps["onChange"];
};

export const SelectAsset = ({ prop, onChange, accept }: Props) => {
  const $asset = useMemo(
    () =>
      computed($assets, (assets) =>
        prop ? assets.get(prop.value) : undefined
      ),
    [prop]
  );

  const asset = useStore($asset);
  const uploadType = getUploadType(accept);

  return (
    <Flex gap={2} css={{ flex: 1 }} align="center">
      <FloatingPanel
        title={getPanelTitle(uploadType)}
        titleSuffix={<AssetUpload type={uploadType} accept={accept} />}
        content={
          <AssetManager
            onChange={(assetId) => onChange({ type: "asset", value: assetId })}
            accept={accept}
          />
        }
      >
        <Button color="neutral" css={{ flex: 1 }}>
          {asset ? formatAssetName(asset) : "Choose source"}
        </Button>
      </FloatingPanel>
    </Flex>
  );
};
