import { styled } from "../stitches.config";

export const Caption = styled("caption", {
  textAlign: "start",
  marginBottom: "$spacing$11",
});

export const Tbody = styled("tbody", {
  width: "100%",
});

export const Tfoot = styled("tfoot", {});

export const Tr = styled("tr", {});

export const Th = styled("th", {
  fontWeight: "unset",
  textAlign: "start",
  fontSize: "$fontSize$3",
  py: "$spacing$5",
  borderBottom: "$spacing$1 solid $gray4",
  variants: {
    align: {
      start: {
        textAlign: "start",
      },
      center: {
        textAlign: "center",
      },
      end: {
        textAlign: "end",
      },
    },
    border: {
      solid: {
        borderBottom: "$spacing$1 solid $gray4",
      },
      dashed: {
        borderBottom: "$spacing$1 dashed $gray8",
      },
    },
  },
  defaultVariants: {
    align: "start",
    border: "solid",
  },
});

export const Td = styled("td", {
  py: "$spacing$5",
  borderBottom: "$spacing$1 solid $gray4",
  fontSize: "$fontSize$3",
  variants: {
    align: {
      start: {
        textAlign: "start",
      },
      center: {
        textAlign: "center",
      },
      end: {
        textAlign: "end",
      },
    },
    border: {
      solid: {
        borderBottom: "$spacing$1 solid $gray4",
      },
      dashed: {
        borderBottom: "$spacing$1 dashed $gray8",
      },
    },
  },
  defaultVariants: {
    align: "start",
    border: "solid",
  },
});

export const Thead = styled("thead", {
  [`& ${Th}`]: {
    fontSize: "$fontSize$1",
    color: "$gray11",
  },
  [`& ${Td}`]: {
    fontSize: "$fontSize$1",
    color: "$gray11",
  },
});

export const Table = styled("table", {
  width: "100%",
  tableLayout: "fixed",
  borderSpacing: 0,
  variants: {
    striped: {
      true: {
        [`& ${Tbody}`]: {
          [`& ${Tr}`]: {
            "&:nth-child(odd)": {
              bc: "$gray2",
            },
          },
        },
      },
    },
  },
});
