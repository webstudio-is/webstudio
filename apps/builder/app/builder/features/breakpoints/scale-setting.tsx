import { useStore } from "@nanostores/react";
import {
  theme,
  Slider,
  DeprecatedText2,
  Flex,
} from "@webstudio-is/design-system";
import { minScale, scaleStore } from "~/shared/nano-states/breakpoints";

export const ScaleSetting = () => {
  const value = useStore(scaleStore);
  return (
    <Flex
      css={{ px: theme.spacing[11], py: theme.spacing[3] }}
      gap="1"
      direction="column"
    >
      <DeprecatedText2>Scale</DeprecatedText2>
      <Flex gap="3" align="center">
        <Slider
          min={minScale}
          value={value}
          onValueChange={([value]) => {
            scaleStore.set(value);
          }}
        />
        <DeprecatedText2>{value}%</DeprecatedText2>
      </Flex>
    </Flex>
  );
};
