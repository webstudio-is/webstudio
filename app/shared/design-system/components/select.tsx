import React from "react";
import { CSS, styled } from "../stitches.config";
import { CaretSortIcon } from "~/shared/icons";

const SelectWrapper = styled("div", {
  backgroundColor: "$loContrast",
  borderRadius: "$1",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  color: "$hiContrast",
  fontFamily: "$untitled",
  fontSize: "$1",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 400,
  height: "$5",

  "&:hover": {
    backgroundColor: "$slateA3",
  },

  "&:focus-within": {
    zIndex: 1,
    boxShadow:
      "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
  },

  variants: {
    ghost: {
      true: {
        backgroundColor: "transparent",
        boxShadow: "none",
      },
    },
  },
});

const StyledSelect = styled("select", {
  appearance: "none",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "inherit",
  color: "inherit",
  font: "inherit",
  outline: "none",
  width: "100%",
  height: "100%",
  pl: "$1",
  pr: "$3",
});

const StyledCaretSortIcon = styled(CaretSortIcon, {
  position: "absolute",
  pointerEvents: "none",
  display: "inline",

  // Use margins instead of top/left to avoid setting "position: relative" on parent,
  // which would make stacking context tricky with Select used in a control group.
  marginTop: 5,
  marginLeft: -16,
});

type SelectProps = React.ComponentProps<typeof StyledSelect> & { css?: CSS };

export const Select = React.forwardRef<
  React.ElementRef<typeof StyledSelect>,
  SelectProps
>(({ css, ...props }, forwardedRef) => (
  <SelectWrapper css={css}>
    <StyledSelect ref={forwardedRef} {...props} />
    <StyledCaretSortIcon />
  </SelectWrapper>
));
Select.displayName = "Select";
Select.toString = () => `.${SelectWrapper.className}`;
