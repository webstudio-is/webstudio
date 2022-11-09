import { styled } from "../stitches.config";

export const Flex = styled("div", {
  boxSizing: "border-box",
  display: "flex",

  variants: {
    direction: {
      row: {
        flexDirection: "row",
      },
      column: {
        flexDirection: "column",
      },
      rowReverse: {
        flexDirection: "row-reverse",
      },
      columnReverse: {
        flexDirection: "column-reverse",
      },
    },
    align: {
      start: {
        alignItems: "flex-start",
      },
      center: {
        alignItems: "center",
      },
      end: {
        alignItems: "flex-end",
      },
      stretch: {
        alignItems: "stretch",
      },
      baseline: {
        alignItems: "baseline",
      },
    },
    justify: {
      start: {
        justifyContent: "flex-start",
      },
      center: {
        justifyContent: "center",
      },
      end: {
        justifyContent: "flex-end",
      },
      between: {
        justifyContent: "space-between",
      },
    },
    wrap: {
      noWrap: {
        flexWrap: "nowrap",
      },
      wrap: {
        flexWrap: "wrap",
      },
      wrapReverse: {
        flexWrap: "wrap-reverse",
      },
    },
    gap: {
      1: {
        gap: "$spacing$3",
      },
      2: {
        gap: "$spacing$5",
      },
      3: {
        gap: "$spacing$9",
      },
      4: {
        gap: "$spacing$10",
      },
      5: {
        gap: "$spacing$11",
      },
      6: {
        gap: "$spacing$13",
      },
      7: {
        gap: "$spacing$17",
      },
      8: {
        gap: "$spacing$19",
      },
      9: {
        gap: "$spacing$20",
      },
    },
  },
  defaultVariants: {
    direction: "row",
    align: "stretch",
    justify: "start",
    wrap: "noWrap",
  },
});
