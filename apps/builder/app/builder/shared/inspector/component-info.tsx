import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { Flex, Text } from "@webstudio-is/design-system";
import { getInstanceLabel } from "../tree";

export const ComponentInfo = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const meta = getComponentMeta(selectedInstance.component);
  if (meta === undefined) {
    return null;
  }
  return (
    <Flex justify="between" align="center">
      <Text>{`Selected: ${getInstanceLabel(selectedInstance, meta)} (${
        meta.label
      })`}</Text>
    </Flex>
  );
};
