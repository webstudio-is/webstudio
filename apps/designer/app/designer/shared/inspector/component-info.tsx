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
      <Text
        css={{
          fontSize: "$2",
          color: "$colors$slate11",
          fontWeight: "500",
        }}
      >{`Selected: ${primitives[selectedInstanceData.component].label}`}</Text>
    </Flex>
  );
};
