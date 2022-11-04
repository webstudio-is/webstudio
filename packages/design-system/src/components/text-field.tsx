import { mergeRefs } from "@react-aria/utils";
import React from "react";
import { useFocusWithin } from "@react-aria/interactions";
import { css, styled } from "../stitches.config";
import { ChevronLeftIcon } from "@webstudio-is/icons";
import { cssVars } from "@webstudio-is/css-vars";

const backgroundColorVar = cssVars.define("background-color");
const colorVar = cssVars.define("color");

const getTextFieldSuffixCssVars = (state: "focus" | "hover") => {
  if (state === "focus") {
    return {
      [backgroundColorVar]: "$colors$blue10",
      [colorVar]: "white",
    };
  }

  return {
    [backgroundColorVar]: "$colors$slate7",
    [colorVar]: "$colors$hiContrast",
  };
};

const textFieldIconBaseStyle = css({
  height: "$5",
  minWidth: "$2",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 2,
});

// Trigger can be used as a button, which is focusable/hoverable itself or as an icon,
// which has the same states but activated over the parent component element.
export const TextFieldIconButton = styled(
  "button",
  {
    all: "unset",
    "&:hover": {
      backgroundColor: "$slate7",
      color: "$hiContrast",
    },
    "&:focus": {
      backgroundColor: "$blue10",
      color: "white",
    },
    variants: {
      state: {
        active: {
          backgroundColor: "$blue10",
          color: "white",
          "&:hover": {
            backgroundColor: "$blue10",
            color: "white",
          },
        },
        breakpoint: {
          backgroundColor: "$blue4",
          color: "$blue11",
          "&:hover": {
            backgroundColor: "$blue4",
            color: "$blue11",
          },
        },
      },
    },
  },
  textFieldIconBaseStyle
);

export const TextFieldIcon = styled("span", textFieldIconBaseStyle, {
  // Icon receives colors from parent.
  backgroundColor: cssVars.use(backgroundColorVar),
  color: cssVars.use(colorVar),
});

const InputBase = styled("input", {
  // Reset
  appearance: "none",
  borderWidth: "0",
  backgroundColor: "transparent",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "inherit",
  color: "inherit",
  margin: "0",
  padding: "0",
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  width: "100%",
  textOverflow: "ellipsis",
  outline: "none",
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  cursor: "inherit",

  // Focus should start on the input element then move to prefix and suffix elements.
  // DOM order reflects focus path and visually we use order to put them into the correct visual order.
  order: 1,
  "&[type='button']": {
    textAlign: "left",
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

const TextFieldBase = styled("div", {
  // Custom
  display: "flex",
  backgroundColor: "$loContrast",
  boxShadow: "inset 0 0 0 1px $colors$slate7",
  color: "$hiContrast",
  fontVariantNumeric: "tabular-nums",
  gap: "$1",
  px: "$2",
  borderRadius: "$1",
  fontFamily: "$sans",
  fontSize: "$1",
  height: 28, // @todo waiting for the sizing scale
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
      button: {
        "&:hover": getTextFieldSuffixCssVars("hover"),
        "&:focus-within": getTextFieldSuffixCssVars("focus"),
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
        ...getTextFieldSuffixCssVars("focus"),
      },
    },
    // Preffix and suffix are responsible for their spacing
    withPrefix: {
      true: {
        paddingLeft: 0,
      },
    },
    withSuffix: {
      true: {
        paddingRight: 0,
      },
    },
  },
});

const PrefixSlot = styled("div", {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  order: 0,
  padding: 2,
  paddingRight: 0,
  borderRadius: 2,
});

const SuffixSlot = styled("div", {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  order: 2,
  padding: 2,
  paddingLeft: 0,
  borderRadius: 2,
});

export type TextFieldProps = Pick<
  React.ComponentProps<typeof TextFieldBase>,
  "variant" | "state" | "css"
> &
  Omit<React.ComponentProps<"input">, "prefix" | "children"> & {
    scrubRef?: React.Ref<HTMLDivElement>;
    inputRef?: React.Ref<HTMLInputElement>;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
  };

export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  (props, forwardedRef) => {
    const {
      prefix,
      css,
      disabled,
      scrubRef,
      inputRef,
      state,
      variant: variantProp,
      onFocus,
      onBlur,
      onClick,
      type,
      // prevent spreading it into the dom
      suffix: suffixProp,
      ...textFieldProps
    } = props;
    let suffix = suffixProp;
    const variant =
      type === "button" && variantProp === undefined ? "button" : variantProp;

    const internalInputRef = React.useRef<HTMLInputElement>(null);

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

    if (type === "button" && suffix === undefined) {
      suffix = (
        <TextFieldIcon
          as={ChevronLeftIcon}
          onClick={() => {
            internalInputRef.current?.click();
          }}
        />
      );
    }

    return (
      <TextFieldBase
        {...focusWithinProps}
        aria-disabled={disabled}
        ref={mergeRefs(forwardedRef, scrubRef ?? null)}
        state={state}
        variant={variant}
        css={css}
        withPrefix={Boolean(prefix)}
        withSuffix={Boolean(suffix)}
        onClickCapture={focusInnerInput}
      >
        {/* We want input to be the first element in DOM so it receives the focus first */}
        <InputBase
          {...textFieldProps}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
        />

        {prefix && <PrefixSlot>{prefix}</PrefixSlot>}
        {suffix && <SuffixSlot>{suffix}</SuffixSlot>}
      </TextFieldBase>
    );
  }
);

TextField.displayName = "TextField";
