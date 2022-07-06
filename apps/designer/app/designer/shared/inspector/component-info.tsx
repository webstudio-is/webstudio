import { Flex, Text } from "apps/designer/app/shared/design-system";
import type { SelectedInstanceData } from "apps/designer/app/shared/canvas-components";
import { primitives } from "apps/designer/app/shared/canvas-components";

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
