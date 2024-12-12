import { useMemo, type ReactNode } from "react";
import { css, keyframes, type Rect } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

const angleVar = `--ws-outline-angle`;

// Won't work in current FF/Safari, but outline will still work, just no animation.
const propertyStyle = (
  <style>{`
    @property ${angleVar} {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
  `}</style>
);

const angleKeyframes = keyframes({
  to: {
    [angleVar]: "360deg",
  },
});

const baseOutlineStyle = css({
  borderWidth: 1,
  variants: {
    variant: {
      default: {
        borderStyle: "solid",
        borderColor: `oklch(from ${theme.colors.backgroundPrimary} l c h / 0.7)`,
      },
      collaboration: {
        [angleVar]: `0deg`,
        borderStyle: "solid",
        borderImage: `conic-gradient(from var(${angleVar}), #39FBBB 0%, #4A4EFA 12.5%, #E63CFE 25%, #FFAE3C 37.5%, #39FBBB 50%, #4A4EFA 62.5%, #E63CFE 75%, #FFAE3C 87.5%) 1`,
        animation: `2s ${angleKeyframes} linear infinite`,
      },
      slot: {
        borderStyle: "solid",
        borderColor: theme.colors.foregroundReusable,
      },
    },

    isLeftClamped: {
      true: {
        borderLeftWidth: 0,
      },
    },
    isRightClamped: {
      true: {
        borderRightWidth: 0,
      },
    },
    isBottomClamped: {
      true: {
        borderBottomWidth: 0,
      },
    },
    isTopClamped: {
      true: {
        borderTopWidth: 0,
      },
    },
  },
  defaultVariants: { variant: "default" },
});

const baseStyle = css({
  boxSizing: "border-box",
  position: "absolute",
  display: "grid",
  pointerEvents: "none",
  top: 0,
  left: 0,
});

const useDynamicStyle = (rect?: Rect) => {
  return useMemo(() => {
    if (rect === undefined) {
      return;
    }
    return {
      transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
      width: rect.width,
      height: rect.height,
    };
  }, [rect]);
};

type OutlineProps = {
  children?: ReactNode;
  rect: Rect;
  clampingRect: Rect;
  variant?: "default" | "collaboration" | "slot";
};

export const Outline = ({
  children,
  rect,
  clampingRect,
  variant,
}: OutlineProps) => {
  const outlineRect = {
    top: Math.max(rect.top, clampingRect.top),
    height:
      Math.min(rect.top + rect.height, clampingRect.top + clampingRect.height) -
      Math.max(rect.top, clampingRect.top),

    left: Math.max(rect.left, clampingRect.left),
    width:
      Math.min(rect.left + rect.width, clampingRect.left + clampingRect.width) -
      Math.max(rect.left, clampingRect.left),
  };

  const isLeftClamped = rect.left < outlineRect.left;
  const isTopClamped = rect.top < outlineRect.top;

  const isRightClamped =
    Math.round(rect.left + rect.width) > Math.round(clampingRect.width);

  const isBottomClamped =
    Math.round(rect.top + rect.height) > Math.round(clampingRect.height);

  const dynamicStyle = useDynamicStyle(outlineRect);

  return (
    <>
      {propertyStyle}
      <div
        className={`${baseStyle()} ${baseOutlineStyle({ variant, isLeftClamped, isRightClamped, isBottomClamped, isTopClamped })}`}
        style={dynamicStyle}
      >
        {children}
      </div>
    </>
  );
};
