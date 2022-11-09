import { mergeRefs } from "@react-aria/utils";
import React from "react";
import { useFocusWithin } from "@react-aria/interactions";
import { styled } from "../stitches.config";

const InputBase = styled("textarea", {
  // Reset
  appearance: "none",
  borderWidth: "0",
  backgroundColor: "transparent",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "inherit",
  color: "inherit",
  margin: "0",
  padding: "$2",
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  width: "100%",
  textOverflow: "ellipsis",
  outline: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  cursor: "inherit",

  heigh: "3em",

  "&:-webkit-autofill::first-line": {
    fontFamily: "$sans",
    color: "$hiContrast",
  },

  "&::placeholder": {
    color: "$hint",
  },

  "&:disabled": {
    color: "$slate8",
    cursor: "not-allowed",
    "&::placeholder": {
      color: "$slate7",
    },
  },
});

const TextAreaFieldBase = styled("div", {
  // Custom
  display: "flex",
  backgroundColor: "$loContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  color: "$hiContrast",
  fontVariantNumeric: "tabular-nums",
  borderRadius: "$1",
  fontFamily: "$sans",
  fontSize: "$1",
  lineHeight: 1,
  "&:focus-within": {
    boxShadow:
      "inset 0px 0px 0px 1px $colors$blue10, 0px 0px 0px 1px $colors$blue10",
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
            "inset 0px 0px 0px 1px $colors$blue10, 0px 0px 0px 1px $colors$blue10",
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
        boxShadow: "inset 0 0 0 1px $colors$red8",
        "&:focus-within": {
          boxShadow:
            "inset 0px 0px 0px 1px $colors$red8, 0px 0px 0px 1px $colors$red8",
        },
      },
      valid: {
        boxShadow: "inset 0 0 0 1px $colors$green7",
        "&:focus-within": {
          boxShadow:
            "inset 0px 0px 0px 1px $colors$green8, 0px 0px 0px 1px $colors$green8",
        },
      },
      active: {
        boxShadow:
          "inset 0px 0px 0px 1px $colors$blue10, 0px 0px 0px 1px $colors$blue10",
      },
    },
  },
});

export type TextAreaFieldProps = Pick<
  React.ComponentProps<typeof TextAreaFieldBase>,
  "variant" | "state" | "css"
> &
  Omit<React.ComponentProps<"textarea">, "prefix" | "children"> & {
    baseRef?: React.Ref<HTMLDivElement>;
    inputRef?: React.Ref<HTMLTextAreaElement>;
  };

export const TextAreaField = React.forwardRef<
  HTMLDivElement,
  TextAreaFieldProps
>((props, forwardedRef) => {
  const {
    css,
    disabled,
    baseRef,
    inputRef,
    state,
    variant,
    onFocus,
    onBlur,
    onClick,
    ...textFieldProps
  } = props;

  const internalInputRef = React.useRef<HTMLTextAreaElement>(null);

  const focusInnerInput = React.useCallback(() => {
    internalInputRef.current?.focus();
  }, [internalInputRef]);

  const { focusWithinProps } = useFocusWithin({
    isDisabled: disabled,
    // @ts-expect-error Type mismatch from react-aria
    onFocusWithin: onFocus,
    // @ts-expect-error Type mismatch from react-aria
    onBlurWithin: onBlur,
  });

  return (
    <TextAreaFieldBase
      {...focusWithinProps}
      aria-disabled={disabled}
      ref={mergeRefs(forwardedRef, baseRef ?? null)}
      state={state}
      variant={variant}
      css={css}
      onClickCapture={focusInnerInput}
    >
      <InputBase
        {...textFieldProps}
        disabled={disabled}
        onClick={onClick}
        ref={mergeRefs(internalInputRef, inputRef ?? null)}
      />
    </TextAreaFieldBase>
  );
});

TextAreaField.displayName = "TextAreaField";
