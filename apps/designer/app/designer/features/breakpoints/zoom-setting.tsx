import { useZoom } from "~/designer/shared/nano-states";
import { Slider, TextLegacy, Flex } from "@webstudio-is/design-system";

export const minZoom = 10;

export const ZoomSetting = () => {
  const [value, setValue] = useZoom();
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <TextLegacy size="1">Zoom</TextLegacy>
      <Flex gap="3" align="center">
        <Slider
          min={minZoom}
          value={value}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <TextLegacy size="1">{value}%</TextLegacy>
      </Flex>
    </Flex>
  );
};
