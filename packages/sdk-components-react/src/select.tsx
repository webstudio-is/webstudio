import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "select";

export const Select = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <select {...props} ref={ref} />);

Select.displayName = "Select";
