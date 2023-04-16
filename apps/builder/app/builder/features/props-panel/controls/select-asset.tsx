import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  SmallIconButton,
  Text,
} from "@webstudio-is/design-system";
import { assetsStore } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import { type ControlProps } from "../shared";
import { acceptToMimeCategories } from "@webstudio-is/asset-uploader";
import { TrashIcon } from "@webstudio-is/icons";

// tests whether we can use ImageManager for the given "accept" value
const isImageAccept = (accept?: string) => {
  const acceptCategories = acceptToMimeCategories(accept || "");
  return (
    acceptCategories === "*" ||
    (acceptCategories.size === 1 && acceptCategories.has("image"))
  );
};

type AssetControlProps = ControlProps<unknown, "asset">;

type Props = {
  accept?: string;
  disabled?: boolean;
  prop: AssetControlProps["prop"];
  onChange: AssetControlProps["onChange"];
  onSoftDelete: AssetControlProps["onSoftDelete"];
};

export const SelectAsset = ({
  prop,
  onChange,
  onSoftDelete,
  accept,
  disabled = false,
}: Props) => {
  const assetStore = useMemo(
    () =>
      computed(assetsStore, (assets) =>
        prop ? assets.get(prop.value) : undefined
      ),
    [prop]
  );

  const asset = useStore(assetStore);

  if (isImageAccept(accept) === false) {
    return <Text color="destructive">Unsupported accept value: {accept}</Text>;
  }

  return (
    <Flex gap={2} css={{ flex: 1 }} align="center">
      <FloatingPanel
        title="Images"
        content={
          <ImageManager
            onChange={(asset) =>
              onChange({ type: "asset", value: asset.id }, asset)
            }
            accept={accept}
          />
        }
      >
        <Button color="neutral" css={{ flex: 1 }} disabled={disabled}>
          {asset?.name ?? "Choose source"}
        </Button>
      </FloatingPanel>
      {prop && disabled === false ? (
        <SmallIconButton
          icon={<TrashIcon />}
          onClick={onSoftDelete}
          variant="destructive"
        />
      ) : null}
    </Flex>
  );
};
