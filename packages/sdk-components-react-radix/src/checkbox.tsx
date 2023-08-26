/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
} from "react";
import { Root, Indicator } from "@radix-ui/react-checkbox";

export const Checkbox = forwardRef<
  HTMLButtonElement,
  // radix checked has complex named type which cannot be parsed
  // cast to boolean
  Omit<ComponentPropsWithRef<typeof Root>, "checked"> & { checked: boolean }
>((props, ref) => {
  return <Root ref={ref} {...props} />;
});

export const CheckboxIndicator: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Indicator>
> = Indicator;
