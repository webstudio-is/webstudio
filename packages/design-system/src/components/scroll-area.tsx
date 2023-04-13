import { forwardRef, type ComponentProps, type Ref } from "react";
import { styled, theme, css, type CSS } from "../stitches.config";
import { Root, Viewport, Scrollbar, Thumb } from "@radix-ui/react-scroll-area";

const ScrollAreaRoot = styled(Root, {
  boxSizing: "border-box",
  overflow: "hidden",
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
    minWidth: 16,
    minHeight: 44,
  },
});

const ScrollAreaScrollbar = styled(Scrollbar, {
  boxSizing: "border-box",
  // ensures no selection
  userSelect: "none",
  // disable browser handling of all panning and scaleUp gestures on touch devices
  touchAction: "none",
  padding: 2,
  paddingRight: 3,
  '&[data-orientation="vertical"]': {
    width: theme.spacing[6],
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
    height: theme.spacing[6],
  },
});

const viewPortStyle = css({
  boxSizing: "border-box",
  width: "100%",
  height: "100%",
  borderRadius: "inherit",

  variants: {
    verticalOnly: {
      // https://github.com/radix-ui/primitives/issues/926#issuecomment-1015279283
      true: { "& > div[style]": { display: "block !important" } },
    },
  },
});

type ScrollAreaProps = { css?: CSS; verticalOnly?: boolean } & Pick<
  ComponentProps<"div">,
  "onScroll" | "children"
>;

export const ScrollArea = forwardRef(
  (
    { children, css, onScroll, verticalOnly = true }: ScrollAreaProps,
    ref: Ref<HTMLDivElement>
  ) => {
    return (
      <ScrollAreaRoot scrollHideDelay={0} css={css}>
        <Viewport
          ref={ref}
          className={viewPortStyle({ verticalOnly })}
          onScroll={onScroll}
        >
          {children}
        </Viewport>
        <ScrollAreaScrollbar orientation="vertical">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
        {verticalOnly === false && (
          <ScrollAreaScrollbar orientation="horizontal">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        )}
      </ScrollAreaRoot>
    );
  }
);
ScrollArea.displayName = "ScrollArea";
