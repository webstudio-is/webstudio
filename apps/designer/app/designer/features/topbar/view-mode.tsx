import {
  Flex,
  AccessibleIcon,
  rawTheme,
  Tooltip,
} from "@webstudio-is/design-system";
import { CloudIcon } from "@webstudio-is/icons";
import { useAuthPermit } from "~/shared/nano-states";

export const ViewMode = () => {
  const [authPermit] = useAuthPermit();

  if (authPermit !== "view") {
    return null;
  }

  return (
    <Flex align="center" justify="center">
      <AccessibleIcon label={`View mode`}>
        <Tooltip
          variant="wrapped"
          content={<>View mode. Your changes will not be saved</>}
        >
          {/* @todo replace the icon, waiting for figma */}
          <CloudIcon width={20} height={20} color={rawTheme.colors.yellow10} />
        </Tooltip>
      </AccessibleIcon>
    </Flex>
  );
};
