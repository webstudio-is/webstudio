import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Button, Flex, Text, FloatingPanel } from "@webstudio-is/design-system";
import type { Prop } from "@webstudio-is/sdk";
import { acceptToMimeCategories } from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import { AssetManager } from "~/builder/shared/asset-manager";
import { type ControlProps } from "../shared";
import { formatAssetName } from "~/builder/shared/assets/asset-utils";
import { AssetUpload } from "~/builder/shared/assets";

// tests whether we can use AssetManager for the given "accept" value
const isImageAccept = (accept?: string) => {
  const acceptCategories = acceptToMimeCategories(accept || "");
  return (
    acceptCategories === "*" ||
    (acceptCategories.size === 1 && acceptCategories.has("image"))
  );
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

  if (isImageAccept(accept) === false) {
    return <Text color="destructive">Unsupported accept value: {accept}</Text>;
  }

  return (
    <Flex gap={2} css={{ flex: 1 }} align="center">
      <FloatingPanel
        title="Images"
        titleSuffix={<AssetUpload type="image" accept={accept} />}
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
