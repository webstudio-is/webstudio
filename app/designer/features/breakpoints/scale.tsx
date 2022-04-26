import { useScale } from "~/designer/shared/nano-values";
import { Slider, Text, Flex } from "~/shared/design-system";

export const Scale = () => {
  const [value, setValue] = useScale();
  return (
    <Flex css={{ px: "$5" }} gap="1" direction="column">
      <Text size="1">Scale:</Text>
      <Flex gap="3" align="center">
        <Slider
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
