import { useMemo } from "react";
import { styled, type Rect } from "@webstudio-is/design-system";

const OutlineContainer = styled("div", {
  position: "absolute",
  pointerEvents: "none",
  outline: "1px solid $blue9",
  outlineOffset: -1,
  top: 0,
  left: 0,
});

const useStyle = (rect?: Rect) => {
  return useMemo(() => {
    if (rect === undefined) return;
    return {
      transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
      width: rect.width,
      height: rect.height,
    };
  }, [rect]);
};

type OutlineProps = {
  children: JSX.Element;
  rect?: Rect;
};

export const Outline = ({ children, rect }: OutlineProps) => {
  const style = useStyle(rect);
  return <OutlineContainer style={style}>{children}</OutlineContainer>;
};
