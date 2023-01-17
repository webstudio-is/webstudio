import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

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
        gap: theme.spacing[3],
      },
      2: {
        gap: theme.spacing[5],
      },
      3: {
        gap: theme.spacing[9],
      },
      4: {
        gap: theme.spacing[10],
      },
      5: {
        gap: theme.spacing[11],
      },
      6: {
        gap: theme.spacing[13],
      },
      7: {
        gap: theme.spacing[17],
      },
      8: {
        gap: theme.spacing[19],
      },
      9: {
        gap: theme.spacing[20],
      },
    },
    gapX: {
      1: {
        columnGap: theme.spacing[3],
      },
      2: {
        columnGap: theme.spacing[5],
      },
      3: {
        columnGap: theme.spacing[9],
      },
      4: {
        columnGap: theme.spacing[10],
      },
      5: {
        columnGap: theme.spacing[11],
      },
      6: {
        columnGap: theme.spacing[13],
      },
      7: {
        columnGap: theme.spacing[17],
      },
      8: {
        columnGap: theme.spacing[19],
      },
      9: {
        columnGap: theme.spacing[20],
      },
    },
    gapY: {
      1: {
        rowGap: theme.spacing[3],
      },
      2: {
        rowGap: theme.spacing[5],
      },
      3: {
        rowGap: theme.spacing[9],
      },
      4: {
        rowGap: theme.spacing[10],
      },
      5: {
        rowGap: theme.spacing[11],
      },
      6: {
        rowGap: theme.spacing[13],
      },
      7: {
        rowGap: theme.spacing[17],
      },
      8: {
        rowGap: theme.spacing[19],
      },
      9: {
        rowGap: theme.spacing[20],
      },
    },
  },
});
