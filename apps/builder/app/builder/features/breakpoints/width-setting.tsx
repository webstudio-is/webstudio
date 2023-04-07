import { theme, Text, Flex, Slider } from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";

// Doesn't make sense to allow resizing the canvas lower/higher than this.
export const minWidth = 360;
export const maxWidth = 3000;

export const WidthSetting = () => {
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();

  if (canvasWidth === undefined) {
    return null;
  }

  return (
    <Flex
      css={{ px: theme.spacing[11], py: theme.spacing[3] }}
      gap="1"
      direction="column"
    >
      <Text>Canvas width</Text>
      <Flex gap="3" align="center">
        <Slider
          min={minWidth}
          max={maxWidth}
          value={[canvasWidth]}
          onValueChange={([value]) => {
            setCanvasWidth(value);
          }}
        />
        <Text>{`${canvasWidth}px`}</Text>
      </Flex>
    </Flex>
  );
};
