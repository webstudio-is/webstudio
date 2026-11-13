import { forwardRef, useContext, type ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

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
