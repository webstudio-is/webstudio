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
  // mixBlendMode: "color-burn",
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
      content: {
        borderStyle: "solid",
        // borderColor: `#f59e0b`,
        borderColor: `oklch(from ${theme.colors.backgroundPrimary} l c h / 0.7)`,
        // backgroundColor: "oklch(from #eef2ff l c h / 0.5)",
      },
    },

    borderBlock: {
      left: {
        borderRightWidth: 0,
      },
      right: {
        borderLeftWidth: 0,
      },
      center: {
        borderRightWidth: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        alignContent: "end",
      },
      full: {},
      none: {
        borderWidth: 0,
      },
    },
  },
  defaultVariants: { variant: "default", borderBlock: "full" },
});

const baseStyle = css({
  boxSizing: "border-box",
  position: "absolute",
  display: "grid",
  // gap: 1, // Border dashed looks strange without gap
  gridTemplateColumns: `1fr auto 1fr`,
  // pointerEvents: "none",
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
  const variant = "content";
  const dynamicStyle = useDynamicStyle(rect);

  return (
    <>
      <div
        className={`${baseStyle()} ${baseOutlineStyle({ borderBlock: "none" })}`}
        style={dynamicStyle}
      >
        <div
          className={baseOutlineStyle({ variant, borderBlock: "left" })}
        ></div>

        <div className={baseOutlineStyle({ variant, borderBlock: "center" })}>
          <div
            style={{
              height: 0,
              display: "grid",
              alignContent: "center",
              alignSelf: "end",
            }}
          >
            {children}
          </div>
        </div>

        <div
          className={baseOutlineStyle({ variant, borderBlock: "right" })}
        ></div>
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
