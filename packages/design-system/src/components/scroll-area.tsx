import { styled } from "../stitches.config";
import { Root, Viewport, Scrollbar, Thumb } from "@radix-ui/react-scroll-area";

const SCROLLBAR_SIZE = 15;

const ScrollAreaRoot = styled(Root, {
  boxSizing: "border-box",
  overflow: "hidden",
});

const ScrollAreaViewport = styled(Viewport, {
  boxSizing: "border-box",
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
});

const ScrollAreaThumb = styled(Thumb, {
  boxSizing: "border-box",
  flex: 1,
  background: "rgba(0, 0, 0, 0.5)",
  borderRadius: 10,
  // increase target size for touch devices https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
    height: "100%",
    minWidth: 44,
    minHeight: 44,
  },
});

const ScrollAreaScrollbar = styled(Scrollbar, {
  boxSizing: "border-box",
  display: "flex",
  // ensures no selection
  userSelect: "none",
  // disable browser handling of all panning and scaleUp gestures on touch devices
  touchAction: "none",
  paddingRight: 2,
  paddingLeft: 6,
  background: "rgba(248, 248, 248, 0.76)",
  transition: "all 160ms ease-out",
  "&:hover": {
    paddingRight: 2,
    paddingLeft: 2,
    borderLeft: `1px solid #e8e8e8`,
  },
  '&[data-orientation="vertical"]': {
    width: SCROLLBAR_SIZE,
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
    height: SCROLLBAR_SIZE,
  },
});

type ScrollAreaProps = { children: JSX.Element | Array<JSX.Element> };

export const ScrollArea = ({ children }: ScrollAreaProps) => {
  return (
    <ScrollAreaRoot>
      <ScrollAreaViewport>{children}</ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaScrollbar orientation="horizontal">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
  );
};
