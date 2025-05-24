import { forwardRef, useContext, type ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(({ value, defaultValue, ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);
  // enfroce default value update
  const key = renderer === "canvas" ? String(value ?? defaultValue) : undefined;
  return (
    <textarea
      {...props}
      key={key}
      defaultValue={value ?? defaultValue}
      ref={ref}
    />
  );
});

Textarea.displayName = "Textarea";
