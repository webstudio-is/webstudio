import { styled } from "../stitches.config";

export const Grid = styled("div", {
  boxSizing: "border-box",
  display: "grid",

  variants: {
    align: {
      start: {
        alignItems: "start",
      },
      center: {
        alignItems: "center",
      },
      end: {
        alignItems: "end",
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
        justifyContent: "start",
      },
      center: {
        justifyContent: "center",
      },
      end: {
        justifyContent: "end",
      },
      between: {
        justifyContent: "space-between",
      },
    },
    flow: {
      row: {
        gridAutoFlow: "row",
      },
      column: {
        gridAutoFlow: "column",
      },
      dense: {
        gridAutoFlow: "dense",
      },
      rowDense: {
        gridAutoFlow: "row dense",
      },
      columnDense: {
        gridAutoFlow: "column dense",
      },
    },
    columns: {
      1: {
        gridTemplateColumns: "repeat(1, 1fr)",
      },
      2: {
        gridTemplateColumns: "repeat(2, 1fr)",
      },
      3: {
        gridTemplateColumns: "repeat(3, 1fr)",
      },
      4: {
        gridTemplateColumns: "repeat(4, 1fr)",
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
    gapX: {
      1: {
        columnGap: "$spacing$3",
      },
      2: {
        columnGap: "$spacing$5",
      },
      3: {
        columnGap: "$spacing$9",
      },
      4: {
        columnGap: "$spacing$10",
      },
      5: {
        columnGap: "$spacing$11",
      },
      6: {
        columnGap: "$spacing$13",
      },
      7: {
        columnGap: "$spacing$17",
      },
      8: {
        columnGap: "$spacing$19",
      },
      9: {
        columnGap: "$spacing$20",
      },
    },
    gapY: {
      1: {
        rowGap: "$spacing$3",
      },
      2: {
        rowGap: "$spacing$5",
      },
      3: {
        rowGap: "$spacing$9",
      },
      4: {
        rowGap: "$spacing$10",
      },
      5: {
        rowGap: "$spacing$11",
      },
      6: {
        rowGap: "$spacing$13",
      },
      7: {
        rowGap: "$spacing$17",
      },
      8: {
        rowGap: "$spacing$19",
      },
      9: {
        rowGap: "$spacing$20",
      },
    },
  },
});
