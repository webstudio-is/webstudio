import { useMemo } from "react";
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

const baseStyle = css({
  position: "absolute",
  pointerEvents: "none",
  outline: `1px solid ${theme.colors.blue9}`,
  outlineOffset: -1,
  top: 0,
  left: 0,
  variants: {
    variant: {
      collaboration: {
        outline: "none",
        [angleVar]: `0deg`,
        border: `1px solid`,
        borderImage: `conic-gradient(from var(${angleVar}), #39FBBB 0%, #4A4EFA 12.5%, #E63CFE 25%, #FFAE3C 37.5%, #39FBBB 50%, #4A4EFA 62.5%, #E63CFE 75%, #FFAE3C 87.5%) 1`,
        animation: `2s ${angleKeyframes} linear infinite`,
      },
    },
  },
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
  children?: JSX.Element;
  rect?: Rect;
  variant?: "collaboration";
};

export const Outline = ({ children, rect, variant }: OutlineProps) => {
  const dynamicStyle = useDynamicStyle(rect);
  return (
    <>
      {propertyStyle}
      <div className={baseStyle({ variant })} style={dynamicStyle}>
        {children}
      </div>
    </>
  );
};
