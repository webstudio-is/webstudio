import { styled, theme } from "@webstudio-is/design-system";
import {
  Root,
  Viewport,
  Scrollbar,
  Thumb,
  Corner,
} from "@radix-ui/react-scroll-area";

const SCROLLBAR_SIZE = 10;

const ScrollAreaRoot = styled(Root, {
  borderRadius: 4,
  overflow: "hidden",
  boxShadow: `0 2px 10p ${theme.colors.blackA7}`,
  backgroundColor: "white",
});

const ScrollAreaViewport = styled(Viewport, {
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
});

const ScrollAreaScrollbar = styled(Scrollbar, {
  display: "flex",
  // ensures no selection
  userSelect: "none",
  // disable browser handling of all panning and zooming gestures on touch devices
  touchAction: "none",
  padding: 2,
  background: theme.colors.blackA6,
  transition: "background 160ms ease-out",
  "&:hover": { background: theme.colors.blackA8 },
  '&[data-orientation="vertical"]': { width: SCROLLBAR_SIZE },
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
    height: SCROLLBAR_SIZE,
  },
});

const ScrollAreaThumb = styled(Thumb, {
  flex: 1,
  background: theme.colors.mauve10,
  borderRadius: SCROLLBAR_SIZE,
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

const ScrollAreaCorner = styled(Corner, {
  background: theme.colors.blackA8,
});

export const ScrollArea = ({ children }) => {
  return (
    <ScrollAreaRoot>
      <ScrollAreaViewport> {children}</ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaScrollbar orientation="horizontal">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  );
};
