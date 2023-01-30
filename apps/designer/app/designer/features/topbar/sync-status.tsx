import { useStore } from "@nanostores/react";
import {
  Flex,
  AccessibleIcon,
  rawTheme,
  Tooltip,
} from "@webstudio-is/design-system";
import { CloudIcon } from "@webstudio-is/icons";
import { syncStatus } from "~/designer/shared/sync";

export const SyncStatus = () => {
  const status = useStore(syncStatus);
  if (status !== "error") {
    return null;
  }
  return (
    <Flex align="center" justify="center">
      <AccessibleIcon label={`Sync status: ${status}`}>
        <Tooltip
          variant="wrapped"
          content="Offline changes will be synced with Webstudio once you go online."
        >
          {/* @todo replace the icon, waiting for figma */}
          <CloudIcon
            width={20}
            height={20}
            color={rawTheme.colors.foregroundDestructive}
          />
        </Tooltip>
      </AccessibleIcon>
    </Flex>
  );
};
