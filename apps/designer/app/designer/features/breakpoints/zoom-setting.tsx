import { useZoom } from "~/designer/shared/nano-states";
import { Slider, DeprecatedText2, Flex } from "@webstudio-is/design-system";
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
      <DeprecatedText2>Zoom</DeprecatedText2>
      <Flex gap="3" align="center">
        <Slider
          min={minZoom}
          value={value}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <DeprecatedText2>{value}%</DeprecatedText2>
      </Flex>
    </Flex>
  );
};
