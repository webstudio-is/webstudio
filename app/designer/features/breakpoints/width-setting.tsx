import { useCanvasWidth } from "~/designer/shared/nano-values";
import { Slider, Text, Flex } from "~/shared/design-system";

// Doesn't make sense to allow resizing the canvas lower than this.
export const minWidth = 200;
export const maxWidth = 3000;

export const WidthSetting = () => {
  const [value = 0, setValue] = useCanvasWidth();

  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <Text size="1">Width</Text>
      <Flex gap="3" align="center">
        <Slider
          min={minWidth}
          max={maxWidth}
          defaultValue={[value]}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <Text size="1">{`${value}px`}</Text>
      </Flex>
    </Flex>
  );
};
