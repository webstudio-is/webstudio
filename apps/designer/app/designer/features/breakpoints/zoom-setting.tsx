import { useZoom } from "~/designer/shared/nano-states";
import { Slider, Text, Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

export const minZoom = 10;

export const ZoomSetting = () => {
  const [value, setValue] = useZoom();
  return (
    <Flex
      css={{ px: theme.spacing[11], py: theme.spacing[3] }}
      gap="1"
      direction="column"
    >
      <Text>Zoom</Text>
      <Flex gap="3" align="center">
        <Slider
          min={minZoom}
          value={value}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <Text>{value}%</Text>
      </Flex>
    </Flex>
  );
};
