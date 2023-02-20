import { useStore } from "@nanostores/react";
import {
  theme,
  Slider,
  DeprecatedText2,
  Flex,
} from "@webstudio-is/design-system";
import { minZoom, zoomStore } from "~/shared/nano-states/breakpoints";

export const ZoomSetting = () => {
  const value = useStore(zoomStore);
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
            zoomStore.set(value);
          }}
        />
        <DeprecatedText2>{value}%</DeprecatedText2>
      </Flex>
    </Flex>
  );
};
