import { useStore } from "@nanostores/react";
import { css, theme } from "@webstudio-is/design-system";
import { useEffect, useState } from "react";
import type { Breakpoint, Breakpoints } from "@webstudio-is/project-build";
import { breakpointsStore } from "~/shared/nano-states";
import { isBaseBreakpoint } from "~/shared/breakpoints";

const cascadeIndicatorStyle = css({
  position: "absolute",
  bottom: 0,
  height: 3,
  borderRadius: 2,
  transition: "150ms width, 150ms left, 150ms right",
  '&[data-direction="left"]': {
    background: theme.colors.backgroundGradientHorizontal,
  },
  '&[data-direction="right"]': {
    background: theme.colors.backgroundGradientHorizontalReverse,
  },
});

const hasMinAndMax = (breakpoints: Breakpoints) => {
  let hasMin = false;
  let hasMax = false;
  for (const breakpoint of breakpoints.values()) {
    if (breakpoint.minWidth !== undefined) {
      hasMin = true;
    }
    if (breakpoint.maxWidth !== undefined) {
      hasMax = true;
    }
  }

  return { hasMin, hasMax };
};

const calcIndicatorStyle = ({
  buttonLeft,
  buttonWidth,
  containerWidth,
  selectedBreakpoint,
  breakpoints,
}: {
  buttonLeft: number;
  buttonWidth: number;
  containerWidth: number;
  selectedBreakpoint: Breakpoint;
  breakpoints: Breakpoints;
}) => {
  if (isBaseBreakpoint(selectedBreakpoint)) {
    const { hasMin, hasMax } = hasMinAndMax(breakpoints);
    if (hasMin && hasMax) {
      return {
        left: {
          left: 0,
          width: buttonLeft + buttonWidth / 2,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        },
        right: {
          width: containerWidth - buttonLeft - buttonWidth / 2,
          left: buttonLeft + buttonWidth / 2,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        },
      };
    }
    if (hasMin) {
      return {
        left: {
          left: 0,
          width: buttonLeft + buttonWidth,
        },
        right: {
          width: 0,
          right: 0,
        },
      };
    }
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
  getButtonById,
  selectedBreakpoint,
}: {
  getButtonById: (id: string) => HTMLButtonElement | undefined;
  selectedBreakpoint?: Breakpoint;
}) => {
  const [buttonLeft, setButtonLeft] = useState<number>();
  const [buttonWidth, setButtonWidth] = useState<number>();
  const [containerWidth, setContainerWidth] = useState<number>();
  const breakpoints = useStore(breakpointsStore);

  useEffect(() => {
    if (selectedBreakpoint === undefined) {
      return;
    }

    const button = getButtonById(selectedBreakpoint?.id);

    if (button === undefined) {
      return;
    }

    setButtonLeft(button.offsetLeft);
    setButtonWidth(button.offsetWidth);
    setContainerWidth(button.parentElement?.offsetWidth);
  }, [
    selectedBreakpoint,
    getButtonById,
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
  getButtonById,
  selectedBreakpoint,
  breakpoints,
}: {
  getButtonById: (id: string) => HTMLButtonElement | undefined;
  selectedBreakpoint: Breakpoint;
  breakpoints: Breakpoints;
}) => {
  const sizes = useSizes({ getButtonById, selectedBreakpoint });
  if (selectedBreakpoint === undefined || sizes === undefined) {
    return null;
  }
  const indicatorStyle = calcIndicatorStyle({
    ...sizes,
    selectedBreakpoint,
    breakpoints,
  });
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
