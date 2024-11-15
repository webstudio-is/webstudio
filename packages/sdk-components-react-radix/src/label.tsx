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
