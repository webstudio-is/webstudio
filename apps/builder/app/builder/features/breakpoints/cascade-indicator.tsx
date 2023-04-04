import { useStore } from "@nanostores/react";
import { css, theme } from "@webstudio-is/design-system";
import { useEffect, useState, type RefObject } from "react";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import type { Breakpoint } from "@webstudio-is/project-build";

const cascadeIndicatorStyle = css({
  position: "absolute",
  bottom: 0,
  height: 2,
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
  const isBase =
    selectedBreakpoint.minWidth === undefined &&
    selectedBreakpoint.maxWidth === undefined;

  if (isBase) {
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

  if (selectedBreakpoint.minWidth) {
    return {
      left: {
        width: buttonLeft + buttonWidth,
        left: buttonLeft,
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

  useEffect(() => {
    if (buttonRef.current) {
      setButtonLeft(buttonRef.current.offsetLeft);
      setButtonWidth(buttonRef.current.offsetWidth);
      setContainerWidth(buttonRef.current.parentElement?.offsetWidth);
    }
  }, [selectedBreakpoint]);

  if (
    buttonLeft === undefined ||
    containerWidth === undefined ||
    buttonWidth === undefined
  ) {
    return;
  }
  return { buttonLeft, containerWidth, buttonWidth };
};

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
