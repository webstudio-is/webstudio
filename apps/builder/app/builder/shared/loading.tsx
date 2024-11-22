import { useState } from "react";
import { Box, Flex, Progress, theme } from "@webstudio-is/design-system";
import { WebstudioIcon } from "@webstudio-is/icons";
import { useInterval } from "~/shared/hook-utils/use-interval";

export const LoadingBackground = ({
  show,
  onTransitionEnd,
}: {
  show: boolean;
  onTransitionEnd?: () => void;
}) => {
  const [transitionEnded, setTransitionEnded] = useState(false);

  if (transitionEnded) {
    return;
  }

  return (
    <Box
      css={{
        position: "absolute",
        inset: 0,
        transitionDuration: "300ms",
        pointerEvents: "none",
        transitionProperty: "opacity",
        backgroundColor: theme.colors.backgroundTopbar,
        opacity: show ? 1 : 0,
        isolation: "isolate",
      }}
      onTransitionEnd={() => {
        setTransitionEnded(true);
        onTransitionEnd?.();
      }}
    />
  );
};

type LoadingState = {
  state: "ready" | "loading";
  progress: number;
  readyStates: Map<
    "dataLoadingState" | "selectedInstanceRenderState" | "canvasIframeState",
    boolean
  >;
};

export const Loading = ({ state }: { state: LoadingState }) => {
  const [fakeProgress, setFakeProgress] = useState(state.progress);
  const [transitionEnded, setTransitionEnded] = useState(false);

  useInterval((intervalId) => {
    setFakeProgress((previousFakeValue) => {
      // Makeing sure fake value is not higher than real value to prevent jumping back
      let nextFakeValue = Math.max(previousFakeValue + 1, state.progress);
      // Make sure fake value is not lower than 10 to avoid showing empty progress.
      nextFakeValue = Math.max(nextFakeValue, 10);
      // Making sure fake value can't get bigger than 100, now that it reached 100 we can stop faking it.
      if (nextFakeValue >= 100) {
        clearInterval(intervalId);
        return previousFakeValue;
      }
      return nextFakeValue;
    });
  }, 100);

  if (state.state === "ready" && transitionEnded) {
    return;
  }

  return (
    <Flex
      justify="center"
      css={{
        position: "absolute",
        inset: 0,
        top: theme.spacing[15],
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <LoadingBackground
        show={state.state !== "ready"}
        onTransitionEnd={() => {
          setTransitionEnded(true);
        }}
      />
      {state.state !== "ready" && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="3"
          css={{ isolation: "isolate" }}
        >
          <WebstudioIcon size={60} />
          <Progress value={fakeProgress} />
        </Flex>
      )}
    </Flex>
  );
};
