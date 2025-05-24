import { forwardRef, type ComponentProps } from "react";

export const Option = forwardRef<HTMLOptionElement, ComponentProps<"option">>(
  (props, ref) => <option {...props} ref={ref} />
);

Option.displayName = "Option";
