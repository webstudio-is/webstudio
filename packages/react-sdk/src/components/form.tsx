import { Children } from "react";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "form";

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    initialState: "initial" | "success" | "error";
  }
>(({ children, initialState, ...props }, ref) => (
  <form {...props} ref={ref}>
    {Children.toArray(children).filter((child) => {
      if (typeof child === "object" && "props" in child) {
        if (initialState === "success") {
          return child.props.instance.component === "SuccessMessage";
        }
        if (initialState === "error") {
          return child.props.instance.component === "ErrorMessage";
        }
      }
      return true;
    })}
  </form>
));

Form.displayName = "Form";
