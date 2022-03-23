import { useValue } from "react-nano-state";
import { Flex, keyframes, AccessibleIcon } from "~/shared/design-system";
import { CheckIcon, DotsHorizontalIcon } from "~/shared/icons";
import { statusContainer } from "../sync";

const iconSize = 15;

const ellipsisKeyframes = keyframes({
  to: { width: iconSize },
});

const AnimatedDotsIcon = () => {
  return (
    <Flex
      direction="column"
      css={{
        animation: `${ellipsisKeyframes} steps(4,end) 900ms infinite`,
        width: 0,
        overflow: "hidden",
      }}
    >
      <DotsHorizontalIcon width="12" height="12" />
    </Flex>
  );
};

export const SyncStatus = () => {
  const [status] = useValue(statusContainer);
  return (
    <Flex
      align="center"
      justify="center"
      css={{
        mx: "$1",
        width: iconSize,
        height: iconSize,
        backgroundColor: "$green9",
        borderRadius: "100%",
      }}
    >
      <AccessibleIcon label={`Sync status: ${status}`}>
        {status === "syncing" ? <AnimatedDotsIcon /> : <CheckIcon />}
      </AccessibleIcon>
    </Flex>
  );
};
