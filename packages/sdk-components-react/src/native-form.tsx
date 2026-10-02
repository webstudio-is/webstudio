import { forwardRef, type ComponentProps, type ElementRef } from "react";

export const defaultTag = "form";

export const NativeForm = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <form {...props} ref={ref} />);

NativeForm.displayName = "NativeForm";
