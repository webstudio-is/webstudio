import { styled, keyframes } from "../stitches.config";

const pulse = keyframes({
  "0%": { opacity: 0 },
  "100%": { opacity: "100%" },
});

export const Skeleton = styled("div", {
  backgroundColor: "$slate4",
  position: "relative",
  overflow: "hidden",

  "&::after": {
    animationName: `${pulse}`,
    animationDuration: "500ms",
    animationDirection: "alternate",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
    backgroundColor: "$slate6",
    borderRadius: "inherit",
    bottom: 0,
    content: '""',
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },

  variants: {
    variant: {
      avatar1: {
        borderRadius: "$borderRadius$round",
        height: "$spacing$9",
        width: "$spacing$9",
      },
      avatar2: {
        borderRadius: "$borderRadius$round",
        height: "$spacing$11",
        width: "$spacing$11",
      },
      avatar3: {
        borderRadius: "$borderRadius$round",
        height: "$spacing$13",
        width: "$spacing$13",
      },
      avatar4: {
        borderRadius: "$borderRadius$round",
        height: "$spacing$17",
        width: "$spacing$17",
      },
      avatar5: {
        borderRadius: "$borderRadius$round",
        height: "$spacing$19",
        width: "$spacing$19",
      },
      avatar6: {
        borderRadius: "$borderRadius$round",
        height: "$spacing$20",
        width: "$spacing$20",
      },
      text: {
        height: "$spacing$3",
      },
      title: {
        height: "$spacing$11",
      },
      heading: {
        height: "$spacing$9",
      },
      button: {
        borderRadius: "$borderRadius$4",
        height: "$spacing$11",
        width: "$spacing$19",
      },
    },
  },
  defaultVariants: {
    variant: "text",
  },
});
