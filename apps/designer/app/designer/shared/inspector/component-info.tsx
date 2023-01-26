import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { Flex, Text } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

export const ComponentInfo = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
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
        getComponentMeta(selectedInstance.component)?.label
      }`}</Text>
    </Flex>
  );
};
