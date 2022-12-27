import { TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { FloatingPanel } from "~/designer/shared/floating-panel";
import { ImageManager } from "~/designer/shared/image-manager";

export const ImageControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const styleInfo = currentStyle[property];

  if (styleInfo === undefined) {
    return null;
  }

  const setValue = setProperty(property);

  const valueAssets =
    styleInfo.type === "image"
      ? styleInfo.value.filter((image) => image.type === "asset")
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
