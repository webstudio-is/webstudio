import { rawTheme, Flex, theme } from "@webstudio-is/design-system";
import { $queueStatus } from "~/shared/sync/project-queue";
import { SyncStatus } from "./sync-status";

export default {
  title: "Sync Status",
  component: SyncStatus,
};

export const Failed = () => {
  $queueStatus.set({ status: "failed" });
  return (
    <Flex
      css={{
        height: theme.spacing[15],
        background: rawTheme.colors.backgroundTopbar,
        padding: theme.spacing[5],
      }}
    >
      <SyncStatus />
    </Flex>
  );
};
