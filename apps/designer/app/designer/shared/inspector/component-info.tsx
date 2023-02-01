import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { Flex, DeprecatedText2 } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

export const ComponentInfo = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  return (
    <Flex justify="between" align="center">
      <DeprecatedText2
        css={{
          fontSize: theme.deprecatedFontSize[3],
          color: theme.colors.slate11,
          fontWeight: "500",
        }}
      >{`Selected: ${
        getComponentMeta(selectedInstance.component)?.label
      }`}</DeprecatedText2>
    </Flex>
  );
};
