import { useMemo } from "react";
import { styled } from "~/shared/design-system";
import { useSelectedInstanceRect } from "~/shared/nano-states";

const Outline = styled(
  "div",
  {
    position: "absolute",
    pointerEvents: "none",
    outline: "2px solid $blue9",
    outlineOffset: -2,
    top: 0,
    left: 0,
  },
  {
    variants: {
      state: {
        selected: {
          zIndex: "$4",
        },
        hovered: {
          zIndex: "$3",
        },
      },
    },
  }
);

const Label = styled(
  "div",
  {
    position: "absolute",
    display: "flex",
    padding: "0 $1",
    height: "$4",
    color: "$hiContrast",
    alignItems: "center",
    justifyContent: "center",
    gap: "$1",
    fontSize: "$2",
    fontFamily: "$sans",
    lineHeight: 1,
    minWidth: "$6",
  },
  {
    variants: {
      state: {
        selected: {
          backgroundColor: "$blue9",
        },
        hovered: {
          color: "$blue9",
        },
      },
      position: {
        outside: {
          top: "-$4",
        },
        inside: {
          top: 0,
        },
      },
    },
  }
);

export const SelectedInstanceOutline = () => {
  const [rect] = useSelectedInstanceRect();

  const style = useMemo(() => {
    if (rect === undefined) return;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, [rect]);

  if (style === undefined) return null;

  return <Outline state="selected" style={style} />;
};
