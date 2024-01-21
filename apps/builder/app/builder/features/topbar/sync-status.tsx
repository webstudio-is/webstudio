import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { Flex, rawTheme, Text, Tooltip } from "@webstudio-is/design-system";
import { OfflineIcon } from "@webstudio-is/icons";
import { useEffect } from "react";
import { queueStatus } from "~/builder/shared/sync";

const $isOnline = atom(false);

const subscribeIsOnline = () => {
  const handle = () => $isOnline.set(navigator.onLine);
  addEventListener("offline", handle);
  addEventListener("online", handle);
  return () => {
    removeEventListener("offline", handle);
    removeEventListener("online", handle);
  };
};

export const SyncStatus = () => {
  const statusObject = useStore(queueStatus);
  const isOnline = useStore($isOnline);
  useEffect(subscribeIsOnline, []);

  if (
    statusObject.status === "idle" ||
    statusObject.status === "running" ||
    statusObject.status === "recovering"
  ) {
    return null;
  }

  if (statusObject.status === "failed") {
    return (
      <Flex align="center" justify="center">
        <Tooltip
          variant="wrapped"
          content={
            <Text>
              {isOnline ? (
                <>
                  Experiencing connectivity issues. Your changes will be synced
                  with Webstudio once resolved.
                </>
              ) : (
                <>
                  Offline changes will be synced with Webstudio once you go
                  online.
                  <br />
                  Please check your internet connection.
                </>
              )}
            </Text>
          }
        >
          <OfflineIcon
            aria-label={`Sync status: failed`}
            color={rawTheme.colors.foregroundDestructive}
          />
        </Tooltip>
      </Flex>
    );
  }

  if (statusObject.status === "fatal") {
    return (
      <Flex align="center" justify="center">
        <Tooltip variant="wrapped" content={<>{statusObject.error}</>}>
          <OfflineIcon
            aria-label={`Sync status: fatal`}
            color={rawTheme.colors.foregroundDestructive}
          />
        </Tooltip>
      </Flex>
    );
  }

  /* exhaustive check */
  statusObject satisfies never;
};
