import { styled, theme } from "../stitches.config";
import { Root, Viewport, Scrollbar, Thumb } from "@radix-ui/react-scroll-area";

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
  background: theme.colors.foregroundMoreSubtle,
  borderRadius: theme.spacing[4],
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
  // ensures no selection
  userSelect: "none",
  // disable browser handling of all panning and scaleUp gestures on touch devices
  touchAction: "none",
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[2],
  '&[data-orientation="vertical"]': {
    width: theme.spacing[6],
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
    height: theme.spacing[6],
  },
});

type ScrollAreaProps = { children: JSX.Element | Array<JSX.Element> };

export const ScrollArea = ({ children }: ScrollAreaProps) => {
  return (
    <ScrollAreaRoot scrollHideDelay={0}>
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
