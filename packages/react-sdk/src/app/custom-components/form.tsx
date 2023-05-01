import {
  Children,
  cloneElement,
  forwardRef,
  type ReactNode,
  type ElementRef,
  type ComponentProps,
} from "react";

export const defaultTag = "form";

const isComponentNode = (
  component: string,
  node: Exclude<ReactNode, null | number | string | boolean | undefined>
) => "props" in node && node.props.instance?.component === component;

const onlyErrorMessage = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return null;
    }

    if (isComponentNode("ErrorMessage", child)) {
      return child;
    }

    if ("props" in child) {
      const newChildren = onlyErrorMessage(child.props.children);
      return Children.toArray(newChildren).some((child) => child !== null)
        ? cloneElement(child, { children: newChildren })
        : null;
    }

    return onlyErrorMessage(child);
  });

const onlySuccessMessage = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return null;
    }

    if (isComponentNode("SuccessMessage", child)) {
      return child;
    }

    if ("props" in child) {
      const newChildren = onlySuccessMessage(child.props.children);
      return Children.toArray(newChildren).some((child) => child !== null)
        ? cloneElement(child, { children: newChildren })
        : null;
    }

    return onlySuccessMessage(child);
  });

const withoutMessages = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return child;
    }

    if (
      isComponentNode("ErrorMessage", child) ||
      isComponentNode("SuccessMessage", child)
    ) {
      return null;
    }

    if ("props" in child) {
      return cloneElement(child, {
        children: withoutMessages(child.props.children),
      });
    }

    return withoutMessages(child);
  });

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    initialState?: "initial" | "success" | "error";
  }
>(({ children, initialState = "initial", ...props }, ref) => (
  <form {...props} data-state={initialState} ref={ref}>
    {initialState === "success"
      ? onlySuccessMessage(children)
      : initialState === "error"
      ? onlyErrorMessage(children)
      : withoutMessages(children)}
  </form>
));

Form.displayName = "Form";
