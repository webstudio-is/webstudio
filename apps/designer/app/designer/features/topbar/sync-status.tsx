import {
  Flex,
  keyframes,
  AccessibleIcon,
  styled,
  Box,
} from "~/shared/design-system";
import { CheckIcon, DotsHorizontalIcon } from "~/shared/icons";
import { useSyncStatus } from "../../shared/nano-states";

const iconSize = 15;

const StyledCheckIcon = styled(CheckIcon, {
  width: iconSize,
  height: iconSize,
  background: "$green9",
  borderRadius: "$radii$round",
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
  const [status] = useSyncStatus();
  return (
    <Flex align="center" justify="center">
      <AccessibleIcon label={`Sync status: ${status}`}>
        {status === "syncing" ? <AnimatedDotsIcon /> : <StyledCheckIcon />}
      </AccessibleIcon>
    </Flex>
  );
};
