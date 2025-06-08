import { forwardRef, useContext, type ComponentProps } from "react";
import { ReactSdkContext, type Hook } from "@webstudio-is/react-sdk/runtime";

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  ({ value, defaultValue, ...props }, ref) => {
    const { renderer } = useContext(ReactSdkContext);
    // enfroce default value update
    const key =
      renderer === "canvas" ? String(value ?? defaultValue) : undefined;
    return (
      <select
        {...props}
        key={key}
        defaultValue={value ?? defaultValue}
        ref={ref}
      />
    );
  }
);

Select.displayName = "Select";

export const hooksSelect: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === "Select" || instance.tag === "select") {
        context.setMemoryProp(instance, "value", undefined);
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    let selectedOption: undefined | string;
    for (const instance of event.instancePath) {
      if (instance.component === "Option" || instance.tag === "option") {
        selectedOption = context.getPropValue(instance, "value") as string;
      }
      if (instance.component === "Select" || instance.tag === "select") {
        context.setMemoryProp(instance, "value", selectedOption);
      }
    }
  },
};
