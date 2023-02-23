/**
 * Implementation of the "Checkbox" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3352
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-checkbox";
import { type CSS, css, theme, styled } from "../stitches.config";

const checkedIconStyles = css({
  display: "none",
  "[data-state=checked] > &": { display: "block" },
});

const CheckedIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={checkedIconStyles()}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.217987 1.09202C0 1.51984 0 2.0799 0 3.2V8.8C0 9.9201 0 10.4802 0.217987 10.908C0.409734 11.2843 0.715695 11.5903 1.09202 11.782C1.51984 12 2.0799 12 3.2 12H8.8C9.9201 12 10.4802 12 10.908 11.782C11.2843 11.5903 11.5903 11.2843 11.782 10.908C12 10.4802 12 9.92011 12 8.8V3.2C12 2.0799 12 1.51984 11.782 1.09202C11.5903 0.715695 11.2843 0.409734 10.908 0.217987C10.4802 0 9.92011 0 8.8 0H3.2C2.0799 0 1.51984 0 1.09202 0.217987C0.715695 0.409734 0.409734 0.715695 0.217987 1.09202ZM9.8157 4.31564C10.1281 4.00322 10.1281 3.49668 9.8157 3.18427C9.50328 2.87185 8.99674 2.87185 8.68432 3.18427L4.75001 7.11858L3.3157 5.68427C3.00328 5.37185 2.49675 5.37185 2.18433 5.68427C1.87191 5.99669 1.87191 6.50322 2.18433 6.81564L4.18432 8.81564C4.33435 8.96567 4.53784 9.04996 4.75001 9.04996C4.96218 9.04996 5.16567 8.96567 5.3157 8.81564L9.8157 4.31564Z"
      fill="currentColor"
    />
  </svg>
);

const indeterminateIconStyles = css({
  display: "none",
  "[data-state=indeterminate] > &": { display: "block" },
});

const IndeterminateIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={indeterminateIconStyles()}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.217987 1.09202C0 1.51984 0 2.0799 0 3.2V8.8C0 9.9201 0 10.4802 0.217987 10.908C0.409734 11.2843 0.715695 11.5903 1.09202 11.782C1.51984 12 2.0799 12 3.2 12H8.8C9.9201 12 10.4802 12 10.908 11.782C11.2843 11.5903 11.5903 11.2843 11.782 10.908C12 10.4802 12 9.92011 12 8.8V3.2C12 2.0799 12 1.51984 11.782 1.09202C11.5903 0.715695 11.2843 0.409734 10.908 0.217987C10.4802 0 9.92011 0 8.8 0H3.2C2.0799 0 1.51984 0 1.09202 0.217987C0.715695 0.409734 0.409734 0.715695 0.217987 1.09202ZM3.00001 5.19995C2.55818 5.19995 2.20001 5.55812 2.20001 5.99995C2.20001 6.44178 2.55818 6.79995 3.00001 6.79995H9.00001C9.44184 6.79995 9.80001 6.44178 9.80001 5.99995C9.80001 5.55812 9.44184 5.19995 9.00001 5.19995H3.00001Z"
      fill="currentColor"
    />
  </svg>
);

const checkboxStyles = css({
  all: "unset", // reset <button>

  width: theme.spacing[9],
  height: theme.spacing[9],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  borderRadius: theme.borderRadius[3],

  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },

  "&[data-state=unchecked]::before": {
    content: "''",
    display: "block",
    position: "absolute",
    boxSizing: "border-box",
    width: "13.3px",
    height: "13.3px",
    inset: "1.35px",
    borderRadius: "2.6px",
    background: theme.colors.backgroundControls,
    border: `1.3px solid ${theme.colors.foregroundMain}`,
  },

  // [data-state] is needed to make sure the specificity
  // is higher than the above selector
  "&[data-state]:disabled::before": {
    background: "transparent",
    borderColor: theme.colors.foregroundDisabled,
  },
});

const indicatorStyles = css({
  display: "block",
  background: theme.colors.backgroundControls,
  borderRadius: theme.borderRadius[2],
  color: theme.colors.backgroundPrimary,
  "&[data-disabled]": {
    color: theme.colors.foregroundDisabled,
    background: "transparent",
  },
});

export const Checkbox = forwardRef(
  (
    {
      className,
      css,
      ...props
    }: ComponentProps<typeof Primitive.Root> & { css?: CSS },
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Root
      className={checkboxStyles({ className, css })}
      {...props}
      ref={ref}
    >
      <Primitive.Indicator className={indicatorStyles()}>
        <CheckedIcon />
        <IndeterminateIcon />
      </Primitive.Indicator>
    </Primitive.Root>
  )
);
Checkbox.displayName = "Checkbox";

export const CheckboxAndLabel = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
});
