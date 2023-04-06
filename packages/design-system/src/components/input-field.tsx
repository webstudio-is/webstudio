/**
 * Implementation of the "Input Field" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3304
 */

import {
  forwardRef,
  type ReactNode,
  type ComponentProps,
  type Ref,
} from "react";
import { textVariants } from "./text";
import { css, theme, type CSS } from "../stitches.config";
import { ArrowFocus } from "./primitives/arrow-focus";
import { mergeRefs } from "@react-aria/utils";

// we only support types that behave more or less like a regular text input
export const inputFieldTypes = [
  "email",
  "password",
  "tel",
  "text",
  "url",
  "number",
] as const;

export const inputFieldColors = ["placeholder", "set", "error"] as const;

const inputStyle = css({
  all: "unset",
  ...textVariants.regular,
  color: theme.colors.foregroundMain,
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  height: "100%",
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
  "&[data-color=placeholder]:not(:hover):not(:disabled), &::placeholder": {
    color: theme.colors.foregroundSubtle,
  },
  "&[data-color=error]": { color: theme.colors.foregroundDestructive },
  "&:disabled, &:disabled::placeholder": {
    color: theme.colors.foregroundDisabled,
  },
  '&[type="number"]': {
    MozAppearance: "textfield",
    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
  },
});

const containerStyle = css({
  display: "flex",
  height: theme.spacing[12],
  boxSizing: "border-box",
  alignItems: "center",
  borderRadius: theme.borderRadius[4],
  border: `solid 1px ${theme.colors.borderMain}`,
  backgroundColor: theme.colors.backgroundControls,

  "&:has([data-input-field-input]:focus), &:focus": {
    outline: `solid 2px ${theme.colors.borderFocus}`,
    outlineOffset: "-1px",
  },

  "&:has([data-input-field-input][data-color=error])": {
    borderColor: theme.colors.borderDestructiveMain,
  },

  "&:has([data-input-field-input]:disabled)": {
    backgroundColor: theme.colors.backgroundInputDisabled,
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
      ...props
    }: {
      children: ReactNode;
      prefix?: ReactNode;
      suffix?: ReactNode;
      css?: CSS;
    } & Omit<ComponentProps<"div">, "prefix">,
    ref: Ref<HTMLDivElement>
  ) => {
    // no reason to use ArrowFocus if there's no prefix or suffix
    if (!prefix && !suffix) {
      return (
        <div
          className={containerStyle({ className, css })}
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
            className={containerStyle({ className, css })}
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

type InputProps = {
  type?: (typeof inputFieldTypes)[number];
  color?: (typeof inputFieldColors)[number];
  css?: CSS;
} & Omit<ComponentProps<"input">, "prefix">;

const Input = forwardRef(
  (
    { css, className, color, disabled = false, ...props }: InputProps,
    ref: Ref<HTMLInputElement>
  ) => (
    <input
      {...props}
      data-input-field-input // to distinguish from potential other inputs in prefix/suffix
      data-color={color}
      disabled={disabled}
      className={inputStyle({ className, css })}
      ref={ref}
    />
  )
);
Input.displayName = "Input";

export const InputField = forwardRef(
  (
    {
      css,
      className,
      prefix,
      suffix,
      containerRef,
      inputRef,
      ...props
    }: InputProps & {
      prefix?: ReactNode;
      suffix?: ReactNode;
      containerRef?: Ref<HTMLDivElement>;
      inputRef?: Ref<HTMLInputElement>;
    },
    ref: Ref<HTMLDivElement>
  ) => (
    <Container
      css={css}
      className={className}
      prefix={prefix}
      suffix={suffix}
      ref={mergeRefs(ref, containerRef ?? null)}
    >
      <Input {...props} ref={inputRef} />
    </Container>
  )
);
InputField.displayName = "InputField";
