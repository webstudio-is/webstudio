import { forwardRef, useContext, type ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ value, defaultValue, checked, defaultChecked, ...props }, ref) => {
    const { renderer } = useContext(ReactSdkContext);
    // enfroce default value update
    const key =
      renderer === "canvas"
        ? String(value ?? defaultValue) + String(checked ?? defaultChecked)
        : undefined;
    return (
      <input
        {...props}
        key={key}
        defaultValue={value ?? defaultValue}
        defaultChecked={checked ?? defaultChecked}
        ref={ref}
      />
    );
  }
);

Input.displayName = "Input";
