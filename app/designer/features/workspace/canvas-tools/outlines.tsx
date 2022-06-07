import { useCanvasRect, useZoom } from "~/designer/shared/nano-states";
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
  const [canvasRect] = useCanvasRect();

  let style;
  if (canvasRect !== undefined && rect !== undefined) {
    const top = rect.top + canvasRect.top;
    const left = rect.left + canvasRect.left;

    style = {
      transform: `translate3d(${left}px, ${top}px, 0)`,
      width: rect.width,
      height: rect.height,
    };
  }

  console.log("instanceRect", rect);
  console.log("canvasRect", canvasRect);
  return <Outline state="selected" style={style} />;
};
