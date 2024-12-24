/**
 * Implementation of the "Checkbox" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3352
 */

import { forwardRef, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-checkbox";
import { CheckMarkIcon, MinusIcon } from "@webstudio-is/icons";
import { type CSS, css, theme, styled } from "../stitches.config";

const checkboxStyle = css({
  all: "unset", // reset <button>

  width: theme.spacing[7],
  height: theme.spacing[7],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  borderRadius: theme.borderRadius[3],
  color: theme.colors.foregroundMain,
  background: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,

  "&:focus-visible": {
    borderColor: theme.colors.borderFocus,
  },

  // [data-state] is needed to make selector specificity higher
  "&[data-state]:disabled": {
    color: theme.colors.foregroundDisabled,
  },
});

const iconStyle = css({ position: "relative" });

const iconByState = {
  checked: CheckMarkIcon,
  unchecked: undefined,
  indeterminate: MinusIcon,
};

type CheckboxProps = ComponentProps<"button"> &
  Pick<ComponentProps<typeof Primitive.Checkbox>, "aria-checked">;

type AriaChecked = ComponentProps<typeof Primitive.Checkbox>["aria-checked"];

const ariaCheckedToDataState = (
  ariaChecked: AriaChecked
): keyof typeof iconByState => {
  if (ariaChecked === "true" || ariaChecked === true) {
    return "checked";
  }
  if (ariaChecked === "false" || ariaChecked === false) {
    return "unchecked";
  }

  if (ariaChecked === "mixed" || ariaChecked === undefined) {
    return "indeterminate";
  }

  ariaChecked satisfies never;
  return "indeterminate";
};

// We need this component basicslly just to get access to "data-state".
// We could render all icons and hide one using CSS,
// but that probably will be less performant.
const Button = forwardRef(
  (props: CheckboxProps, ref: Ref<HTMLButtonElement>) => {
    // Using aria-checked instead of data-state ensures compatibility with Tooltip,
    // as Tooltip overrides the Checkbox's data-state attribute.
    const dataState = ariaCheckedToDataState(props["aria-checked"]);
    const Icon = iconByState[dataState];

    return (
      <button
        {...props}
        data-state={dataState}
        type={props.type ?? "button"}
        ref={ref}
      >
        {Icon ? <Icon className={iconStyle()} size={12} /> : undefined}
      </button>
    );
  }
);
Button.displayName = "Button";

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
      className={checkboxStyle({ className, css })}
      {...props}
      ref={ref}
      asChild
    >
      <Button />
    </Primitive.Root>
  )
);
Checkbox.displayName = "Checkbox";

export const CheckboxAndLabel = styled("div", {
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
});
