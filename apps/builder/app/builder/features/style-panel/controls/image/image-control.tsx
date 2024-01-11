import { useStore } from "@nanostores/react";
import { Button } from "@webstudio-is/design-system";
import { $assets } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import type { ControlProps } from "../../style-sections";

export const ImageControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const assets = useStore($assets);
  const styleValue = currentStyle[property]?.value;

  if (styleValue === undefined) {
    return null;
  }

  const setValue = setProperty(property);

  const asset =
    styleValue.type === "image" && styleValue.value.type === "asset"
      ? assets.get(styleValue.value.value)
      : undefined;

  return (
    <FloatingPanel
      title="Images"
      content={
        <ImageManager
          onChange={(asset) => {
            setValue({
              type: "image",
              value: { type: "asset", value: asset.id },
            });
          }}
        />
      }
    >
      <Button color="neutral" css={{ maxWidth: "100%", justifySelf: "right" }}>
        {asset?.name ?? "Choose image..."}
      </Button>
    </FloatingPanel>
  );
};
