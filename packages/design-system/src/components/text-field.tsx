import { mergeRefs } from "@react-aria/utils";
import React, {
  type ComponentProps,
  type RefObject,
  type FocusEventHandler,
} from "react";
import { useFocusWithin } from "@react-aria/interactions";
import { css, styled } from "../stitches.config";
import { ChevronLeftIcon } from "@webstudio-is/icons";
import { cssVars } from "@webstudio-is/css-vars";
import { theme } from "../stitches.config";

const backgroundColorVar = cssVars.define("background-color");
const colorVar = cssVars.define("color");

const getTextFieldSuffixCssVars = (state: "focus" | "hover") => {
  if (state === "focus") {
    return {
      [backgroundColorVar]: theme.colors.blue10,
      [colorVar]: "white",
    };
  }

  return {
    [backgroundColorVar]: theme.colors.slate7,
    [colorVar]: theme.colors.hiContrast,
  };
};

const textFieldIconBaseStyle = css({
  height: theme.spacing[11],
  minWidth: theme.spacing[5],
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
    background: "none",
    border: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: "inherit",
    color: "inherit",
    padding: 0,
    margin: 0,
    "&:hover": {
      backgroundColor: theme.colors.slate7,
      color: theme.colors.hiContrast,
    },
    "&:focus": {
      backgroundColor: theme.colors.blue10,
      color: "white",
    },
    variants: {
      state: {
        active: {
          backgroundColor: theme.colors.blue10,
          color: "white",
          "&:hover": {
            backgroundColor: theme.colors.blue10,
            color: "white",
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

export const TextFieldInput = styled("input", {
  // Reset
  appearance: "none",
  borderWidth: "0",
  backgroundColor: "transparent",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "inherit",
  color: "inherit",
  padding: "0",
  height: theme.spacing[9],
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: theme.spacing[10],
  minWidth: 0,
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
    fontFamily: theme.fonts.sans,
    color: theme.colors.hiContrast,
  },

  "&::placeholder": {
    color: theme.colors.hint,
  },

  "&:disabled": {
    color: theme.colors.slate8,
    cursor: "not-allowed",
    "&::placeholder": {
      color: theme.colors.slate7,
    },
  },
});

export const TextFieldContainer = styled("div", {
  // Custom
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  backgroundColor: theme.colors.backgroundControls,
  boxShadow: `inset 0 0 0 1px ${theme.colors.slate7}`,
  color: theme.colors.hiContrast,
  fontVariantNumeric: "tabular-nums",
  gap: theme.spacing[3],
  px: theme.spacing[4],
  borderRadius: theme.borderRadius[4],
  fontFamily: theme.fonts.sans,
  fontSize: theme.deprecatedFontSize[3],
  minHeight: theme.spacing[12],
  lineHeight: 1,
  minWidth: 0,
  "&:focus-within": {
    boxShadow: `inset 0px 0px 0px 1px ${theme.colors.blue10}, 0px 0px 0px 1px ${theme.colors.blue10}`,
  },
  "&[aria-disabled=true]": {
    pointerEvents: "none",
    backgroundColor: theme.colors.slate2,
  },
  "&:has(input:read-only)": {
    backgroundColor: theme.colors.slate2,
    "&:focus": {
      boxShadow: `inset 0px 0px 0px 1px ${theme.colors.slate7}`,
    },
  },
  variants: {
    variant: {
      ghost: {
        boxShadow: "none",
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            boxShadow: `inset 0 0 0 1px ${theme.colors.slateA7}`,
          },
        },
        "&:focus": {
          backgroundColor: theme.colors.backgroundControls,
          boxShadow: `inset 0px 0px 0px 1px ${theme.colors.blue10}, 0px 0px 0px 1px ${theme.colors.blue10}`,
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
        boxShadow: `inset 0 0 0 1px ${theme.colors.red8}`,
        "&:focus-within": {
          boxShadow: `inset 0px 0px 0px 1px ${theme.colors.red8}, 0px 0px 0px 1px ${theme.colors.red8}`,
        },
      },
      valid: {
        boxShadow: `inset 0 0 0 1px ${theme.colors.green7}`,
        "&:focus-within": {
          boxShadow: `inset 0px 0px 0px 1px ${theme.colors.green8}, 0px 0px 0px 1px ${theme.colors.green8}`,
        },
      },
      active: {
        boxShadow: `inset 0px 0px 0px 1px ${theme.colors.blue10}, 0px 0px 0px 1px ${theme.colors.blue10}`,
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

export const useTextFieldFocus = ({
  disabled,
  onFocus,
  onBlur,
}: {
  disabled?: boolean;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}): [
  RefObject<HTMLInputElement>,
  ComponentProps<typeof TextFieldContainer>
] => {
  const ref = React.useRef<HTMLInputElement>(null);

  const onClickCapture = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  const { focusWithinProps } = useFocusWithin({
    isDisabled: disabled,
    // @ts-expect-error Type mismatch from react-aria
    onFocusWithin: onFocus,
    // @ts-expect-error Type mismatch from react-aria
    onBlurWithin: onBlur,
  });

  return [
    ref,
    {
      ...focusWithinProps,
      onClickCapture,
      // Setting tabIndex to -1 to allow this element to be focused via JavaScript.
      // This is used when we need to hide the caret but want to:
      //   1. keep the visual focused state of the component
      //   2. keep focus somewhere insisde the component to not trigger some focus-trap logic
      tabIndex: -1,
    },
  ];
};

export type TextFieldProps = Pick<
  React.ComponentProps<typeof TextFieldContainer>,
  "variant" | "state" | "css"
> &
  Omit<React.ComponentProps<"input">, "prefix" | "children"> & {
    containerRef?: React.Ref<HTMLDivElement>;
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
      containerRef,
      inputRef,
      state,
      variant: variantProp,
      onFocus,
      onBlur,
      onClick,
      type,
      onKeyDown,
      // prevent spreading it into the dom
      suffix: suffixProp,
      ...textFieldProps
    } = props;
    let suffix = suffixProp;
    const variant =
      type === "button" && variantProp === undefined ? "button" : variantProp;

    const [internalInputRef, focusProps] = useTextFieldFocus({
      disabled,
      onFocus,
      onBlur,
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
      <TextFieldContainer
        {...focusProps}
        aria-disabled={disabled}
        ref={mergeRefs(forwardedRef, containerRef ?? null)}
        state={state}
        variant={variant}
        css={css}
        withPrefix={Boolean(prefix)}
        withSuffix={Boolean(suffix)}
        onKeyDown={onKeyDown}
      >
        {/* We want input to be the first element in DOM so it receives the focus first */}
        <TextFieldInput
          {...textFieldProps}
          type={type}
          disabled={disabled}
          onClick={onClick}
          ref={mergeRefs(internalInputRef, inputRef ?? null)}
        />

        {prefix && <PrefixSlot>{prefix}</PrefixSlot>}
        {suffix && <SuffixSlot>{suffix}</SuffixSlot>}
      </TextFieldContainer>
    );
  }
);

TextField.displayName = "TextField";
