import { useMemo } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { Button, Label, Flex } from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { assetsStore } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import { type ControlProps, getLabel } from "../shared";

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
    <div>
      <Label>{getLabel(meta, propName)}</Label>
      <Flex gap="1">
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
          <Button color="neutral" css={{ flexGrow: 1, overflow: "hidden" }}>
            {asset?.name ?? "Choose image"}
          </Button>
        </FloatingPanel>
        {onDelete && (
          <Button
            color="ghost"
            prefix={<TrashIcon />}
            onClick={onDelete}
            css={{ flexShrink: 1 }}
          />
        )}
      </Flex>
    </div>
  );
};
