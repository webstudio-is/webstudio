import { rawTheme, Flex, theme } from "@webstudio-is/design-system";
import { $queueStatus } from "~/shared/sync/project-queue";
import { SyncStatus } from "./sync-status";

export default {
  title: "Builder/Topbar/Sync Status",
  component: SyncStatus,
};

export const Idle = () => {
  $queueStatus.set({ status: "idle" });
  return (
    <Flex
      css={{
        height: theme.spacing[15],
        background: rawTheme.colors.backgroundPanel,
        padding: theme.spacing[5],
      }}
    >
      <SyncStatus />
    </Flex>
  );
};

export const Failed = () => {
  $queueStatus.set({ status: "failed" });
  return (
    <Flex
      css={{
        height: theme.spacing[15],
        background: rawTheme.colors.backgroundPanel,
        padding: theme.spacing[5],
      }}
    >
      <SyncStatus />
    </Flex>
  );
};

export const Fatal = () => {
  $queueStatus.set({
    status: "fatal",
    error: "Connection lost. Please reload the page.",
  });
  return (
    <Flex
      css={{
        height: theme.spacing[15],
        background: rawTheme.colors.backgroundPanel,
        padding: theme.spacing[5],
      }}
    >
      <SyncStatus />
    </Flex>
  );
};
