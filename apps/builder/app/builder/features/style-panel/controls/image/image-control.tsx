import { TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";

export const ImageControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const styleValue = currentStyle[property]?.value;

  if (styleValue === undefined) {
    return null;
  }

  const setValue = setProperty(property);

  const valueAssets =
    styleValue.type === "image"
      ? styleValue.value.filter((image) => image.type === "asset")
      : [];

  return (
    <FloatingPanel
      title="Images"
      content={
        <ImageManager
          onChange={(asset) => {
            setValue({
              type: "image",
              value: [{ type: "asset", value: asset }],
            });
          }}
        />
      }
    >
      <TextField defaultValue={valueAssets?.[0]?.value.name} />
    </FloatingPanel>
  );
};
