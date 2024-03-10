import { useStore } from "@nanostores/react";
import { Flex, rawTheme, Tooltip, theme } from "@webstudio-is/design-system";
import { CloudIcon } from "@webstudio-is/icons";
import { $authPermit } from "~/shared/nano-states";

export const ViewMode = () => {
  const authPermit = useStore($authPermit);

  if (authPermit !== "view") {
    return;
  }

  return (
    <Tooltip content={"View mode. Your changes will not be saved"}>
      <Flex
        align="center"
        justify="center"
        css={{ height: theme.spacing["15"] }}
      >
        <CloudIcon
          color={rawTheme.colors.yellow10}
          aria-label="View mode. Your changes will not be saved"
        />
      </Flex>
    </Tooltip>
  );
};
