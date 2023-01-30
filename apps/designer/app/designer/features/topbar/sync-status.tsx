import { useStore } from "@nanostores/react";
import {
  Flex,
  AccessibleIcon,
  rawTheme,
  Tooltip,
} from "@webstudio-is/design-system";
import { CloudIcon } from "@webstudio-is/icons";
import { useEffect, useState } from "react";
import { syncStatus } from "~/designer/shared/sync";

const useIsOffline = () => {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    addEventListener("offline", handleOffline);
    return () => removeEventListener("offline", handleOffline);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    addEventListener("online", handleOnline);
    return () => removeEventListener("online", handleOnline);
  }, []);
  return isOffline;
};

export const SyncStatus = () => {
  const status = useStore(syncStatus);
  const isOffline = useIsOffline();

  if (status !== "error") {
    return null;
  }

  return (
    <Flex align="center" justify="center">
      <AccessibleIcon label={`Sync status: ${status}`}>
        <Tooltip
          variant="wrapped"
          content={
            <>
              Offline changes will be synced with Webstudio once you go online.
              {isOffline ? (
                <>
                  <br />
                  Please check your internet connection.
                </>
              ) : (
                ""
              )}
            </>
          }
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
