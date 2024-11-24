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
  rect?: Rect;
  variant?: "default" | "collaboration" | "slot";
};

export const EditableBlockChildAddButtonOutline = ({
  rect,
  children,
}: {
  rect: Rect;
  children: ReactNode;
}) => {
  const dynamicStyle = useDynamicStyle(rect);

  return (
    <>
      <div
        className={`${baseStyle()} ${baseOutlineStyle()}`}
        style={dynamicStyle}
      >
        <div
          style={{
            height: 0,
            width: 0,
            display: "grid",
            alignContent: "center",
            justifyContent: "center",

            justifySelf: "start",
            alignSelf: "start",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export const Outline = ({ children, rect, variant }: OutlineProps) => {
  const dynamicStyle = useDynamicStyle(rect);

  return (
    <>
      {propertyStyle}
      <div
        className={`${baseStyle()} ${baseOutlineStyle({ variant })}`}
        style={dynamicStyle}
      >
        {children}
      </div>
    </>
  );
};
