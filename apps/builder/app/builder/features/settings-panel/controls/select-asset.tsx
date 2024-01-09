import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  SmallIconButton,
  Text,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import type { Prop } from "@webstudio-is/sdk";
import { $assets } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import { type ControlProps } from "../shared";
import { acceptToMimeCategories } from "@webstudio-is/asset-uploader";

// tests whether we can use ImageManager for the given "accept" value
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
  onDelete: AssetControlProps["onDelete"];
};

export const SelectAsset = ({ prop, onChange, onDelete, accept }: Props) => {
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
        content={
          <ImageManager
            onChange={(asset) =>
              onChange({ type: "asset", value: asset.id }, asset)
            }
            accept={accept}
          />
        }
      >
        <Button color="neutral" css={{ flex: 1 }}>
          {asset?.name ?? "Choose source"}
        </Button>
      </FloatingPanel>
      {prop ? (
        <SmallIconButton
          icon={<TrashIcon />}
          onClick={onDelete}
          variant="destructive"
        />
      ) : null}
    </Flex>
  );
};
