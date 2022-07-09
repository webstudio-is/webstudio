import { Flex, Text } from "~/shared/design-system";
import type { SelectedInstanceData } from "~/shared/canvas-components";
import { primitives } from "~/shared/canvas-components";

export const ComponentInfo = ({
  selectedInstanceData,
}: {
  selectedInstanceData: SelectedInstanceData;
}) => {
  return (
    <Flex justify="between" align="center">
      <Text>{`Selected: ${
        primitives[selectedInstanceData.component].label
      }`}</Text>
    </Flex>
  );
};
