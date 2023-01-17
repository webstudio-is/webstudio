import { getComponentMeta } from "@webstudio-is/react-sdk";
import { Flex, Text } from "@webstudio-is/design-system";
import type { SelectedInstanceData } from "@webstudio-is/project";
import { theme } from "@webstudio-is/design-system";

export const ComponentInfo = ({
  selectedInstanceData,
}: {
  selectedInstanceData: SelectedInstanceData;
}) => {
  return (
    <Flex justify="between" align="center">
      <Text
        css={{
          fontSize: theme.fontSize[3],
          color: theme.colors.slate11,
          fontWeight: "500",
        }}
      >{`Selected: ${
        getComponentMeta(selectedInstanceData.component).label
      }`}</Text>
    </Flex>
  );
};
