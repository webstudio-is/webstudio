import { useMemo } from "react";
import { styled } from "~/shared/design-system";

const OutlineContainer = styled("div", {
  position: "absolute",
  pointerEvents: "none",
  outline: "1px solid $blue9",
  outlineOffset: -1,
  top: 0,
  left: 0,
});

const useStyle = (rect?: DOMRect) => {
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
  rect?: DOMRect;
};

export const Outline = ({ children, rect }: OutlineProps) => {
  const style = useStyle(rect);
  return <OutlineContainer style={style}>{children}</OutlineContainer>;
};
