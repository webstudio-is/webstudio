import { forwardRef, type ElementRef, type ComponentProps } from "react";

type Props = ComponentProps<"form"> & {
  encType?:
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/plain";
  /** Use this property to reveal the Success and Error states on the canvas so they can be styled. The Initial state is displayed when the page first opens. The Success and Error states are displayed depending on whether the Form submits successfully or unsuccessfully. */
  state?: "initial" | "success" | "error";
  onStateChange: (state: "initial" | "success" | "error") => void;
};

export const WebhookForm = forwardRef<ElementRef<"form">, Props>(
  ({ children, state = "initial", ...props }, ref) => (
    <form {...props} ref={ref}>
      {children}
    </form>
  )
);

WebhookForm.displayName = "WebhookForm";
