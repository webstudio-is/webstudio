import { useZoom } from "~/designer/shared/nano-states";
import { Slider, __DEPRECATED__Text, Flex } from "@webstudio-is/design-system";

export const minZoom = 10;

export const ZoomSetting = () => {
  const [value, setValue] = useZoom();
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <__DEPRECATED__Text size="1">Zoom</__DEPRECATED__Text>
      <Flex gap="3" align="center">
        <Slider
          min={minZoom}
          value={value}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <__DEPRECATED__Text size="1">{value}%</__DEPRECATED__Text>
      </Flex>
    </Flex>
  );
};
