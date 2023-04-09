import { useStore } from "@nanostores/react";
import { css, theme } from "@webstudio-is/design-system";
import { useEffect, useState, type RefObject } from "react";
import { selectedBreakpointStore } from "~/shared/nano-states";
import type { Breakpoint } from "@webstudio-is/project-build";
import { breakpointsStore } from "~/shared/nano-states";
import { isBaseBreakpoint } from "~/shared/breakpoints";

const cascadeIndicatorStyle = css({
  position: "absolute",
  bottom: 0,
  height: 2,
  transition: "150ms width, 150ms left, 150ms right",
  '&[data-direction="left"]': {
    background: theme.colors.backgroundGradientHorizontal,
  },
  '&[data-direction="right"]': {
    background: theme.colors.backgroundGradientHorizontalReverse,
  },
});

const calcIndicatorStyle = ({
  buttonLeft,
  buttonWidth,
  containerWidth,
  selectedBreakpoint,
}: {
  buttonLeft: number;
  buttonWidth: number;
  containerWidth: number;
  selectedBreakpoint: Breakpoint;
}) => {
  if (isBaseBreakpoint(selectedBreakpoint)) {
    return {
      left: {
        left: 0,
        width: buttonLeft + buttonWidth / 2,
      },
      right: {
        width: containerWidth - buttonLeft - buttonWidth / 2,
        left: buttonLeft + buttonWidth / 2,
      },
    };
  }
  if (selectedBreakpoint.minWidth !== undefined) {
    return {
      left: {
        right: buttonLeft + buttonWidth,
        width: buttonLeft + buttonWidth,
        left: 0,
      },
      right: {
        left: 0,
        width: 0,
      },
    };
  }

  return {
    left: {
      left: 0,
      width: 0,
    },
    right: {
      width: containerWidth - buttonLeft,
      left: buttonLeft,
    },
  };
};

const useSizes = ({
  buttonRef,
  selectedBreakpoint,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  selectedBreakpoint?: Breakpoint;
}) => {
  const [buttonLeft, setButtonLeft] = useState<number>();
  const [buttonWidth, setButtonWidth] = useState<number>();
  const [containerWidth, setContainerWidth] = useState<number>();
  const breakpoints = useStore(breakpointsStore);

  useEffect(() => {
    if (buttonRef.current) {
      setButtonLeft(buttonRef.current.offsetLeft);
      setButtonWidth(buttonRef.current.offsetWidth);
      setContainerWidth(buttonRef.current.parentElement?.offsetWidth);
    }
  }, [
    selectedBreakpoint,
    buttonRef,
    // needed to update sizes when breakpoints are changed
    breakpoints,
  ]);

  if (
    buttonLeft === undefined ||
    containerWidth === undefined ||
    buttonWidth === undefined
  ) {
    return;
  }
  return { buttonLeft, containerWidth, buttonWidth };
};

// There are 2 indicators left and right.
// Left one is shown for min breakpoints, right one for max breakpoints.
// When you have base breakpoint selected which has neither min nor max width, both indicators are shown.
export const CascadeIndicator = ({
  buttonRef,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
}) => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const sizes = useSizes({ buttonRef, selectedBreakpoint });
  if (selectedBreakpoint === undefined || sizes === undefined) {
    return null;
  }

  const indicatorStyle = calcIndicatorStyle({ ...sizes, selectedBreakpoint });
  return (
    <>
      <div
        className={cascadeIndicatorStyle()}
        data-direction="left"
        style={indicatorStyle.left}
      />
      <div
        className={cascadeIndicatorStyle()}
        data-direction="right"
        style={indicatorStyle.right}
      />
    </>
  );
};
