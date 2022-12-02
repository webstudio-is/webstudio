import { getComponentMeta } from "@webstudio-is/react-sdk";
import { Flex, Text } from "@webstudio-is/design-system";
import type { SelectedInstanceData } from "@webstudio-is/project";

export const ComponentInfo = ({
  selectedInstanceData,
}: {
  selectedInstanceData: SelectedInstanceData;
}) => {
  return (
    <Flex justify="between" align="center">
      <Text
        css={{
          fontSize: "$fontSize$3",
          color: "$colors$slate11",
          fontWeight: "500",
        }}
      >{`Selected: ${
        getComponentMeta(selectedInstanceData.component).label
      }`}</Text>
    </Flex>
  );
};
