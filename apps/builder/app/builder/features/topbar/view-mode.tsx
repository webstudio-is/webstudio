import { useStore } from "@nanostores/react";
import {
  Flex,
  AccessibleIcon,
  rawTheme,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { CloudIcon } from "@webstudio-is/icons";
import { $authPermit } from "~/shared/nano-states";

export const ViewMode = () => {
  const authPermit = useStore($authPermit);

  if (authPermit !== "view") {
    return null;
  }

  return (
    <Flex align="center" justify="center">
      <AccessibleIcon label={`View mode`}>
        <Tooltip
          variant="wrapped"
          content={<Text>View mode. Your changes will not be saved</Text>}
        >
          {/* @todo replace the icon, waiting for figma */}
          <CloudIcon width={20} height={20} color={rawTheme.colors.yellow10} />
        </Tooltip>
      </AccessibleIcon>
    </Flex>
  );
};
