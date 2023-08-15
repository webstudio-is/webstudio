/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

import * as LabelPrimitive from "@radix-ui/react-label";

export const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  Omit<ComponentPropsWithoutRef<typeof LabelPrimitive.Root>, "asChild">
>((props, ref) => <LabelPrimitive.Root ref={ref} {...props} />);
