import { type Hook } from "@webstudio-is/react-sdk/runtime";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "select";

export const Select = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ value, defaultValue, ...props }, ref) => (
  <select {...props} defaultValue={value ?? defaultValue} ref={ref} />
));

Select.displayName = "Select";

// For each CollapsibleContent component within the selection,
// we identify its closest parent Collapsible component
// and update its open prop bound to variable.
export const hooksSelect: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `Option`) {
        context.setMemoryProp(instance, "selected", undefined);
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `Option`) {
        context.setMemoryProp(instance, "selected", true);
      }
    }
  },
};
