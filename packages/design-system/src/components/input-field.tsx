/**
 * Implementation of the "Input Field" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3304
 */

import {
  forwardRef,
  type ReactNode,
  type ComponentProps,
  type Ref,
  type FocusEventHandler,
  useRef,
  type KeyboardEventHandler,
} from "react";
import { textVariants } from "./text";
import { css, theme, type CSS } from "../stitches.config";
import { ArrowFocus } from "./primitives/arrow-focus";
import { mergeRefs } from "@react-aria/utils";
import { useFocusWithin } from "@react-aria/interactions";

// we only support types that behave more or less like a regular text input
export const inputFieldTypes = [
  "email",
  "password",
  "tel",
  "text",
  "url",
  "number",
  "search",
] as const;

export const inputFieldColors = ["placeholder", "set", "error"] as const;

const inputStyle = css({
  all: "unset",
  color: theme.colors.foregroundMain,
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  height: "100%",
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
  "&[data-color=placeholder]:not(:hover, :disabled, [aria-disabled=true], :focus), &::placeholder":
    {
      color: theme.colors.foregroundSubtle,
    },
  "&[data-color=error]": { color: theme.colors.foregroundDestructive },
  "&:disabled, &[aria-disabled=true]": {
    "&, &::placeholder": {
      color: theme.colors.foregroundDisabled,
    },
  },
  '&[type="number"]': {
    MozAppearance: "textfield",
    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
  },
  variants: {
    text: {
      regular: textVariants.regular,
      mono: textVariants.mono,
    },
    fieldSizing: {
      content: {
        fieldSizing: "content",
      },
      fixed: {
        fieldSizing: "fixed",
      },
    },
  },
  defaultVariants: {
    text: "regular",
  },
});

const containerStyle = css({
  display: "flex",
  boxSizing: "border-box",
  minWidth: 0,
  alignItems: "center",
  borderRadius: theme.borderRadius[4],
  border: `solid 1px transparent`,
  backgroundColor: theme.colors.backgroundControls,
  "&:hover": {
    borderColor: theme.colors.borderMain,
  },
  "&:focus-within": {
    borderColor: theme.colors.borderFocus,
    outline: "none",
  },
  "&:has([data-input-field-input][data-color=error])": {
    borderColor: theme.colors.borderDestructiveMain,
  },
  "&:focus-within:has([data-color=error])": {
    borderColor: theme.colors.borderDestructiveMain,
  },
  "&:has([data-input-field-input]:is(:disabled, [aria-disabled=true]))": {
    backgroundColor: theme.colors.backgroundInputDisabled,
  },

  variants: {
    variant: {
      chromeless: {
        "&:not(:hover, :focus-within)": {
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
      },
    },
    size: {
      1: {
        height: theme.spacing[9],
      },
      2: {
        height: theme.sizes.controlHeight,
      },
    },
  },
  defaultVariants: {
    size: 2,
  },
});

const suffixSlotStyle = css({
  marginRight: theme.spacing[1],
});

const prefixSlotStyle = css({
  marginLeft: theme.spacing[1],
});

const Container = forwardRef(
  (
    {
      children,
      className,
      css,
      prefix,
      suffix,
      variant,
      size,
      ...props
    }: {
      children: ReactNode;
      prefix?: ReactNode;
      suffix?: ReactNode;
      css?: CSS;
      variant: InputFieldProps["variant"];
      size: InputFieldProps["size"];
    } & Omit<ComponentProps<"div">, "prefix">,
    ref: Ref<HTMLDivElement>
  ) => {
    // no reason to use ArrowFocus if there's no prefix or suffix
    if (!prefix && !suffix) {
      return (
        <div
          className={containerStyle({ className, css, variant, size })}
          {...props}
          ref={ref}
        >
          {children}
        </div>
      );
    }

    return (
      <ArrowFocus
        render={({ handleKeyDown }) => (
          <div
            className={containerStyle({ className, css, variant, size })}
            {...props}
            onKeyDown={(event) => {
              props.onKeyDown?.(event);

              // ignore up/down,
              // because they're likely used for dropdowns or increment/decrement
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                return;
              }

              handleKeyDown(event);
            }}
            ref={ref}
          >
            {prefix && <div className={prefixSlotStyle()}>{prefix}</div>}
            {children}
            {suffix && <div className={suffixSlotStyle()}>{suffix}</div>}
          </div>
        )}
      />
    );
  }
);
Container.displayName = "Container";

type InputProps = Omit<
  ComponentProps<"input">,
  "onFocus" | "onBlur" | "prefix" | "size"
> & {
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
};

type InputFieldProps = {
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerRef?: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLInputElement>;
  variant?: "chromeless";
  size?: "1" | "2";
  type?: (typeof inputFieldTypes)[number];
  color?: (typeof inputFieldColors)[number];
  css?: CSS;
  text?: "regular" | "mono";
  fieldSizing?: "content" | "fixed";
};

export const InputField = forwardRef(
  (
    {
      css,
      className,
      prefix,
      suffix,
      containerRef,
      inputRef,
      onFocus,
      onBlur,
      variant,
      size,
      color,
      text,
      fieldSizing,
      onKeyDown,
      ...inputProps
    }: InputProps & InputFieldProps,
    ref: Ref<HTMLDivElement>
  ) => {
    // Our input field can contain multiple focused elements,
    // so we need to use useFocusWithin to track focus within the container.
    const { focusWithinProps } = useFocusWithin({
      onFocusWithin: onFocus,
      onBlurWithin: onBlur,
    });
    const unfocusContainerRef = useRef<HTMLDivElement>(null);
    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
      // If Radix is preventing the Escape key from closing the dialog,
      // it intercepts the key event at the document level.
      // However, we still want to allow the user to unfocus the input field.
      // This means we should not check `defaultPrevented`, but only verify
      // if our event handler explicitly prevented it.
      const isPreventedBefore = event.defaultPrevented;
      onKeyDown?.(event);
      const isPreventedAfter = event.defaultPrevented;
      const isEventPrevented = !isPreventedBefore && isPreventedAfter;

      if (event.key === "Escape" && !isEventPrevented) {
        event.preventDefault();
        unfocusContainerRef.current?.focus();
      }
    };

    return (
      <Container
        css={css}
        className={className}
        prefix={prefix}
        suffix={suffix}
        variant={variant}
        size={size}
        {...focusWithinProps}
        ref={mergeRefs(ref, containerRef ?? null)}
      >
        <div
          // This element is used to move focus to it when user hits Escape.
          // This way user can unfocus the input and then use any single-key shortcut.
          tabIndex={-1}
          ref={unfocusContainerRef}
          // When managing focus with ArrowFocus, we don't want to focus this element.
          data-no-arrow-focus
        />
        <input
          {...inputProps}
          ref={inputRef}
          spellCheck={false}
          data-input-field-input // to distinguish from potential other inputs in prefix/suffix
          data-color={color}
          className={inputStyle({ className, css, text, fieldSizing })}
          onKeyDown={handleKeyDown}
        />
      </Container>
    );
  }
);
InputField.displayName = "InputField";
