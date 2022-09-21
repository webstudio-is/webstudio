import React from "react";
import { styled } from "../stitches.config";
import { Flex } from "./flex";

const InputBase = styled("input", {
  // Reset
  appearance: "none",
  borderWidth: "0",
  backgroundColor: "transparent",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "inherit",
  margin: "0",
  padding: "0",
  flexGrow: 1,
  flexShrink: 1,
  outline: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",

  // Focus should start on the input element then move to prefix and suffix elements.
  // DOM order reflects focus path and visually we use order to put them into the correct visual order.
  order: 1,

  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },
  "&:-webkit-autofill": {
    boxShadow: "inset 0 0 0 1px $colors$blue6, inset 0 0 0 100px $colors$blue3",
  },

  '&[type="search"]': {
    "&::-webkit-search-decoration, &::-webkit-search-cancel-button, &::-webkit-search-results-button, &::-webkit-search-results-decoration":
      {
        display: "none",
      },
  },

  '&[type="number"]': {
    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      MozAppearance: "textfield",
      margin: 0,
      display: "none",
    },
  },

  "&:-webkit-autofill::first-line": {
    fontFamily: "$untitled",
    color: "$hiContrast",
  },
  "&::placeholder": {
    color: "$slate9",
  },

  "&:disabled": {
    color: "$slate8",
    cursor: "not-allowed",
    "&::placeholder": {
      color: "$slate7",
    },
  },
});

const TextFieldBase = styled("div", {
  // Custom
  display: "flex",
  gap: "$1",
  backgroundColor: "$loContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  color: "$hiContrast",
  fontVariantNumeric: "tabular-nums",

  "&:focus-within": {
    boxShadow:
      "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
    "&:-webkit-autofill": {
      boxShadow:
        "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8, inset 0 0 0 100px $colors$blue3",
    },
  },

  "&[aria-disabled=true]": {
    pointerEvents: "none",
    backgroundColor: "$slate2",
  },
  "&:has(input:read-only)": {
    backgroundColor: "$slate2",
    "&:focus": {
      boxShadow: "inset 0px 0px 0px 1px $colors$slate7",
    },
  },

  variants: {
    size: {
      "1": {
        px: "$1",
        borderRadius: "$1",
        fontSize: "$1",
        height: "$5",
        lineHeight: "$sizes$5",
      },
      "2": {
        px: "$2",
        borderRadius: "$2",
        fontSize: "$3",
        height: "$6",
        lineHeight: "$sizes$6",
      },
    },
    variant: {
      ghost: {
        boxShadow: "none",
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$slateA7",
          },
        },
        "&:focus": {
          backgroundColor: "$loContrast",
          boxShadow:
            "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$blue8",
        },
        "&:disabled": {
          backgroundColor: "transparent",
        },
        "&:read-only": {
          backgroundColor: "transparent",
        },
      },
    },
    state: {
      invalid: {
        boxShadow: "inset 0 0 0 1px $colors$red7",
        "&:focus": {
          boxShadow:
            "inset 0px 0px 0px 1px $colors$red8, 0px 0px 0px 1px $colors$red8",
        },
      },
      valid: {
        boxShadow: "inset 0 0 0 1px $colors$green7",
        "&:focus": {
          boxShadow:
            "inset 0px 0px 0px 1px $colors$green8, 0px 0px 0px 1px $colors$green8",
        },
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});

type TextFieldProps = Pick<
  React.ComponentProps<typeof TextFieldBase>,
  "size" | "variant" | "state" | "css"
> &
  Omit<React.ComponentProps<"input">, "prefix" | "children"> & {
    inputRef?: React.Ref<HTMLInputElement>;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
  };

export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  (props, forwardedRef) => {
    const {
      prefix,
      suffix,
      css,
      disabled,
      inputRef,
      size,
      state,
      variant,
      ...textFieldProps
    } = props;

    return (
      <TextFieldBase
        aria-disabled={disabled}
        ref={forwardedRef}
        size={size}
        state={state}
        variant={variant}
        css={css}
      >
        {/* We want input to be the first element in DOM so it receives the focus first */}
        <InputBase disabled={disabled} {...textFieldProps} ref={inputRef} />

        {prefix && (
          <Flex
            css={{
              alignItems: "center",
              flexShrink: 0,
              order: 0,
            }}
          >
            {prefix}
          </Flex>
        )}

        {suffix && (
          <Flex
            css={{
              alignItems: "center",
              flexShrink: 0,
              order: 2,
            }}
          >
            {suffix}
          </Flex>
        )}
      </TextFieldBase>
    );
  }
);

TextField.displayName = "TextField";
