import { useScale } from "~/designer/shared/nano-values";
import { Slider, Text, Flex } from "~/shared/design-system";

export const ScaleSetting = () => {
  const [value, setValue] = useScale();
  return (
    <Flex css={{ px: "$5", py: "$1" }} gap="1" direction="column">
      <Text size="1">Scale</Text>
      <Flex gap="3" align="center">
        <Slider
          min={10}
          defaultValue={[value]}
          onValueChange={([value]) => {
            setValue(value);
          }}
        />
        <Text size="1">{value}%</Text>
      </Flex>
    </Flex>
  );
};
