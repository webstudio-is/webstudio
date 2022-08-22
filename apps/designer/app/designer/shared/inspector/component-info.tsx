import { components } from "@webstudio-is/react-sdk";
import { Flex, TextLegacy } from "@webstudio-is/design-system";
import type { SelectedInstanceData } from "~/shared/canvas-components";

export const ComponentInfo = ({
  selectedInstanceData,
}: {
  selectedInstanceData: SelectedInstanceData;
}) => {
  return (
    <Flex justify="between" align="center">
      <TextLegacy
        css={{
          fontSize: "$2",
          color: "$colors$slate11",
          fontWeight: "500",
        }}
      >{`Selected: ${
        components[selectedInstanceData.component].label
      }`}</TextLegacy>
    </Flex>
  );
};
