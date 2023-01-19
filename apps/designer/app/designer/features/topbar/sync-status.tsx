import { useStore } from "@nanostores/react";
import {
  theme,
  Flex,
  keyframes,
  AccessibleIcon,
  styled,
  Box,
} from "@webstudio-is/design-system";
import { CheckIcon, DotsHorizontalIcon } from "@webstudio-is/icons";
import { syncStatus } from "~/designer/shared/sync-server";

const iconSize = 15;

const StyledCheckIcon = styled(CheckIcon, {
  width: iconSize,
  height: iconSize,
  background: theme.colors.green9,
  borderRadius: theme.borderRadius.round,
});

const ellipsisKeyframes = keyframes({
  to: { width: iconSize },
});

const AnimatedDotsIcon = () => {
  return (
    <Flex direction="column" css={{ width: iconSize }}>
      <Box
        css={{
          animation: `${ellipsisKeyframes} steps(4,end) 900ms infinite`,
          width: 0,
          overflow: "hidden",
        }}
      >
        <DotsHorizontalIcon width="12" height="12" />
      </Box>
    </Flex>
  );
};

export const SyncStatus = () => {
  const status = useStore(syncStatus);
  return (
    <Flex align="center" justify="center">
      <AccessibleIcon label={`Sync status: ${status}`}>
        {status === "syncing" ? <AnimatedDotsIcon /> : <StyledCheckIcon />}
      </AccessibleIcon>
    </Flex>
  );
};
