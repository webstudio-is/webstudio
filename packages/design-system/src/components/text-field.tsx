import { mergeRefs } from "@react-aria/utils";
import React from "react";
import { useFocusWithin } from "@react-aria/interactions";
import { styled } from "../stitches.config";
import { Flex } from "./flex";
import { ChevronLeftIcon } from "@webstudio-is/icons";
import { cssVars } from "@webstudio-is/css-vars";

const backgroundColorVar = cssVars.define("background-color");
const colorVar = cssVars.define("color");

const getButtonSuffixCssVars = (state: "focus" | "hover") => {
  if (state === "focus") {
    return {
      [backgroundColorVar]: "$colors$primary",
      [colorVar]: "white",
    };
  }

  return {
    [backgroundColorVar]: "$colors$muted",
    [colorVar]: "$colors$hiContrast",
  };
};

const ButtonSuffix = styled(ChevronLeftIcon, {
  borderRadius: 2, // @todo shold come from theme
  height: "$5",
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
      color: "$muted",
    },
  },
});

const TextFieldBase = styled("div", {
  // Custom
  display: "flex",
  backgroundColor: "white",
  boxShadow: "inset 0 0 0 1px $colors$muted",
  color: "$hiContrast",
  fontVariantNumeric: "tabular-nums",
  gap: "$1",
  px: "$2",
  borderRadius: "$1",
  fontFamily: "$sans",
  fontSize: "$1",
  height: 28, // @todo waiting for the sizing scale
  lineHeight: 1,

  "&:hover": getButtonSuffixCssVars("hover"),

  "&:focus-within": {
    boxShadow:
      "inset 0px 0px 0px 1px $colors$primary, 0px 0px 0px 1px $colors$primary",
    ...getButtonSuffixCssVars("focus"),
  },

  "&[aria-disabled=true]": {
    pointerEvents: "none",
    backgroundColor: "$slate2",
  },
  "&:is(input:read-only)": {
    backgroundColor: "$slate2",
    "&:focus": {
      boxShadow: "inset 0px 0px 0px 1px $colors$muted",
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
            "inset 0px 0px 0px 1px $colors$blue8, 0px 0px 0px 1px $colors$primary",
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
    },
    withPrefix: {
      true: {
        paddingLeft: 2,
      },
    },
    withSuffix: {
      true: {
        paddingRight: 2,
      },
    },
  },
});

export type TextFieldProps = Pick<
  React.ComponentProps<typeof TextFieldBase>,
  "variant" | "state" | "css"
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
      css,
      disabled,
      inputRef,
      state,
      variant,
      onFocus,
      onBlur,
      onClick,
      type,
      ...textFieldProps
    } = props;
    let { suffix } = props;

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
        <ButtonSuffix
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
        ref={forwardedRef}
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
