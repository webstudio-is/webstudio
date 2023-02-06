import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { Flex, rawTheme, Tooltip } from "@webstudio-is/design-system";
import { OfflineIcon } from "@webstudio-is/icons";
import { useEffect } from "react";
import { queueStatus } from "~/designer/shared/sync";

const isOnlineStore = atom(false);

const subscribeIsOnline = () => {
  const handle = () => isOnlineStore.set(navigator.onLine);
  addEventListener("offline", handle);
  addEventListener("online", handle);
  return () => {
    removeEventListener("offline", handle);
    removeEventListener("online", handle);
  };
};

export const SyncStatus = () => {
  const status = useStore(queueStatus);
  const isOnline = useStore(isOnlineStore);
  useEffect(subscribeIsOnline, []);

  if (status !== "failed") {
    return null;
  }

  return (
    <Flex align="center" justify="center">
      <Tooltip
        variant="wrapped"
        content={
          <>
            Offline changes will be synced with Webstudio once you go online.
            {isOnline ? (
              ""
            ) : (
              <>
                <br />
                Please check your internet connection.
              </>
            )}
          </>
        }
      >
        <OfflineIcon
          aria-label={`Sync status: ${status}`}
          color={rawTheme.colors.foregroundDestructive}
        />
      </Tooltip>
    </Flex>
  );
};
